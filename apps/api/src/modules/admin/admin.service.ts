import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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
          payments: {
            where: { status: 'SUCCESS' },
            select: { amount: true },
          },
        },
      }),
      this.prisma.event.count(),
    ]);

    // Calculate total revenue for each event from successful payments
    const eventsWithRevenue = events.map(event => {
      const totalRevenue = event.payments.reduce((sum, payment) => {
        const amount = payment.amount instanceof Decimal 
          ? payment.amount.toNumber() 
          : Number(payment.amount) || 0;
        return sum + amount;
      }, 0);
      
      // Remove payments array from response (we only needed it for calculation)
      const { payments, ...eventWithoutPayments } = event;
      
      return {
        ...eventWithoutPayments,
        totalRevenue,
      };
    });

    return {
      events: eventsWithRevenue,
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

  /**
   * Admin force unpublish an event (even with sales)
   * This is for admin use when organizers contact support
   */
  async adminUnpublishEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tiers: true,
        tickets: {
          where: {
            status: { in: ['ACTIVE', 'CHECKED_IN'] },
          },
        },
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
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new ForbiddenException('Event is not published');
    }

    const unpublished = await this.prisma.event.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: {
        tiers: true,
        organizer: { select: { id: true, title: true } },
      },
    });

    return {
      ...unpublished,
      ticketsSold: event.tickets.length,
      message: `Event unpublished successfully. ${event.tickets.length} active ticket(s) exist for this event.`,
    };
  }

  /**
   * Admin force delete an event (including all related records)
   * This is for admin use when organizers contact support
   * WARNING: This permanently deletes all related tickets, payments, refunds, etc.
   */
  async adminDeleteEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tiers: true,
        tickets: true,
        payments: true,
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
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Store counts for the response
    const ticketCount = event.tickets.length;
    const paymentCount = event.payments.length;
    const tierCount = event.tiers.length;
    const eventTitle = event.title;
    const organizerEmail = event.organizer?.user?.email;

    // Get ticket IDs for ledger entry cleanup
    const ticketIds = event.tickets.map(t => t.id);

    // Use transaction to delete all related records in correct order
    await this.prisma.$transaction(async (tx) => {
      // Delete refunds associated with tickets of this event
      await tx.refund.deleteMany({
        where: {
          ticket: {
            eventId: id,
          },
        },
      });

      // Delete ledger entries associated with this event's tickets
      if (ticketIds.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            ticketId: { in: ticketIds },
          },
        });
      }

      // Delete tickets
      await tx.ticket.deleteMany({
        where: { eventId: id },
      });

      // Delete payments
      await tx.payment.deleteMany({
        where: { eventId: id },
      });

      // Delete ticket tiers (should cascade, but being explicit)
      await tx.ticketTier.deleteMany({
        where: { eventId: id },
      });

      // Finally delete the event
      await tx.event.delete({
        where: { id },
      });
    });

    return {
      message: `Event "${eventTitle}" deleted successfully by admin.`,
      deletedRecords: {
        tickets: ticketCount,
        payments: paymentCount,
        tiers: tierCount,
      },
      organizer: organizerEmail,
    };
  }

  /**
   * Create a new admin user (admin-only)
   * This is the secure way to create additional admin accounts
   */
  async createAdminUser(dto: { email: string; password: string; firstName: string; lastName: string }) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Validate password strength
    if (dto.password.length < 12) {
      throw new ForbiddenException('Admin password must be at least 12 characters long');
    }

    // Hash password with high cost factor for admin accounts
    const hashedPassword = await bcrypt.hash(dto.password, 14);

    // Create admin user
    const adminUser = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'ADMIN',
        emailVerified: true, // Admin accounts are pre-verified
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    this.logger.log(`New admin user created: ${adminUser.email}`);

    return {
      message: 'Admin user created successfully',
      user: adminUser,
    };
  }

  /**
   * Get all refund requests with pagination
   */
  async getAllRefunds(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: {
            include: {
              event: {
                include: {
                  organizer: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
              tier: true,
            },
          },
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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

  /**
   * Process an approved refund (initiate actual refund)
   */
  async processRefund(refundId: string) {
    // Find the refund
    const refund = await this.prisma.refund.findUnique({
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

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved refunds can be processed');
    }

    // Update refund status to PROCESSED
    const updatedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        processedBy: 'ADMIN',
      },
    });

    // Update ticket status to REFUNDED
    await this.prisma.ticket.update({
      where: { id: refund.ticketId },
      data: {
        status: 'REFUNDED',
      },
    });

    // Create ledger entry for the refund (negative amount)
    const refundAmountDecimal = new Decimal(refund.refundAmount.toString());

    await this.prisma.ledgerEntry.create({
      data: {
        organizerId: refund.ticket.event.organizerId,
        type: 'REFUND',
        amount: refundAmountDecimal.negated(),
        description: `Refund for ticket #${refund.ticket.ticketNumber}`,
        ticketId: refund.ticketId,
        pendingBalanceAfter: new Decimal(0),
        availableBalanceAfter: new Decimal(0),
      },
    });

    // Update organizer balance (deduct refund amount)
    await this.prisma.organizerProfile.update({
      where: { id: refund.ticket.event.organizerId },
      data: {
        availableBalance: {
          decrement: refundAmountDecimal,
        },
      },
    });

    this.logger.log(`Refund processed: ${refundId} for ticket ${refund.ticket.ticketNumber}`);

    return {
      message: 'Refund processed successfully',
      refund: updatedRefund,
    };
  }
}
