import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

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
      includeOnlyConfirmedTicketSales?: boolean;
      dedupeTicketSales?: boolean;
    },
  ) {
    let entries: any[] = await this.prisma.ledgerEntry.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
    });

    // Keep Monnify ref mapping in a stable variable (do NOT attach to array, because filter() returns a new array)
    let ticketMonnifyRefById: Map<string, string | null> | undefined;

    // Filter withdrawals to only COMPLETED
    if (options?.includeOnlySuccessfulWithdrawals) {
      const withdrawalIds = entries
        .filter((e) => e.type === 'WITHDRAWAL' && e.withdrawalId)
        .map((e) => e.withdrawalId);

      if (withdrawalIds.length > 0) {
        const withdrawals = await this.prisma.withdrawal.findMany({
          where: { id: { in: withdrawalIds } },
          select: { id: true, status: true },
        });

        const statusById = new Map(withdrawals.map((w) => [w.id, w.status]));

        entries = entries.filter((e) => {
          if (e.type !== 'WITHDRAWAL') return true;
          const st = statusById.get(e.withdrawalId);
          return (st || '').toUpperCase() === 'COMPLETED';
        });
      }
    }

    // Filter ticket sales to only those tied to SUCCESS payments
    if (options?.includeOnlyConfirmedTicketSales) {
      const ticketIds = entries
        .filter((e) => e.type === 'TICKET_SALE' && e.ticketId)
        .map((e) => e.ticketId);

      if (ticketIds.length > 0) {
        const tickets = await this.prisma.ticket.findMany({
          where: {
            id: { in: ticketIds },
          },
          select: {
            id: true,
            payment: {
              select: { status: true, amount: true, monnifyTransactionRef: true },
            },
          },
        });

        ticketMonnifyRefById = new Map<string, string | null>();

        const okTicketIds = new Set(
          tickets
            .filter((t) => {
              const status = (t.payment?.status || '').toUpperCase();
              const amount =
                t.payment?.amount instanceof Decimal
                  ? t.payment.amount.toNumber()
                  : Number(t.payment?.amount || 0);
              const monnifyRef = t.payment?.monnifyTransactionRef || null;
              ticketMonnifyRefById!.set(t.id, monnifyRef);
              // Confirmed sale must be SUCCESS and have a Monnify transaction ref (or be free)
              return status === 'SUCCESS' && (Boolean(monnifyRef) || amount === 0);
            })
            .map((t) => t.id),
        );

        entries = entries.filter((e) => {
          if (e.type !== 'TICKET_SALE') return true;
          return e.ticketId && okTicketIds.has(e.ticketId);
        });
      }
    }

    // Dedupe ticket sales (keep newest entry, list is desc)
    if (options?.dedupeTicketSales) {
      const seen = new Set<string>();

      entries = entries.filter((e) => {
        if (e.type !== 'TICKET_SALE' || !e.ticketId) return true;
        const monnifyRef = ticketMonnifyRefById?.get(e.ticketId) || null;
        const key = monnifyRef || e.ticketId;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return entries;
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
