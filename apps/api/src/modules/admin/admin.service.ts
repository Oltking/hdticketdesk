import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MonnifyService } from '../payments/monnify.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private monnifyService: MonnifyService,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalOrganizers, totalEvents, totalTickets, recentPayments] =
      await Promise.all([
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

    // =============================================================================
    // PLATFORM FEE CALCULATION - SIMPLE METHOD
    // =============================================================================
    // Platform fee = 5% of the TOTAL AMOUNT PAID by buyers
    // This is straightforward: whatever entered the account, take 5% of it.
    // =============================================================================

    // Get total amount paid from successful payments
    const paymentStats = await this.prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'SUCCESS',
      },
    });

    // Total revenue = total amount paid by buyers
    const totalRevenue = paymentStats._sum.amount
      ? paymentStats._sum.amount instanceof Decimal
        ? paymentStats._sum.amount.toNumber()
        : Number(paymentStats._sum.amount)
      : 0;

    // Platform fee = 5% of total revenue (simple and straightforward)
    const platformFees = totalRevenue * 0.05;

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

    // Calculate total revenue and platform fees for each event from successful payments
    const platformFeePercent = 5; // 5% platform fee
    
    const eventsWithRevenue = events.map((event: any) => {
      const totalRevenue = event.payments.reduce((sum: any, payment: any) => {
        const amount =
          payment.amount instanceof Decimal
            ? payment.amount.toNumber()
            : Number(payment.amount) || 0;
        return sum + amount;
      }, 0);

      // Calculate platform fees for this event (5% of total revenue)
      const platformFees = totalRevenue * (platformFeePercent / 100);
      const organizerEarnings = totalRevenue - platformFees;

      // Remove payments array from response (we only needed it for calculation)
      const { payments, ...eventWithoutPayments } = event;

      return {
        ...eventWithoutPayments,
        totalRevenue,
        platformFees,
        organizerEarnings,
        ticketsSold: event._count?.tickets || 0,
      };
    });

    return {
      events: eventsWithRevenue,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get platform fees summary for all events
   * Shows each event with its revenue, platform fees earned, and organizer earnings
   */
  async getPlatformFeesSummary(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const platformFeePercent = 5;

    // Get events with successful payments
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
            },
          },
          payments: {
            where: { status: 'SUCCESS' },
            select: { amount: true, createdAt: true },
          },
          _count: {
            select: { tickets: true },
          },
        },
      }),
      this.prisma.event.count(),
    ]);

    // Calculate totals
    let totalPlatformFees = 0;
    let totalRevenue = 0;
    let totalOrganizerEarnings = 0;

    const eventsWithFees = events.map((event: any) => {
      const eventRevenue = event.payments.reduce((sum: any, p: any) => {
        const amount = p.amount instanceof Decimal ? p.amount.toNumber() : Number(p.amount) || 0;
        return sum + amount;
      }, 0);

      const eventPlatformFees = eventRevenue * (platformFeePercent / 100);
      const eventOrganizerEarnings = eventRevenue - eventPlatformFees;

      totalRevenue += eventRevenue;
      totalPlatformFees += eventPlatformFees;
      totalOrganizerEarnings += eventOrganizerEarnings;

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        organizer: event.organizer,
        ticketsSold: event._count.tickets,
        totalRevenue: Math.round(eventRevenue * 100) / 100,
        platformFees: Math.round(eventPlatformFees * 100) / 100,
        organizerEarnings: Math.round(eventOrganizerEarnings * 100) / 100,
        createdAt: event.createdAt,
        startDate: event.startDate,
      };
    });

    // Sort by platform fees earned (highest first)
    eventsWithFees.sort((a, b) => b.platformFees - a.platformFees);

    return {
      events: eventsWithFees,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalOrganizerEarnings: Math.round(totalOrganizerEarnings * 100) / 100,
        platformFeePercent,
      },
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
    const ticketIds = event.tickets.map((t: any) => t.id);

    // Use transaction to delete all related records in correct order
    await this.prisma.$transaction(async (tx: any) => {
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
  async createAdminUser(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
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

  // Get individual organizer earnings and stats
  async getOrganizerEarnings(organizerId: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        virtualAccount: true, // Include virtual account for admin view
      },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    // Get total earnings from ledger
    const ticketSales = await this.prisma.ledgerEntry.findMany({
      where: {
        organizerId,
        type: 'TICKET_SALE',
      },
      orderBy: { createdAt: 'desc' },
    });

    const withdrawals = await this.prisma.withdrawal.findMany({
      where: {
        organizerId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });

    const refunds = await this.prisma.refund.findMany({
      where: {
        ticket: {
          event: {
            organizerId,
          },
        },
        status: 'PROCESSED',
      },
      include: {
        ticket: {
          select: {
            ticketNumber: true,
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { processedAt: 'desc' },
    });

    // Calculate totals
    const totalSales = ticketSales.reduce((sum: any, entry: any) => {
      const amount =
        entry.amount instanceof Decimal ? entry.amount.toNumber() : Number(entry.amount);
      return sum + amount;
    }, 0);

    const totalWithdrawn = withdrawals.reduce((sum: any, w: any) => {
      const amount = w.amount instanceof Decimal ? w.amount.toNumber() : Number(w.amount);
      return sum + amount;
    }, 0);

    const totalRefunded = refunds.reduce((sum: any, r: any) => {
      const amount =
        r.refundAmount instanceof Decimal ? r.refundAmount.toNumber() : Number(r.refundAmount);
      return sum + amount;
    }, 0);

    const pendingBalance =
      organizer.pendingBalance instanceof Decimal
        ? organizer.pendingBalance.toNumber()
        : Number(organizer.pendingBalance);

    const availableBalance =
      organizer.availableBalance instanceof Decimal
        ? organizer.availableBalance.toNumber()
        : Number(organizer.availableBalance);

    const withdrawnBalance =
      organizer.withdrawnBalance instanceof Decimal
        ? organizer.withdrawnBalance.toNumber()
        : Number(organizer.withdrawnBalance);

    return {
      organizer: {
        id: organizer.id,
        title: organizer.title,
        user: organizer.user,
        virtualAccount: organizer.virtualAccount, // Include VA for admin view
      },
      balances: {
        pending: pendingBalance,
        available: availableBalance,
        withdrawn: withdrawnBalance,
      },
      stats: {
        totalSales,
        totalWithdrawn,
        totalRefunded,
        netEarnings: totalSales - totalRefunded,
      },
      recentSales: ticketSales.slice(0, 10).map((sale: any) => ({
        id: sale.id,
        amount: sale.amount instanceof Decimal ? sale.amount.toNumber() : Number(sale.amount),
        description: sale.description,
        createdAt: sale.createdAt,
      })),
      recentWithdrawals: withdrawals.slice(0, 10).map((w: any) => ({
        id: w.id,
        amount: w.amount instanceof Decimal ? w.amount.toNumber() : Number(w.amount),
        status: w.status,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
      })),
      recentRefunds: refunds.slice(0, 10).map((r: any) => ({
        id: r.id,
        amount:
          r.refundAmount instanceof Decimal ? r.refundAmount.toNumber() : Number(r.refundAmount),
        ticketNumber: r.ticket.ticketNumber,
        eventTitle: r.ticket.event.title,
        processedAt: r.processedAt,
      })),
    };
  }

  /**
   * Create virtual account for an organizer (admin only)
   * This is useful when VA creation failed during event publish
   */
  async createVirtualAccountForOrganizer(organizerId: string) {
    // Find the organizer
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: {
        user: {
          select: { email: true },
        },
        virtualAccount: true,
      },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    // Check if already has a virtual account
    if (organizer.virtualAccount) {
      throw new BadRequestException('Organizer already has a virtual account');
    }

    try {
      this.logger.log(`Admin creating virtual account for organizer ${organizerId}`);

      const vaResponse = await this.monnifyService.createVirtualAccount(
        organizer.id,
        organizer.title || 'Organizer',
        organizer.user?.email || '',
      );

      // Save virtual account to database
      const virtualAccount = await this.prisma.virtualAccount.create({
        data: {
          accountNumber: vaResponse.accountNumber,
          accountName: vaResponse.accountName,
          bankName: vaResponse.bankName,
          bankCode: vaResponse.bankCode,
          accountReference: vaResponse.accountReference,
          monnifyContractCode: this.monnifyService['contractCode'] || '',
          organizerId: organizer.id,
        },
      });

      this.logger.log(
        `Virtual account created by admin: ${vaResponse.accountNumber} for organizer ${organizerId}`,
      );

      return {
        message: 'Virtual account created successfully',
        virtualAccount,
        organizer: {
          id: organizer.id,
          title: organizer.title,
          email: organizer.user?.email,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create virtual account for organizer ${organizerId}:`, error);
      throw new BadRequestException(`Failed to create virtual account: ${error.message}`);
    }
  }

  /**
   * Get all organizers without virtual accounts
   */
  async getOrganizersWithoutVirtualAccount() {
    const organizers = await this.prisma.organizerProfile.findMany({
      where: {
        virtualAccount: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      organizers: organizers.map((org: any) => ({
        id: org.id,
        title: org.title,
        user: org.user,
        eventsCount: org._count.events,
        createdAt: org.createdAt,
      })),
      total: organizers.length,
    };
  }

  // Get all organizers with their earnings summary
  async getAllOrganizersEarnings(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [organizers, total] = await Promise.all([
      this.prisma.organizerProfile.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.organizerProfile.count(),
    ]);

    // Calculate earnings for each organizer
    const organizersWithEarnings = await Promise.all(
      organizers.map(async (organizer: any) => {
        // Get total sales from ledger
        const salesSum = await this.prisma.ledgerEntry.aggregate({
          where: {
            organizerId: organizer.id,
            type: 'TICKET_SALE',
          },
          _sum: {
            amount: true,
          },
        });

        // Get total refunds
        const refundsSum = await this.prisma.refund.aggregate({
          where: {
            ticket: {
              event: {
                organizerId: organizer.id,
              },
            },
            status: 'PROCESSED',
          },
          _sum: {
            refundAmount: true,
          },
        });

        const totalSales = salesSum._sum.amount
          ? salesSum._sum.amount instanceof Decimal
            ? salesSum._sum.amount.toNumber()
            : Number(salesSum._sum.amount)
          : 0;

        const totalRefunded = refundsSum._sum.refundAmount
          ? refundsSum._sum.refundAmount instanceof Decimal
            ? refundsSum._sum.refundAmount.toNumber()
            : Number(refundsSum._sum.refundAmount)
          : 0;

        const pendingBalance =
          organizer.pendingBalance instanceof Decimal
            ? organizer.pendingBalance.toNumber()
            : Number(organizer.pendingBalance);

        const availableBalance =
          organizer.availableBalance instanceof Decimal
            ? organizer.availableBalance.toNumber()
            : Number(organizer.availableBalance);

        const withdrawnBalance =
          organizer.withdrawnBalance instanceof Decimal
            ? organizer.withdrawnBalance.toNumber()
            : Number(organizer.withdrawnBalance);

        return {
          id: organizer.id,
          title: organizer.title,
          user: organizer.user,
          balances: {
            pending: pendingBalance,
            available: availableBalance,
            withdrawn: withdrawnBalance,
          },
          earnings: {
            totalSales,
            totalRefunded,
            netEarnings: totalSales - totalRefunded,
          },
        };
      }),
    );

    return {
      organizers: organizersWithEarnings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Create virtual accounts for all organizers without one
  async createVirtualAccountsForAllOrganizers() {
    this.logger.log('Admin bulk creating virtual accounts for all organizers without one');

    const organizersWithoutVA = await this.prisma.organizerProfile.findMany({
      where: {
        virtualAccount: null,
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    this.logger.log(`Found ${organizersWithoutVA.length} organizers without virtual accounts`);

    const results = {
      total: organizersWithoutVA.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const organizer of organizersWithoutVA) {
      try {
        const vaResponse = await this.monnifyService.createVirtualAccount(
          organizer.id,
          organizer.title,
          organizer.user.email,
        );

        await this.prisma.virtualAccount.create({
          data: {
            accountNumber: vaResponse.accountNumber,
            accountName: vaResponse.accountName,
            bankName: vaResponse.bankName,
            bankCode: vaResponse.bankCode,
            accountReference: vaResponse.accountReference,
            monnifyContractCode: this.configService.get<string>('MONNIFY_CONTRACT_CODE') || '',
            organizerId: organizer.id,
          },
        });

        results.successful++;
        this.logger.log(`Created VA for ${organizer.title}: ${vaResponse.accountNumber}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          organizerId: organizer.id,
          organizerTitle: organizer.title,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`Failed to create VA for ${organizer.title}:`, error);
      }
    }

    this.logger.log(
      `Bulk VA creation complete: ${results.successful} successful, ${results.failed} failed`,
    );

    return {
      message: 'Bulk virtual account creation completed',
      ...results,
    };
  }

  // Get all pending payments
  async getAllPendingPayments(page = 1, limit = 50) {
    this.logger.log('Admin fetching all pending payments');

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
          tier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.payment.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      payments: payments.map((p: any) => ({
        id: p.id,
        reference: p.reference,
        monnifyTransactionRef: p.monnifyTransactionRef,
        amount: p.amount instanceof Decimal ? p.amount.toNumber() : Number(p.amount),
        buyerEmail: p.buyerEmail,
        eventTitle: p.event?.title,
        tierName: p.tier?.name,
        createdAt: p.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Manually verify a specific payment
  // Accepts: HD payment reference, Monnify transaction reference (MNFY_...), or payment ID
  async manuallyVerifyPayment(reference: string) {
    this.logger.log(`Admin manually verifying payment: ${reference}`);

    // Try to find payment by various identifiers
    let payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: {
        event: true,
        tier: true,
      },
    });

    // If not found by reference, try by monnifyTransactionRef
    if (!payment) {
      this.logger.log(`Payment not found by reference, trying monnifyTransactionRef: ${reference}`);
      payment = await this.prisma.payment.findFirst({
        where: { monnifyTransactionRef: reference },
        include: {
          event: true,
          tier: true,
        },
      });
    }

    // If still not found, try by ID
    if (!payment) {
      this.logger.log(`Payment not found by monnifyTransactionRef, trying by ID: ${reference}`);
      payment = await this.prisma.payment.findUnique({
        where: { id: reference },
        include: {
          event: true,
          tier: true,
        },
      });
    }

    if (!payment) {
      // List recent pending payments to help admin
      const recentPending = await this.prisma.payment.findMany({
        where: { status: 'PENDING' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { reference: true, monnifyTransactionRef: true, buyerEmail: true, createdAt: true },
      });

      throw new NotFoundException({
        message: `Payment not found with reference: ${reference}`,
        suggestion: 'Try using the HD-xxx reference, MNFY_xxx reference, or payment ID',
        recentPendingPayments: recentPending,
      });
    }

    if (payment.status !== 'PENDING') {
      return {
        message: `Payment already processed with status: ${payment.status}`,
        payment,
      };
    }

    // Use the monnify transaction reference or the payment reference
    const transactionRef = payment.monnifyTransactionRef || reference;

    try {
      // Verify with Monnify - pass both transaction ref and payment ref
      const monnifyData = await this.monnifyService.verifyTransaction(
        transactionRef,
        payment.reference,
      );

      this.logger.log(
        `Monnify verification result for ${reference}: ${JSON.stringify(monnifyData)}`,
      );

      if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
        // Import PaymentsService to process payment
        const { PaymentsService } = await import('../payments/payments.service');
        const { TicketsService } = await import('../tickets/tickets.service');
        const { LedgerService } = await import('../ledger/ledger.service');
        const { TasksService } = await import('../tasks/tasks.service');
        const { EmailService } = await import('../emails/email.service');
        const { QrService } = await import('../qr/qr.service');
        const { MediaService } = await import('../media/media.service');

        // Create service instances with proper dependencies
        const mediaService = new MediaService(this.configService);
        const qrService = new QrService(mediaService);
        const emailService = new EmailService(this.configService);
        const ticketsService = new TicketsService(this.prisma, emailService, qrService);
        const ledgerService = new LedgerService(this.prisma);
        const tasksService = new TasksService(this.prisma);

        const paymentsService = new PaymentsService(
          this.prisma,
          this.configService,
          this.monnifyService,
          ticketsService,
          ledgerService,
          tasksService,
        );

        // Process the payment manually
        await (paymentsService as any).handleSuccessfulPayment({
          reference: payment.reference,
          amount: monnifyData.amount,
          id: monnifyData.transactionReference,
          paid_at: monnifyData.paidOn,
          customer: monnifyData.customer,
        });

        // Fetch updated payment and ticket
        const updatedPayment = await this.prisma.payment.findUnique({
          where: { reference },
        });

        const ticket = await this.prisma.ticket.findFirst({
          where: { paymentId: payment.id },
        });

        return {
          message: 'Payment verified and ticket created successfully!',
          payment: updatedPayment,
          ticket,
        };
      } else {
        return {
          message: `Payment status on Monnify: ${monnifyData.status}. Cannot process.`,
          monnifyStatus: monnifyData.status,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to verify payment ${reference}:`, error);
      throw error;
    }
  }

  /**
   * ADMIN FORCE CONFIRM PAYMENT
   * Use this when you've manually verified payment in Monnify dashboard
   * This bypasses Monnify API verification and directly creates the ticket
   *
   * @param reference - HD payment reference, Monnify ref, or payment ID
   * @param confirmedAmount - The amount confirmed in Monnify dashboard (for logging)
   * @param adminNotes - Optional notes explaining why force confirm was used
   */
  async forceConfirmPayment(reference: string, confirmedAmount?: number, adminNotes?: string) {
    this.logger.log(`Admin force confirming payment: ${reference}`);

    // Find the payment by various identifiers
    let payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: {
        event: { include: { organizer: true } },
        tier: true,
        buyer: true,
      },
    });

    if (!payment) {
      payment = await this.prisma.payment.findFirst({
        where: { monnifyTransactionRef: reference },
        include: {
          event: { include: { organizer: true } },
          tier: true,
          buyer: true,
        },
      });
    }

    if (!payment) {
      payment = await this.prisma.payment.findUnique({
        where: { id: reference },
        include: {
          event: { include: { organizer: true } },
          tier: true,
          buyer: true,
        },
      });
    }

    // Also try by buyer email
    if (!payment && reference.includes('@')) {
      payment = await this.prisma.payment.findFirst({
        where: { buyerEmail: reference, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          event: { include: { organizer: true } },
          tier: true,
          buyer: true,
        },
      });
    }

    if (!payment) {
      // Show recent pending payments to help
      const recentPending = await this.prisma.payment.findMany({
        where: { status: 'PENDING' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          monnifyTransactionRef: true,
          buyerEmail: true,
          amount: true,
          createdAt: true,
        },
      });

      throw new NotFoundException({
        message: `Payment not found: ${reference}`,
        suggestion: 'Try the HD-xxx reference, MNFY_xxx reference, payment ID, or buyer email',
        recentPendingPayments: recentPending,
      });
    }

    // Check if already processed
    if (payment.status === 'SUCCESS') {
      const existingTicket = await this.prisma.ticket.findFirst({
        where: { paymentId: payment.id },
      });

      return {
        message: 'Payment already confirmed and ticket exists',
        payment: { id: payment.id, reference: payment.reference, status: payment.status },
        ticket: existingTicket,
      };
    }

    // Calculate amounts
    const tierPrice =
      payment.tier.price instanceof Decimal
        ? payment.tier.price.toNumber()
        : Number(payment.tier.price);

    const platformFeePercent = this.configService.get<number>('platformFeePercent') || 5;
    const passFeeTobuyer = (payment.event as any).passFeeTobuyer ?? false;
    const serviceFee = tierPrice * (platformFeePercent / 100);

    // Calculate what buyer should have paid
    const expectedBuyerPayment = passFeeTobuyer ? tierPrice + serviceFee : tierPrice;

    // Calculate organizer earnings
    let organizerAmount: number;
    if (passFeeTobuyer) {
      organizerAmount = tierPrice; // Full tier price - buyer paid fee separately
    } else {
      organizerAmount = tierPrice - serviceFee; // Minus platform fee
    }

    this.logger.log(`Force confirming payment ${payment.reference}:`);
    this.logger.log(`  - Tier price: ₦${tierPrice}`);
    this.logger.log(`  - Service fee (${platformFeePercent}%): ₦${serviceFee}`);
    this.logger.log(`  - Fee paid by: ${passFeeTobuyer ? 'BUYER' : 'ORGANIZER'}`);
    this.logger.log(`  - Expected buyer payment: ₦${expectedBuyerPayment}`);
    this.logger.log(`  - Confirmed amount from admin: ₦${confirmedAmount || 'not provided'}`);
    this.logger.log(`  - Organizer will receive: ₦${organizerAmount}`);

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const qrCode = `${payment.eventId}-${ticketNumber}`;

    // Use transaction to ensure all operations succeed
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Update payment status
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          paidAt: new Date(),
        },
      });

      // 2. Create ticket
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          qrCode,
          status: 'ACTIVE',
          buyerEmail: payment.buyerEmail,
          buyerFirstName: payment.buyer?.firstName || null,
          buyerLastName: payment.buyer?.lastName || null,
          amountPaid: tierPrice,
          paymentRef: payment.reference,
          eventId: payment.eventId,
          tierId: payment.tierId,
          buyerId: payment.buyerId!,
          paymentId: payment.id,
        },
      });

      // 3. Update tier sold count
      await prisma.ticketTier.update({
        where: { id: payment.tierId },
        data: { sold: { increment: 1 } },
      });

      // 4. Update organizer pending balance
      await prisma.organizerProfile.update({
        where: { id: payment.event.organizerId },
        data: { pendingBalance: { increment: organizerAmount } },
      });

      // 5. Get updated organizer for ledger entry
      const organizer = await prisma.organizerProfile.findUnique({
        where: { id: payment.event.organizerId },
      });

      const currentPending =
        organizer?.pendingBalance instanceof Decimal
          ? organizer.pendingBalance.toNumber()
          : Number(organizer?.pendingBalance || 0);
      const currentAvailable =
        organizer?.availableBalance instanceof Decimal
          ? organizer.availableBalance.toNumber()
          : Number(organizer?.availableBalance || 0);

      // 6. Create ledger entry
      await prisma.ledgerEntry.create({
        data: {
          type: 'TICKET_SALE',
          amount: organizerAmount,
          description: `[ADMIN FORCE CONFIRM] ${payment.event.title} - ${payment.tier.name}${adminNotes ? ` | Note: ${adminNotes}` : ''}`,
          pendingBalanceAfter: currentPending,
          availableBalanceAfter: currentAvailable,
          ticketId: ticket.id,
          organizerId: payment.event.organizerId,
        },
      });

      return { payment: updatedPayment, ticket };
    });

    this.logger.log(`✅ Payment force confirmed! Ticket: ${result.ticket.ticketNumber}`);

    return {
      success: true,
      message: 'Payment confirmed and ticket created successfully!',
      payment: {
        id: result.payment.id,
        reference: result.payment.reference,
        monnifyTransactionRef: payment.monnifyTransactionRef,
        status: result.payment.status,
        amount: payment.amount,
      },
      ticket: {
        id: result.ticket.id,
        ticketNumber: result.ticket.ticketNumber,
        status: result.ticket.status,
        buyerEmail: result.ticket.buyerEmail,
        eventTitle: payment.event.title,
        tierName: payment.tier.name,
      },
      financials: {
        tierPrice,
        serviceFee,
        passFeeTobuyer,
        expectedBuyerPayment,
        organizerReceives: organizerAmount,
      },
      adminNotes,
    };
  }

  // Bulk verify all pending payments
  async verifyAllPendingPayments() {
    this.logger.log('Admin bulk verifying all pending payments');

    // Get all pending payments (no pagination, get them all)
    const pendingPayments = await this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Found ${pendingPayments.length} pending payments to verify`);

    const results = {
      total: pendingPayments.length,
      verified: 0,
      failed: 0,
      alreadyProcessed: 0,
      errors: [] as any[],
    };

    for (const payment of pendingPayments) {
      try {
        const transactionRef = payment.monnifyTransactionRef || payment.reference;

        // Verify with Monnify - pass both transaction ref and payment ref
        const monnifyData = await this.monnifyService.verifyTransaction(
          transactionRef,
          payment.reference,
        );

        if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
          // Import PaymentsService to process payment
          const { PaymentsService } = await import('../payments/payments.service');
          const { TicketsService } = await import('../tickets/tickets.service');
          const { LedgerService } = await import('../ledger/ledger.service');
          const { TasksService } = await import('../tasks/tasks.service');
          const { EmailService } = await import('../emails/email.service');
          const { QrService } = await import('../qr/qr.service');
          const { MediaService } = await import('../media/media.service');

          // Create service instances
          const mediaService = new MediaService(this.configService);
          const qrService = new QrService(mediaService);
          const emailService = new EmailService(this.configService);
          const ticketsService = new TicketsService(this.prisma, emailService, qrService);
          const ledgerService = new LedgerService(this.prisma);
          const tasksService = new TasksService(this.prisma);

          const paymentsService = new PaymentsService(
            this.prisma,
            this.configService,
            this.monnifyService,
            ticketsService,
            ledgerService,
            tasksService,
          );

          await (paymentsService as any).handleSuccessfulPayment({
            reference: payment.reference,
            amount: monnifyData.amount,
            id: monnifyData.transactionReference,
            paid_at: monnifyData.paidOn,
            customer: monnifyData.customer,
          });

          results.verified++;
          this.logger.log(`Verified payment: ${payment.reference}`);
        } else {
          results.failed++;
          results.errors.push({
            reference: payment.reference,
            status: monnifyData.status,
            message: `Payment not successful on Monnify: ${monnifyData.status}`,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          reference: payment.reference,
          error: error.message || 'Unknown error',
        });
        this.logger.error(`Failed to verify payment ${payment.reference}:`, error);
      }
    }

    this.logger.log(
      `Bulk verification complete: ${results.verified} verified, ${results.failed} failed`,
    );

    return {
      message: 'Bulk payment verification completed',
      ...results,
    };
  }

  // Debug payment verification - shows detailed API calls
  // Accepts: HD reference, Monnify reference (MNFY_...), payment ID, or buyer email
  async debugPaymentVerification(reference: string) {
    this.logger.log(`Debugging payment verification for: ${reference}`);

    try {
      // Try to find the payment by various identifiers
      let payment = await this.prisma.payment.findUnique({
        where: { reference },
        include: {
          event: { select: { title: true, passFeeTobuyer: true } },
          tier: { select: { name: true, price: true } },
        },
      });

      // Try by monnifyTransactionRef
      if (!payment) {
        payment = await this.prisma.payment.findFirst({
          where: { monnifyTransactionRef: reference },
          include: {
            event: { select: { title: true, passFeeTobuyer: true } },
            tier: { select: { name: true, price: true } },
          },
        });
      }

      // Try by ID
      if (!payment) {
        payment = await this.prisma.payment.findUnique({
          where: { id: reference },
          include: {
            event: { select: { title: true, passFeeTobuyer: true } },
            tier: { select: { name: true, price: true } },
          },
        });
      }

      // Try by buyer email (returns most recent)
      if (!payment && reference.includes('@')) {
        payment = await this.prisma.payment.findFirst({
          where: { buyerEmail: reference },
          orderBy: { createdAt: 'desc' },
          include: {
            event: { select: { title: true, passFeeTobuyer: true } },
            tier: { select: { name: true, price: true } },
          },
        });
      }

      if (!payment) {
        // Show recent payments to help admin find the right one
        const recentPayments = await this.prisma.payment.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reference: true,
            monnifyTransactionRef: true,
            buyerEmail: true,
            status: true,
            amount: true,
            createdAt: true,
          },
        });

        return {
          error: 'Payment not found in database',
          searchedReference: reference,
          searchedBy: [
            'reference',
            'monnifyTransactionRef',
            'id',
            reference.includes('@') ? 'buyerEmail' : null,
          ].filter(Boolean),
          recentPayments,
        };
      }

      // Calculate what the amounts should be
      const tierPrice = payment.tier?.price
        ? typeof payment.tier.price === 'object'
          ? Number(payment.tier.price)
          : payment.tier.price
        : 0;
      const passFeeTobuyer = (payment.event as any)?.passFeeTobuyer ?? false;
      const platformFeePercent = 5;
      const serviceFee = tierPrice * (platformFeePercent / 100);
      const expectedBuyerPayment = passFeeTobuyer ? tierPrice + serviceFee : tierPrice;

      const debug = {
        payment: {
          id: payment.id,
          reference: payment.reference,
          monnifyTransactionRef: payment.monnifyTransactionRef,
          storedAmount: payment.amount,
          status: payment.status,
          buyerEmail: payment.buyerEmail,
          eventTitle: payment.event?.title,
          tierName: payment.tier?.name,
          createdAt: payment.createdAt,
        },
        expectedAmounts: {
          tierPrice,
          serviceFee,
          passFeeTobuyer,
          expectedBuyerPayment,
          note: passFeeTobuyer
            ? `Buyer should pay ₦${expectedBuyerPayment} (tier ₦${tierPrice} + fee ₦${serviceFee})`
            : `Buyer should pay ₦${expectedBuyerPayment} (tier price only, fee deducted from organizer)`,
        },
        monnifyConfig: {
          baseUrl: this.configService.get<string>('MONNIFY_BASE_URL') || 'https://api.monnify.com',
          contractCode: this.configService.get<string>('MONNIFY_CONTRACT_CODE'),
          apiKeyConfigured: !!this.configService.get<string>('MONNIFY_API_KEY'),
          secretKeyConfigured: !!this.configService.get<string>('MONNIFY_SECRET_KEY'),
        },
        verificationAttempts: [] as any[],
      };

      // Try verifying with transaction ref
      const transactionRef = payment.monnifyTransactionRef || payment.reference;

      this.logger.log(`Attempting verification with transaction ref: ${transactionRef}`);

      try {
        const attempt1 = await this.attemptMonnifyVerification(transactionRef);
        debug.verificationAttempts.push({
          reference: transactionRef,
          referenceType: 'Monnify Transaction Reference',
          url: `${debug.monnifyConfig.baseUrl}/api/v2/transactions/${encodeURIComponent(transactionRef)}`,
          ...attempt1,
        });
      } catch (error: any) {
        debug.verificationAttempts.push({
          reference: transactionRef,
          referenceType: 'Monnify Transaction Reference',
          url: `${debug.monnifyConfig.baseUrl}/api/v2/transactions/${encodeURIComponent(transactionRef)}`,
          success: false,
          error: error.message,
          stack: error.stack,
        });
      }

      // Try with payment reference if different
      if (payment.reference !== transactionRef) {
        this.logger.log(`Attempting verification with payment ref: ${payment.reference}`);

        try {
          const attempt2 = await this.attemptMonnifyVerification(payment.reference);
          debug.verificationAttempts.push({
            reference: payment.reference,
            referenceType: 'Payment Reference',
            url: `${debug.monnifyConfig.baseUrl}/api/v2/transactions/${encodeURIComponent(payment.reference)}`,
            ...attempt2,
          });
        } catch (error: any) {
          debug.verificationAttempts.push({
            reference: payment.reference,
            referenceType: 'Payment Reference',
            url: `${debug.monnifyConfig.baseUrl}/api/v2/transactions/${encodeURIComponent(payment.reference)}`,
            success: false,
            error: error.message,
            stack: error.stack,
          });
        }
      }

      return {
        message: 'Debug information retrieved',
        ...debug,
      };
    } catch (error: any) {
      this.logger.error(`Debug failed:`, error);
      return {
        error: 'Debug failed',
        message: error.message,
        stack: error.stack,
      };
    }
  }

  private async attemptMonnifyVerification(reference: string) {
    const token = await this.monnifyService['getAccessToken']();
    const baseUrl = this.configService.get<string>('MONNIFY_BASE_URL') || 'https://api.monnify.com';

    const url = `${baseUrl}/api/v2/transactions/${encodeURIComponent(reference)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    return {
      success: response.ok && data.requestSuccessful,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      monnifyResponse: data,
    };
  }
}
