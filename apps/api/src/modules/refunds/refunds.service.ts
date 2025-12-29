import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LedgerService } from '../ledger/ledger.service';
import { TicketsService } from '../tickets/tickets.service';
import { RefundStatus } from '@prisma/client';

@Injectable()
export class RefundsService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private ticketsService: TicketsService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // REQUEST REFUND
  // ============================================

  async requestRefund(userId: string, ticketId: string, reason: string) {
    // Get ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tier: true,
        event: {
          include: {
            organizer: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check ownership
    if (ticket.buyerId !== userId) {
      throw new ForbiddenException('You do not own this ticket');
    }

    // Check if already refunded
    if (ticket.status === 'REFUNDED') {
      throw new BadRequestException('Ticket already refunded');
    }

    // Check if tier allows refunds
    if (!ticket.tier.refundEnabled) {
      throw new BadRequestException('Refunds not allowed for this ticket');
    }

    // Check refund window (24 hours from purchase)
    const refundWindowHours = Number(
      this.configService.get('REFUND_WINDOW_HOURS', 24),
    );
    const purchaseTime = ticket.createdAt.getTime();
    const now = Date.now();
    const hoursSincePurchase = (now - purchaseTime) / (1000 * 60 * 60);

    if (hoursSincePurchase > refundWindowHours) {
      throw new BadRequestException(
        `Refund window expired. Must request within ${refundWindowHours} hours of purchase.`,
      );
    }

    // Check if already has pending refund request
    const existingRequest = await this.prisma.refundRequest.findUnique({
      where: { ticketId },
    });

    if (existingRequest) {
      throw new BadRequestException('Refund request already exists');
    }

    // Calculate refund amount (ticket price - platform fee)
    const refundAmount = Number(ticket.amountPaid) - Number(ticket.platformFee);

    // Create refund request
    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        ticketId,
        requesterId: userId,
        reason,
        refundAmount,
        status: RefundStatus.PENDING,
      },
      include: {
        ticket: {
          include: {
            event: true,
            tier: true,
          },
        },
      },
    });

    return refundRequest;
  }

  // ============================================
  // APPROVE REFUND (ORGANIZER)
  // ============================================

  async approveRefund(
    refundId: string,
    organizerUserId: string,
    reviewNote?: string,
  ) {
    const refundRequest = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        ticket: {
          include: {
            event: {
              include: {
                organizer: true,
              },
            },
          },
        },
      },
    });

    if (!refundRequest) {
      throw new NotFoundException('Refund request not found');
    }

    // Check ownership
    if (refundRequest.ticket.event.organizer.userId !== organizerUserId) {
      throw new ForbiddenException('You do not have permission to approve this refund');
    }

    // Check if already processed
    if (refundRequest.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Refund request already processed');
    }

    // Check organizer has sufficient balance
    const organizer = refundRequest.ticket.event.organizer;
    if (Number(organizer.availableBalance) < refundRequest.refundAmount) {
      throw new BadRequestException('Insufficient balance for refund');
    }

    // Process refund in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update refund request
      await tx.refundRequest.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.APPROVED,
          reviewedBy: organizerUserId,
          reviewedAt: new Date(),
          reviewNote,
          completedAt: new Date(),
        },
      });

      // Cancel ticket
      await this.ticketsService.cancel(refundRequest.ticketId);

      // Update ledger
      await this.ledgerService.recordRefund({
        organizerId: organizer.id,
        ticketId: refundRequest.ticketId,
        refundId,
        refundAmount: refundRequest.refundAmount,
      });
    });

    // TODO: Initiate actual refund via Paystack

    return { message: 'Refund approved and processed' };
  }

  // ============================================
  // REJECT REFUND (ORGANIZER)
  // ============================================

  async rejectRefund(
    refundId: string,
    organizerUserId: string,
    reviewNote: string,
  ) {
    const refundRequest = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        ticket: {
          include: {
            event: {
              include: {
                organizer: true,
              },
            },
          },
        },
      },
    });

    if (!refundRequest) {
      throw new NotFoundException('Refund request not found');
    }

    // Check ownership
    if (refundRequest.ticket.event.organizer.userId !== organizerUserId) {
      throw new ForbiddenException('You do not have permission to reject this refund');
    }

    // Check if already processed
    if (refundRequest.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Refund request already processed');
    }

    await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.REJECTED,
        reviewedBy: organizerUserId,
        reviewedAt: new Date(),
        reviewNote,
      },
    });

    return { message: 'Refund request rejected' };
  }

  // ============================================
  // GET REFUND REQUESTS (ORGANIZER)
  // ============================================

  async getOrganizerRefundRequests(organizerUserId: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerUserId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    return this.prisma.refundRequest.findMany({
      where: {
        ticket: {
          event: {
            organizerId: organizer.id,
          },
        },
      },
      include: {
        ticket: {
          include: {
            event: true,
            tier: true,
            buyer: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================
  // GET MY REFUND REQUESTS (BUYER)
  // ============================================

  async getMyRefundRequests(userId: string) {
    return this.prisma.refundRequest.findMany({
      where: {
        requesterId: userId,
      },
      include: {
        ticket: {
          include: {
            event: true,
            tier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}