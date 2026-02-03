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

    // Idempotency: avoid recording the same ticket sale more than once
    const existing = await this.prisma.ledgerEntry.findFirst({
      where: {
        type: 'TICKET_SALE',
        ticketId,
        organizerId,
      },
      select: { id: true },
    });

    if (existing) {
      return;
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

  async getOrganizerLedger(
    organizerId: string,
    options?: {
      includeOnlySuccessfulWithdrawals?: boolean;
    },
  ) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!options?.includeOnlySuccessfulWithdrawals) {
      return entries;
    }

    // Only keep withdrawals that are COMPLETED
    const withdrawalIds = entries
      .filter((e: any) => e.type === 'WITHDRAWAL' && e.withdrawalId)
      .map((e: any) => e.withdrawalId);

    if (withdrawalIds.length === 0) {
      return entries;
    }

    const withdrawals = await this.prisma.withdrawal.findMany({
      where: { id: { in: withdrawalIds } },
      select: { id: true, status: true },
    });

    const statusById = new Map(withdrawals.map((w) => [w.id, w.status]));

    return entries.filter((e: any) => {
      if (e.type !== 'WITHDRAWAL') return true;
      const st = statusById.get(e.withdrawalId);
      return (st || '').toUpperCase() === 'COMPLETED';
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
