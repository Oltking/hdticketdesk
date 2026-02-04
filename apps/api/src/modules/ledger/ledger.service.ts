import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerType, LedgerStatus } from '@prisma/client';

/**
 * ============================================================================
 * PROFESSIONAL ACCOUNTING LEDGER SERVICE
 * ============================================================================
 * 
 * This service implements proper double-entry accounting principles:
 * 
 * DEBIT vs CREDIT (from organizer's perspective):
 * - CREDIT: Money coming IN (ticket sales) - increases balance
 * - DEBIT: Money going OUT (withdrawals, refunds, chargebacks) - decreases balance
 * 
 * TIMESTAMPS:
 * - entryDate: When the ledger entry was recorded (audit trail)
 * - valueDate: When the actual transaction occurred (e.g., payment time)
 * - settledDate: When funds were settled/cleared
 * 
 * DEDUPLICATION:
 * - Primary key: monnifyTransactionRef (for Monnify payments)
 * - Fallback: ticketId (for legacy Paystack or free tickets)
 * - Database constraint prevents duplicates at DB level
 * 
 * ============================================================================
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================================================
  // CREDIT ENTRY: Record money coming IN (Ticket Sales)
  // ==========================================================================
  /**
   * Record a ticket sale as a CREDIT entry in the ledger.
   * Money is coming IN to the organizer's account.
   */
  async recordTicketSale(params: {
    organizerId: string;
    ticketId: string;
    amount: number;
    platformFee?: number;
    // Payment references for reconciliation
    monnifyTransactionRef?: string | null;
    paymentReference?: string | null;
    paymentId?: string | null;
    externalReference?: string | null;
    // Timestamps
    valueDate?: Date;       // When payment was made
    settledDate?: Date;     // When funds were settled (if known)
    // Description
    description?: string;
    narration?: string;
    // Audit
    createdBy?: string;
  }) {
    const {
      organizerId,
      ticketId,
      amount,
      monnifyTransactionRef,
      paymentReference,
      paymentId,
      externalReference,
      valueDate,
      settledDate,
      description,
      narration,
      createdBy,
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
    // CALCULATE BALANCES
    // ==========================================================================
    const currentPending = Number(organizer.pendingBalance) || 0;
    const currentAvailable = Number(organizer.availableBalance) || 0;
    const newPendingBalance = currentPending + amount;
    const runningBalance = newPendingBalance + currentAvailable;

    // ==========================================================================
    // CREATE CREDIT ENTRY
    // ==========================================================================
    try {
      const entry = await this.prisma.ledgerEntry.create({
        data: {
          type: 'TICKET_SALE',
          organizerId,
          ticketId,
          // Double-entry: CREDIT for money IN
          credit: amount,
          debit: 0,
          amount: amount, // Net amount (positive for credits)
          // Balances
          pendingBalanceAfter: newPendingBalance,
          availableBalanceAfter: currentAvailable,
          runningBalance,
          // References
          monnifyTransactionRef: monnifyTransactionRef || null,
          paymentReference: paymentReference || null,
          paymentId: paymentId || null,
          externalReference: externalReference || null,
          // Timestamps
          valueDate: valueDate || new Date(),
          settledDate: settledDate || null,
          // Description
          description: description || `Ticket sale`,
          narration: narration || `Credit: Ticket sale for ticket ${ticketId}`,
          // Audit
          status: 'CONFIRMED',
          createdBy: createdBy || 'SYSTEM',
        },
      });

      this.logger.log(
        `✅ CREDIT Entry: ${entry.id} | +₦${amount} | MonnifyRef: ${monnifyTransactionRef || 'N/A'}`,
      );

      return { skipped: false, entry };
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('monnifyTransactionRef')) {
        this.logger.warn(
          `Unique constraint violation for monnifyTransactionRef: ${monnifyTransactionRef}. Entry already exists.`,
        );
        return { skipped: true, reason: 'unique_constraint_violation' };
      }
      throw error;
    }
  }

  // ==========================================================================
  // DEBIT ENTRIES: Record money going OUT
  // ==========================================================================

  /**
   * Record a refund as a DEBIT entry in the ledger.
   * Money is going OUT from the organizer's account.
   */
  async recordRefund(params: {
    organizerId: string;
    ticketId: string;
    refundId?: string;
    amount: number;
    valueDate?: Date;
    description?: string;
    narration?: string;
    createdBy?: string;
  }) {
    const {
      organizerId,
      ticketId,
      refundId,
      amount,
      valueDate,
      description,
      narration,
      createdBy,
    } = params;

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    const currentPending = Number(organizer.pendingBalance) || 0;
    const currentAvailable = Number(organizer.availableBalance) || 0;
    const newAvailableBalance = currentAvailable - amount;
    const runningBalance = currentPending + newAvailableBalance;

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        type: 'REFUND',
        organizerId,
        ticketId,
        refundId: refundId || null,
        // Double-entry: DEBIT for money OUT
        debit: amount,
        credit: 0,
        amount: -amount, // Net amount (negative for debits)
        // Balances
        pendingBalanceAfter: currentPending,
        availableBalanceAfter: newAvailableBalance,
        runningBalance,
        // Timestamps
        valueDate: valueDate || new Date(),
        // Description
        description: description || `Refund processed`,
        narration: narration || `Debit: Refund for ticket ${ticketId}`,
        // Audit
        status: 'CONFIRMED',
        createdBy: createdBy || 'SYSTEM',
      },
    });

    this.logger.log(`✅ DEBIT Entry (Refund): ${entry.id} | -₦${amount}`);
    return entry;
  }

  /**
   * Record a withdrawal as a DEBIT entry in the ledger.
   * Money is going OUT from the organizer's account.
   */
  async recordWithdrawal(params: {
    organizerId: string;
    withdrawalId: string;
    amount: number;
    valueDate?: Date;
    description?: string;
    narration?: string;
    createdBy?: string;
  }) {
    const {
      organizerId,
      withdrawalId,
      amount,
      valueDate,
      description,
      narration,
      createdBy,
    } = params;

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    const currentPending = Number(organizer.pendingBalance) || 0;
    const currentAvailable = Number(organizer.availableBalance) || 0;
    const newAvailableBalance = currentAvailable - amount;
    const runningBalance = currentPending + newAvailableBalance;

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        type: 'WITHDRAWAL',
        organizerId,
        withdrawalId,
        // Double-entry: DEBIT for money OUT
        debit: amount,
        credit: 0,
        amount: -amount, // Net amount (negative for debits)
        // Balances
        pendingBalanceAfter: currentPending,
        availableBalanceAfter: newAvailableBalance,
        runningBalance,
        // Timestamps
        valueDate: valueDate || new Date(),
        // Description
        description: description || `Withdrawal`,
        narration: narration || `Debit: Withdrawal ${withdrawalId}`,
        // Audit
        status: 'CONFIRMED',
        createdBy: createdBy || 'SYSTEM',
      },
    });

    this.logger.log(`✅ DEBIT Entry (Withdrawal): ${entry.id} | -₦${amount}`);
    return entry;
  }

  /**
   * Record a chargeback as a DEBIT entry in the ledger.
   * Money is going OUT from the organizer's account (forcibly by payment provider).
   */
  async recordChargeback(params: {
    organizerId: string;
    ticketId: string;
    amount: number;
    externalReference?: string;
    valueDate?: Date;
    description?: string;
    narration?: string;
    createdBy?: string;
  }) {
    const {
      organizerId,
      ticketId,
      amount,
      externalReference,
      valueDate,
      description,
      narration,
      createdBy,
    } = params;

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    const currentPending = Number(organizer.pendingBalance) || 0;
    const currentAvailable = Number(organizer.availableBalance) || 0;
    const newAvailableBalance = currentAvailable - amount;
    const runningBalance = currentPending + newAvailableBalance;

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        type: 'CHARGEBACK',
        organizerId,
        ticketId,
        externalReference: externalReference || null,
        // Double-entry: DEBIT for money OUT
        debit: amount,
        credit: 0,
        amount: -amount, // Net amount (negative for debits)
        // Balances
        pendingBalanceAfter: currentPending,
        availableBalanceAfter: newAvailableBalance,
        runningBalance,
        // Timestamps
        valueDate: valueDate || new Date(),
        // Description
        description: description || `Chargeback`,
        narration: narration || `Debit: Chargeback for ticket ${ticketId}`,
        // Audit
        status: 'CONFIRMED',
        createdBy: createdBy || 'SYSTEM',
      },
    });

    this.logger.log(`✅ DEBIT Entry (Chargeback): ${entry.id} | -₦${amount}`);
    return entry;
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
      orderBy: { entryDate: 'desc' },
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
      orderBy: { entryDate: 'desc' },
      include: {
        organizer: {
          select: { id: true, title: true },
        },
      },
    });
  }
}
