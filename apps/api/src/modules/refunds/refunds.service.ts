import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MonnifyService } from '../payments/monnify.service';
import { LedgerService } from '../ledger/ledger.service';
import { EmailService } from '../emails/email.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RefundsService {
  constructor(
    private prisma: PrismaService,
    private monnifyService: MonnifyService,
    private ledgerService: LedgerService,
    private emailService: EmailService,
  ) {}

  async requestRefund(ticketId: string, userId: string, reason?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: { include: { organizer: true } },
        tier: true,
        refund: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.buyerId !== userId) {
      throw new ForbiddenException('You can only request refund for your own tickets');
    }

    if (ticket.refund) {
      throw new BadRequestException('Refund already requested for this ticket');
    }

    if (ticket.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot refund ticket with status: ${ticket.status}`);
    }

    if (!ticket.tier.refundEnabled) {
      throw new BadRequestException('Refunds are not enabled for this ticket tier');
    }

    // Check if event has already started (no refunds after event starts)
    if (new Date(ticket.event.startDate) <= new Date()) {
      throw new BadRequestException('Cannot request refund after event has started');
    }

    // Calculate ticket amount
    const ticketAmount = ticket.amountPaid instanceof Decimal 
      ? ticket.amountPaid.toNumber() 
      : Number(ticket.amountPaid);

    // Check for free tickets - no refund for free tickets
    if (ticketAmount === 0) {
      throw new BadRequestException('Free tickets cannot be refunded. Please cancel the ticket instead.');
    }

    // Calculate refund amount (minus platform fee - 5%)
    const platformFee = ticketAmount * 0.05;
    const refundAmount = ticketAmount - platformFee;

    const refund = await this.prisma.refund.create({
      data: {
        status: 'PENDING',
        reason,
        refundAmount,
        ticketId,
        requesterId: userId,
      },
    });

    return {
      refundId: refund.id,
      refundAmount,
      message: 'Refund request submitted. Waiting for organizer approval.',
    };
  }

  async approveRefund(refundId: string, organizerId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        ticket: {
          include: {
            event: { include: { organizer: true } },
            tier: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.ticket.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only approve refunds for your own events');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve refund with status: ${refund.status}`);
    }

    // Update refund status
    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'APPROVED',
        processedBy: organizerId,
        processedAt: new Date(),
      },
    });

    // Process refund via Monnify
    try {
      if (refund.ticket.paymentRef) {
        const refundAmount = refund.refundAmount instanceof Decimal
          ? refund.refundAmount.toNumber()
          : Number(refund.refundAmount);
          
        await this.monnifyService.refundTransaction(
          refund.ticket.paymentRef,
          refundAmount,
        );
      }

      // Update ticket status
      await this.prisma.ticket.update({
        where: { id: refund.ticketId },
        data: { status: 'REFUNDED' },
      });

      // Update refund status to processed
      await this.prisma.refund.update({
        where: { id: refundId },
        data: { status: 'PROCESSED' },
      });

      // Update organizer balance
      const refundAmount = refund.refundAmount instanceof Decimal
        ? refund.refundAmount.toNumber()
        : Number(refund.refundAmount);

      await this.prisma.organizerProfile.update({
        where: { id: organizerId },
        data: {
          availableBalance: { decrement: refundAmount },
        },
      });

      // Record in ledger
      await this.ledgerService.recordRefund(
        organizerId,
        refund.ticketId,
        refundAmount,
      );

      // Send email to buyer
      await this.emailService.sendRefundEmail(refund.ticket.buyerEmail, {
        ticketNumber: refund.ticket.ticketNumber,
        eventTitle: refund.ticket.event.title,
        refundAmount,
        status: 'processed',
      });

      return { message: 'Refund approved and processed successfully' };
    } catch (error: any) {
      // Mark refund as failed
      await this.prisma.refund.update({
        where: { id: refundId },
        data: {
          status: 'PENDING', // Revert to pending so it can be retried
          rejectionNote: error.message,
        },
      });

      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }

  async rejectRefund(refundId: string, organizerId: string, reason: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        ticket: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.ticket.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only reject refunds for your own events');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject refund with status: ${refund.status}`);
    }

    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'REJECTED',
        rejectionNote: reason,
        processedBy: organizerId,
        processedAt: new Date(),
      },
    });

    // Send email to buyer
    const refundAmount = refund.refundAmount instanceof Decimal
      ? refund.refundAmount.toNumber()
      : Number(refund.refundAmount);

    await this.emailService.sendRefundEmail(refund.ticket.buyerEmail, {
      ticketNumber: refund.ticket.ticketNumber,
      eventTitle: refund.ticket.event.title,
      refundAmount,
      status: 'rejected',
      reason,
    });

    return { message: 'Refund request rejected' };
  }

  async getRefundsByOrganizer(organizerId: string) {
    return this.prisma.refund.findMany({
      where: {
        ticket: {
          event: {
            organizerId,
          },
        },
      },
      include: {
        ticket: {
          include: {
            event: true,
            tier: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRefundsByUser(userId: string) {
    return this.prisma.refund.findMany({
      where: { requesterId: userId },
      include: {
        ticket: {
          include: {
            event: true,
            tier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
