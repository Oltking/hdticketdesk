import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats() {
    const [
      totalUsers,
      totalOrganizers,
      totalEvents,
      totalTickets,
      totalRevenue,
      platformBalance,
      recentEvents,
      recentTickets,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ORGANIZER' } }),
      this.prisma.event.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.ticket.count(),
      this.prisma.ticket.aggregate({
        _sum: {
          amountPaid: true,
        },
      }),
      this.prisma.platformBalance.findUnique({
        where: { id: 'platform-balance' },
      }),
      this.prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          organizer: {
            include: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
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
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      this.prisma.ticket.findMany({
        include: {
          event: true,
          buyer: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalOrganizers,
        totalEvents,
        totalTickets,
        totalRevenue: totalRevenue._sum.amountPaid || 0,
        platformFees: platformBalance?.totalFees || 0,
        totalPayouts: platformBalance?.totalPayouts || 0,
      },
      recentEvents,
      recentTickets,
    };
  }

  // ============================================
  // GET ALL USERS
  // ============================================

  async getAllUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        include: {
          organizerProfile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // GET ALL EVENTS
  // ============================================

  async getAllEvents(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        include: {
          organizer: {
            include: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.event.count(),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // GET LEDGER
  // ============================================

  async getLedger(page = 1, limit = 100) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        include: {
          organizer: {
            include: {
              user: {
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
        skip,
        take: limit,
      }),
      this.prisma.ledgerEntry.count(),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // GET REFUND REQUESTS
  // ============================================

  async getAllRefundRequests(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        include: {
          ticket: {
            include: {
              event: true,
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
        skip,
        take: limit,
      }),
      this.prisma.refundRequest.count(),
    ]);

    return {
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // GET WITHDRAWALS
  // ============================================

  async getAllWithdrawals(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        include: {
          organizer: {
            include: {
              user: {
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
        skip,
        take: limit,
      }),
      this.prisma.withdrawal.count(),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}