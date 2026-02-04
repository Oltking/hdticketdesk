import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a ticket sale in the ledger with proper deduplication.
   * 
   * Deduplication Strategy:
   * 1. Primary: Check by monnifyTransactionRef (for Monnify payments)
   * 2. Fallback: Check by ticketId (for legacy Paystack or free tickets)
   * 
   * The database also has a unique constraint on (monnifyTransactionRef, type)
   * for non-NULL values to prevent race conditions.
   */
  async recordTicketSale(params: {
    organizerId: string;
    ticketId: string;
    amount: number;
    platformFee?: number;
    // New fields for proper reconciliation
    monnifyTransactionRef?: string | null;
    paymentReference?: string | null;
    paymentId?: string | null;
    transactionDate?: Date;
    description?: string;
  }) {
    const {
      organizerId,
      ticketId,
      amount,
      monnifyTransactionRef,
      paymentReference,
      paymentId,
      transactionDate,
      description,
    } = params;

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    // ==========================================================================
    // IDEMPOTENCY CHECK: Prevent duplicate ledger entries
    // ==========================================================================
    // Priority 1: Check by Monnify transaction reference (most reliable for paid tickets)
    if (monnifyTransactionRef) {
      const existingByMonnifyRef = await this.prisma.ledgerEntry.findFirst({
        where: {
          type: 'TICKET_SALE',
          monnifyTransactionRef,
          organizerId,
        },
        select: { id: true },
      });

      if (existingByMonnifyRef) {
        this.logger.warn(
          `Ledger entry already exists for monnifyTransactionRef: ${monnifyTransactionRef}. Skipping duplicate.`,
        );
        return { skipped: true, reason: 'duplicate_monnify_ref' };
      }
    }

    // Priority 2: Check by ticketId (fallback for legacy Paystack or free tickets)
    const existingByTicketId = await this.prisma.ledgerEntry.findFirst({
      where: {
        type: 'TICKET_SALE',
        ticketId,
        organizerId,
      },
      select: { id: true },
    });

    if (existingByTicketId) {
      this.logger.warn(
        `Ledger entry already exists for ticketId: ${ticketId}. Skipping duplicate.`,
      );
      return { skipped: true, reason: 'duplicate_ticket_id' };
    }

    // ==========================================================================
    // CREATE LEDGER ENTRY
    // ==========================================================================
    try {
      const entry = await this.prisma.ledgerEntry.create({
        data: {
          type: 'TICKET_SALE',
          organizerId,
          ticketId,
          amount,
          monnifyTransactionRef: monnifyTransactionRef || null,
          paymentReference: paymentReference || null,
          paymentId: paymentId || null,
          transactionDate: transactionDate || new Date(),
          pendingBalanceAfter: Number(organizer.pendingBalance) + amount,
          availableBalanceAfter: Number(organizer.availableBalance),
          description: description || `Ticket sale - ${ticketId}`,
        },
      });

      this.logger.log(
        `Ledger entry created: ${entry.id} | Amount: ${amount} | MonnifyRef: ${monnifyTransactionRef || 'N/A'}`,
      );

      return { skipped: false, entry };
    } catch (error: any) {
      // Handle unique constraint violation (race condition fallback)
      if (error.code === 'P2002' && error.meta?.target?.includes('monnifyTransactionRef')) {
        this.logger.warn(
          `Unique constraint violation for monnifyTransactionRef: ${monnifyTransactionRef}. Entry already exists.`,
        );
        return { skipped: true, reason: 'unique_constraint_violation' };
      }
      throw error;
    }
  }

  /**
   * Legacy signature for backward compatibility
   * @deprecated Use recordTicketSale(params) instead
   */
  async recordTicketSaleLegacy(
    organizerId: string,
    ticketId: string,
    amount: number,
    _platformFee: number,
  ) {
    return this.recordTicketSale({
      organizerId,
      ticketId,
      amount,
      platformFee: _platformFee,
    });
  }

  async recordRefund(organizerId: string, ticketId: string, amount: number, transactionDate?: Date) {
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
        transactionDate: transactionDate || new Date(),
      },
    });
  }

  async recordWithdrawal(organizerId: string, withdrawalId: string, amount: number, transactionDate?: Date) {
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
        transactionDate: transactionDate || new Date(),
      },
    });
  }

  async recordChargeback(organizerId: string, ticketId: string, amount: number, transactionDate?: Date) {
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
        transactionDate: transactionDate || new Date(),
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
