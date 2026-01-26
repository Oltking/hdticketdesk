import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async recordTicketSale(
    organizerId: string,
    ticketId: string,
    amount: number,
    _platformFee: number, // Not stored in DB, just for calculation
  ) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    await this.prisma.ledgerEntry.create({
      data: {
        type: 'TICKET_SALE',
        organizerId,
        ticketId,
        amount,
        pendingBalanceAfter: Number(organizer.pendingBalance) + amount,
        availableBalanceAfter: Number(organizer.availableBalance),
        description: `Ticket sale - ${ticketId}`,
      },
    });
  }

  async recordRefund(organizerId: string, ticketId: string, amount: number) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    await this.prisma.ledgerEntry.create({
      data: {
        type: 'REFUND',
        organizerId,
        ticketId,
        amount: -amount,
        pendingBalanceAfter: Number(organizer.pendingBalance),
        availableBalanceAfter: Number(organizer.availableBalance) - amount,
        description: `Refund processed - ${ticketId}`,
      },
    });
  }

  async recordWithdrawal(organizerId: string, withdrawalId: string, amount: number) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    await this.prisma.ledgerEntry.create({
      data: {
        type: 'WITHDRAWAL',
        organizerId,
        withdrawalId,
        amount: -amount,
        pendingBalanceAfter: Number(organizer.pendingBalance),
        availableBalanceAfter: Number(organizer.availableBalance) - amount,
        description: `Withdrawal - ${withdrawalId}`,
      },
    });
  }

  async recordChargeback(organizerId: string, ticketId: string, amount: number) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    await this.prisma.ledgerEntry.create({
      data: {
        type: 'CHARGEBACK',
        organizerId,
        ticketId,
        amount: -amount,
        pendingBalanceAfter: Number(organizer.pendingBalance),
        availableBalanceAfter: Number(organizer.availableBalance) - amount,
        description: `Chargeback - ${ticketId}`,
      },
    });
  }

  async getOrganizerLedger(organizerId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlatformLedger() {
    return this.prisma.ledgerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: {
          select: { id: true, title: true },
        },
      },
    });
  }
}
