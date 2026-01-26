import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface ReconciliationReport {
  organizerId: string;
  organizerName: string;
  period: { start: Date; end: Date };
  summary: {
    totalTicketSales: number;
    totalRefunds: number;
    totalWithdrawals: number;
    platformFees: number;
    netRevenue: number;
    pendingBalance: number;
    availableBalance: number;
    withdrawnBalance: number;
    calculatedBalance: number;
    balanceDiscrepancy: number;
  };
  transactions: {
    ticketSales: any[];
    refunds: any[];
    withdrawals: any[];
  };
  virtualAccount?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  };
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a full reconciliation report for an organizer
   * This helps ensure all payments are properly tracked and balances are accurate
   */
  async generateOrganizerReport(
    organizerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReconciliationReport> {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: {
        user: { select: { email: true } },
        virtualAccount: true,
      },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    // Default to last 30 days if no dates provided
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all ticket sales for this organizer in the period
    const ticketSales = await this.prisma.ticket.findMany({
      where: {
        event: { organizerId },
        createdAt: { gte: start, lte: end },
        status: { in: ['ACTIVE', 'CHECKED_IN'] },
      },
      include: {
        event: { select: { id: true, title: true } },
        tier: { select: { name: true, price: true } },
        payment: { select: { reference: true, status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all refunds for this organizer
    const refunds = await this.prisma.refund.findMany({
      where: {
        ticket: { event: { organizerId } },
        createdAt: { gte: start, lte: end },
        status: 'PROCESSED',
      },
      include: {
        ticket: {
          include: {
            event: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all withdrawals for this organizer
    const withdrawals = await this.prisma.withdrawal.findMany({
      where: {
        organizerId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalTicketSales = ticketSales.reduce((sum, ticket) => {
      const amount =
        ticket.amountPaid instanceof Decimal
          ? ticket.amountPaid.toNumber()
          : Number(ticket.amountPaid) || 0;
      return sum + amount;
    }, 0);

    const totalRefunds = refunds.reduce((sum, refund) => {
      const amount =
        refund.refundAmount instanceof Decimal
          ? refund.refundAmount.toNumber()
          : Number(refund.refundAmount) || 0;
      return sum + amount;
    }, 0);

    const completedWithdrawals = withdrawals.filter((w) => w.status === 'COMPLETED');
    const totalWithdrawals = completedWithdrawals.reduce((sum, w) => {
      const amount = w.amount instanceof Decimal ? w.amount.toNumber() : Number(w.amount) || 0;
      return sum + amount;
    }, 0);

    // Estimate platform fees (5% of ticket sales)
    const platformFeePercent = 5;
    const platformFees = totalTicketSales * (platformFeePercent / 100);
    const netRevenue = totalTicketSales - platformFees;

    // Get current balances
    const pendingBalance =
      organizer.pendingBalance instanceof Decimal
        ? organizer.pendingBalance.toNumber()
        : Number(organizer.pendingBalance) || 0;

    const availableBalance =
      organizer.availableBalance instanceof Decimal
        ? organizer.availableBalance.toNumber()
        : Number(organizer.availableBalance) || 0;

    const withdrawnBalance =
      organizer.withdrawnBalance instanceof Decimal
        ? organizer.withdrawnBalance.toNumber()
        : Number(organizer.withdrawnBalance) || 0;

    // Calculate what the balance should be
    // Net revenue - refunds - withdrawals = pending + available
    const calculatedBalance = netRevenue - totalRefunds - totalWithdrawals;
    const actualBalance = pendingBalance + availableBalance;
    const balanceDiscrepancy = Math.abs(calculatedBalance - actualBalance);

    return {
      organizerId,
      organizerName: organizer.title,
      period: { start, end },
      summary: {
        totalTicketSales,
        totalRefunds,
        totalWithdrawals,
        platformFees,
        netRevenue,
        pendingBalance,
        availableBalance,
        withdrawnBalance,
        calculatedBalance,
        balanceDiscrepancy,
      },
      transactions: {
        ticketSales: ticketSales.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          eventTitle: t.event.title,
          tierName: t.tier.name,
          amount: t.amountPaid instanceof Decimal ? t.amountPaid.toNumber() : Number(t.amountPaid),
          createdAt: t.createdAt,
          paymentRef: t.payment?.reference,
        })),
        refunds: refunds.map((r) => ({
          id: r.id,
          eventTitle: r.ticket.event.title,
          amount:
            r.refundAmount instanceof Decimal ? r.refundAmount.toNumber() : Number(r.refundAmount),
          status: r.status,
          processedAt: r.processedAt,
        })),
        withdrawals: withdrawals.map((w) => ({
          id: w.id,
          amount: w.amount instanceof Decimal ? w.amount.toNumber() : Number(w.amount),
          status: w.status,
          bankName: w.bankName,
          accountNumber: w.accountNumber.slice(-4).padStart(w.accountNumber.length, '*'),
          createdAt: w.createdAt,
          processedAt: w.processedAt,
        })),
      },
      virtualAccount: organizer.virtualAccount
        ? {
            accountNumber: organizer.virtualAccount.accountNumber,
            accountName: organizer.virtualAccount.accountName,
            bankName: organizer.virtualAccount.bankName,
          }
        : undefined,
    };
  }

  /**
   * Check for any balance discrepancies across all organizers
   * Used by admin to identify potential issues
   */
  async checkAllBalanceDiscrepancies(): Promise<{
    organizersWithDiscrepancies: Array<{
      organizerId: string;
      organizerName: string;
      discrepancy: number;
      pendingBalance: number;
      availableBalance: number;
    }>;
    totalDiscrepancy: number;
  }> {
    const organizers = await this.prisma.organizerProfile.findMany({
      where: {
        OR: [
          { pendingBalance: { gt: 0 } },
          { availableBalance: { gt: 0 } },
          { withdrawnBalance: { gt: 0 } },
        ],
      },
    });

    const discrepancies = [];
    let totalDiscrepancy = 0;

    for (const org of organizers) {
      // Get ledger totals
      const ledgerTotals = await this.prisma.ledgerEntry.groupBy({
        by: ['type'],
        where: { organizerId: org.id },
        _sum: { amount: true },
      });

      const ticketSalesTotal =
        ledgerTotals.find((l) => l.type === 'TICKET_SALE')?._sum?.amount || 0;
      const refundsTotal = Math.abs(
        Number(ledgerTotals.find((l) => l.type === 'REFUND')?._sum?.amount || 0),
      );
      const withdrawalsTotal = Math.abs(
        Number(ledgerTotals.find((l) => l.type === 'WITHDRAWAL')?._sum?.amount || 0),
      );

      const expectedBalance = Number(ticketSalesTotal) - refundsTotal - withdrawalsTotal;

      const pendingBalance =
        org.pendingBalance instanceof Decimal
          ? org.pendingBalance.toNumber()
          : Number(org.pendingBalance) || 0;

      const availableBalance =
        org.availableBalance instanceof Decimal
          ? org.availableBalance.toNumber()
          : Number(org.availableBalance) || 0;

      const actualBalance = pendingBalance + availableBalance;
      const discrepancy = Math.round((expectedBalance - actualBalance) * 100) / 100;

      if (Math.abs(discrepancy) > 1) {
        // Allow ₦1 tolerance for rounding
        discrepancies.push({
          organizerId: org.id,
          organizerName: org.title,
          discrepancy,
          pendingBalance,
          availableBalance,
        });
        totalDiscrepancy += discrepancy;
      }
    }

    return {
      organizersWithDiscrepancies: discrepancies,
      totalDiscrepancy,
    };
  }

  /**
   * Get virtual account details for an organizer
   */
  async getOrganizerVirtualAccount(organizerId: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: {
        virtualAccount: true,
      },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    if (!organizer.virtualAccount) {
      return {
        hasVirtualAccount: false,
        message:
          'Virtual account not yet created. It will be created when you publish your first event.',
      };
    }

    return {
      hasVirtualAccount: true,
      virtualAccount: {
        accountNumber: organizer.virtualAccount.accountNumber,
        accountName: organizer.virtualAccount.accountName,
        bankName: organizer.virtualAccount.bankName,
        isActive: organizer.virtualAccount.isActive,
        createdAt: organizer.virtualAccount.createdAt,
      },
    };
  }

  /**
   * Get daily transaction summary for an organizer
   */
  async getDailyTransactionSummary(organizerId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        organizerId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = {
      date: startOfDay.toISOString().split('T')[0],
      ticketSales: 0,
      refunds: 0,
      withdrawals: 0,
      netChange: 0,
      transactions: ledgerEntries.length,
    };

    for (const entry of ledgerEntries) {
      const amount =
        entry.amount instanceof Decimal ? entry.amount.toNumber() : Number(entry.amount) || 0;

      switch (entry.type) {
        case 'TICKET_SALE':
          summary.ticketSales += amount;
          break;
        case 'REFUND':
          summary.refunds += Math.abs(amount);
          break;
        case 'WITHDRAWAL':
          summary.withdrawals += Math.abs(amount);
          break;
      }
    }

    summary.netChange = summary.ticketSales - summary.refunds - summary.withdrawals;

    return summary;
  }
}
