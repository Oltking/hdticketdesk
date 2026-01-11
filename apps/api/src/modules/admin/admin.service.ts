import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalOrganizers,
      totalEvents,
      totalTickets,
      recentPayments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organizerProfile.count(),
      this.prisma.event.count(),
      this.prisma.ticket.count(),
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate platform stats from ledger entries
    const ledgerStats = await this.prisma.ledgerEntry.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        type: 'TICKET_SALE',
      },
    });

    const totalRevenue = ledgerStats._sum.amount 
      ? (ledgerStats._sum.amount instanceof Decimal 
          ? ledgerStats._sum.amount.toNumber() 
          : Number(ledgerStats._sum.amount))
      : 0;

    // Calculate platform fee (5% of total revenue collected)
    const platformFees = totalRevenue * 0.05 / 0.95; // Reverse calculate from net amount

    return {
      totalUsers,
      totalOrganizers,
      totalEvents,
      totalTickets,
      totalRevenue,
      platformFees,
      recentPayments,
    };
  }

  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          organizerProfile: {
            select: {
              id: true,
              title: true,
              availableBalance: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllEvents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: {
              id: true,
              title: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              tickets: true,
            },
          },
        },
      }),
      this.prisma.event.count(),
    ]);

    return {
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllWithdrawals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: {
              id: true,
              title: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.withdrawal.count(),
    ]);

    return {
      withdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Alias for getLedger - used by controller
  async getLedgerAudit(page = 1, limit = 50) {
    return this.getLedger(page, limit);
  }

  async getLedger(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organizer: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.ledgerEntry.count(),
    ]);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRefunds(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: {
            include: {
              event: true,
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
      }),
      this.prisma.refund.count(),
    ]);

    return {
      refunds,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
