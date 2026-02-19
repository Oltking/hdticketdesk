import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MonnifyService } from '../payments/monnify.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private monnifyService: MonnifyService,
  ) {}

  // Homepage endpoints

  /**
   * Get carousel events for homepage
   */
  async getCarouselEvents() {
    const now = new Date();

    // First, try to get upcoming events
    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
      take: 6,
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
    });

    if (upcomingEvents.length > 0) {
      return this.addComputedFields(upcomingEvents);
    }

    // If no upcoming events, return recently ended events
    const recentlyEndedEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [{ endDate: { lt: now } }, { endDate: null, startDate: { lt: now } }],
      },
      orderBy: { startDate: 'desc' },
      take: 6,
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
    });

    return this.addComputedFields(recentlyEndedEvents);
  }

  /**
   * Get live events (currently happening)
   */
  async getLiveEvents() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Live events rules:
    // - If endDate is set: event is live from startDate until endDate
    // - If endDate is NOT set: event is live for only 24 hours from startDate
    const liveEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { lte: now },
        OR: [
          { endDate: { gte: now } },
          {
            endDate: null,
            startDate: {
              gte: twentyFourHoursAgo,
              lte: now,
            },
          },
        ],
      },
      orderBy: { startDate: 'asc' },
      take: 6,
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
    });

    return this.addComputedFields(liveEvents);
  }

  /**
   * Get trending events (most ticket sales in last 7 days)
   */
  async getTrendingEvents() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get events with tickets sold in last 7 days
    const eventsWithSales = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: new Date() },
        tickets: {
          some: {
            createdAt: { gte: sevenDaysAgo },
            status: { in: ['ACTIVE', 'CHECKED_IN'] },
          },
        },
      },
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        tickets: { _count: 'desc' },
      },
      take: 6,
    });

    if (eventsWithSales.length > 0) {
      return this.addComputedFields(eventsWithSales);
    }

    // Fallback: events with highest total sales
    const popularEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: new Date() },
      },
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
      orderBy: {
        tickets: { _count: 'desc' },
      },
      take: 6,
    });

    return this.addComputedFields(popularEvents);
  }

  /**
   * Get upcoming events (future events sorted by date)
   */
  async getUpcomingEvents(limit = 8) {
    const now = new Date();

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gt: now },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
    });

    return this.addComputedFields(upcomingEvents);
  }

  /**
   * Get featured events (promoted by organizers or admin)
   */
  async getFeaturedEvents() {
    const now = new Date();

    const featuredEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        isFeatured: true,
        startDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
      take: 3,
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
    });

    if (featuredEvents.length > 0) {
      return this.addComputedFields(featuredEvents);
    }

    // Fallback: newest upcoming events
    const randomEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
    });

    return this.addComputedFields(randomEvents);
  }

  // Standard CRUD

  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    filter?: string;
  }) {
    const { page, limit, search, sort, filter } = options;
    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: any = { status: 'PUBLISHED' };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter === 'live') {
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      where.startDate = { lte: now };
      where.OR = [
        { endDate: { gte: now } },
        {
          endDate: null,
          startDate: {
            gte: twentyFourHoursAgo,
            lte: now,
          },
        },
      ];
    } else if (filter === 'upcoming') {
      where.startDate = { gt: now };
    } else if (filter === 'featured') {
      where.isFeatured = true;
    } else if (filter === 'free') {
      where.tiers = { some: { price: 0 } };
    }

    // Build orderBy
    let orderBy: any = { startDate: 'asc' };
    if (sort === 'trending') {
      orderBy = { tickets: { _count: 'desc' } };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          organizer: { select: { id: true, title: true } },
          tiers: {
            select: {
              id: true,
              name: true,
              price: true,
              capacity: true,
              sold: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      events: this.addComputedFields(events),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySlug(slug: string, includeUnpublished = false) {
    // Build the where condition - include unpublished for organizer edit pages
    const statusCondition = includeUnpublished ? {} : { status: 'PUBLISHED' as const };

    // Try to find by slug first, then by ID
    let event = await this.prisma.event.findFirst({
      where: { slug, ...statusCondition },
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: true,
      },
    });

    if (!event) {
      event = await this.prisma.event.findFirst({
        where: { id: slug, ...statusCondition },
        include: {
          organizer: { select: { id: true, title: true } },
          tiers: true,
        },
      });
    }

    // If still not found and we're only looking at published, try including drafts
    if (!event && !includeUnpublished) {
      event = await this.prisma.event.findFirst({
        where: {
          OR: [{ slug }, { id: slug }],
        },
        include: {
          organizer: { select: { id: true, title: true } },
          tiers: true,
        },
      });
    }

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.addComputedFields([event])[0];
  }

  async findByOrganizer(organizerId: string) {
    // Return empty array if no organizerId provided
    if (!organizerId) {
      return [];
    }

    // Operational truth for organizer dashboards:
    // Earnings are calculated from what actually hit the platform account (successful Payment.amount)
    // so we never double-deduct when "buyer pays extra" is enabled.
    const platformFeePercent = 5;

    // Get organizer profile to access ledger entries
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      select: { id: true },
    });

    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
        tickets: {
          where: {
            status: { in: ['ACTIVE', 'CHECKED_IN'] },
            payment: { status: 'SUCCESS' },
          },
          select: { id: true, paymentId: true },
        },
        payments: {
          where: {
            status: 'SUCCESS',
            OR: [{ monnifyTransactionRef: { not: null } }, { amount: 0 }],
          },
          select: {
            id: true,
            amount: true,
            reference: true,
            monnifyTransactionRef: true,
          },
        },
      },
    });

    // Get all ledger entries for this organizer (for earnings calculation)
    const allLedgerEntries = organizerProfile ? await this.prisma.ledgerEntry.findMany({
      where: {
        organizerId,
        type: 'TICKET_SALE',
      },
      select: {
        id: true,
        type: true,
        credit: true,
        amount: true,
        ticketId: true,
        paymentId: true,
        monnifyTransactionRef: true,
      },
    }) : [];

    // Create a map of paymentId -> ledger entries for quick lookup
    const ledgerByPaymentId = new Map<string, typeof allLedgerEntries>();
    for (const le of allLedgerEntries) {
      if (le.paymentId) {
        if (!ledgerByPaymentId.has(le.paymentId)) {
          ledgerByPaymentId.set(le.paymentId, []);
        }
        ledgerByPaymentId.get(le.paymentId)!.push(le);
      }
    }

    return events.map((event: any) => {
      const processedTiers = event.tiers?.map((tier: any) => ({
        ...tier,
        price: tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price),
      }));

      // Organizer earnings calculation (ledger is source of truth)
      // The LEDGER is the source of truth for organizer earnings.
      // Each ledger entry (TICKET_SALE) already contains the correct organizer amount:
      //   - If passFeeTobuyer = true: organizer gets full tierPrice
      //   - If passFeeTobuyer = false: organizer gets tierPrice - 5%
      //
      // We also calculate grossRevenue (what buyers paid) for display purposes.
      // =============================================================================

      // De-dupe successful payments to get gross revenue (what buyers actually paid)
      const seenPayments = new Set<string>();
      let grossRevenue = 0;
      let netEarnings = 0;
      const seenLedger = new Set<string>();

      for (const p of (event.payments || [])) {
        const paymentKey = p.monnifyTransactionRef || p.reference;
        if (seenPayments.has(paymentKey)) continue;
        seenPayments.add(paymentKey);
        
        const paymentAmount = p.amount instanceof Decimal ? p.amount.toNumber() : Number(p.amount);
        grossRevenue += paymentAmount;

        // Get ledger entry for this payment (the source of truth for organizer earnings)
        const ledgerEntries = ledgerByPaymentId.get(p.id) || [];
        for (const le of ledgerEntries) {
          const ledgerKey = le.monnifyTransactionRef || le.ticketId || le.id;
          if (seenLedger.has(ledgerKey)) continue;
          seenLedger.add(ledgerKey);
          
          // Use credit field if available, fallback to amount
          const leAmount = le.credit instanceof Decimal 
            ? le.credit.toNumber() 
            : (le.amount instanceof Decimal ? le.amount.toNumber() : Number(le.credit || le.amount || 0));
          netEarnings += Math.abs(leAmount);
        }
      }

      // Platform fees = what platform earned = grossRevenue - netEarnings
      const platformFees = grossRevenue - netEarnings;

      return {
        ...event,
        tiers: processedTiers,
        // Replace tier.sold-based totals with payment-backed totals for organizer surfaces
        totalTicketsSold: seenPayments.size,
        grossRevenue,
        platformFees,
        netEarnings,
        platformFeePercent,
      };
    });
  }

  async create(organizerId: string, dto: CreateEventDto) {
    // Validate that organizerId is provided
    if (!organizerId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }

    // Verify the organizer profile exists
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizerProfile) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }

    const slug = this.generateSlug(dto.title);

    try {
      // Parse and validate dates (optional for drafts)
      let startDate: Date | null = null;
      if (dto.startDate && dto.startDate.trim() !== '') {
        startDate = new Date(dto.startDate);
        if (isNaN(startDate.getTime())) {
          throw new Error('Invalid start date format');
        }
      }

      let endDate: Date | null = null;
      if (dto.endDate && dto.endDate.trim() !== '') {
        endDate = new Date(dto.endDate);
        if (isNaN(endDate.getTime())) {
          throw new Error('Invalid end date format');
        }
      }

      // Prepare tiers data with proper date parsing (tiers are optional for drafts)
      const tiersData = (dto.tiers || []).map((tier) => {
        let saleEndDate = null;
        if (tier.saleEndDate && tier.saleEndDate.trim() !== '') {
          saleEndDate = new Date(tier.saleEndDate);
          if (isNaN(saleEndDate.getTime())) {
            this.logger.warn(`Invalid saleEndDate for tier ${tier.name}: ${tier.saleEndDate}`);
            saleEndDate = null;
          }
        }

        return {
          name: tier.name || '',
          description: tier.description || null,
          price: tier.price || 0,
          capacity: tier.capacity || 1,
          sold: 0,
          refundEnabled: tier.refundEnabled || false,
          saleEndDate,
        };
      });

      // Build event data - startDate is optional for drafts (validated on publish)
      // Type assertion needed until `prisma generate` is run with the updated schema
      const eventData: any = {
        title: dto.title,
        description: dto.description || '',
        startDate: startDate,
        endDate: endDate,
        location: dto.location || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        isLocationPublic: dto.isLocationPublic !== undefined ? dto.isLocationPublic : true,
        isOnline: dto.isOnline || false,
        onlineLink: dto.onlineLink || null,
        coverImage: dto.coverImage || null,
        gallery: dto.gallery || [],
        slug,
        organizerId,
        status: 'DRAFT',
        passFeeTobuyer: dto.passFeeTobuyer || false,
        hideTicketSalesProgress: dto.hideTicketSalesProgress || false,
      };

      // Only add tiers if there are any
      if (tiersData.length > 0) {
        eventData.tiers = { create: tiersData };
      }

      const event = await this.prisma.event.create({
        data: eventData,
        include: {
          tiers: true,
          organizer: { select: { id: true, title: true } },
        },
      });

      return event;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, organizerId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tiers: true,
        tickets: {
          where: { status: { in: ['ACTIVE', 'CHECKED_IN'] } },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only update your own events');
    }

    // Check if event has any active ticket sales
    const hasTicketSales = event.tickets.length > 0;

    // If there are sales, restrict what can be edited to avoid breaking promises to buyers.
    // Allowed after sales:
    // - Event dates (start/end)
    // - Marketing content (description/images)
    // - Tiers: capacity changes + adding new tiers
    // Not allowed:
    // - Changing price of an existing tier
    // - Removing existing tiers
    // - Changing location/online/core logistics
    // If there are sales and admin has NOT enabled override, restrict what can be edited
    const adminOverride = (event as any).allowEditAfterSales === true;
    if (hasTicketSales && !adminOverride) {
      const allowedKeys = new Set([
        'description',
        'coverImage',
        'gallery',
        'startDate',
        'endDate',
        'tiers',
        'hideTicketSalesProgress', // Safe to change after sales - only affects display
      ]);
      const providedKeys = Object.keys(dto as any).filter((k) => (dto as any)[k] !== undefined);
      const restricted = providedKeys.filter((k) => !allowedKeys.has(k));

      if (restricted.length > 0) {
        throw new ForbiddenException(
          `Event has ticket sales. You can only update: description, images, dates, and tier capacity/additions. Restricted: ${restricted.join(
            ', ',
          )}.`,
        );
      }
    }

    // Build update data, handling null/undefined correctly
    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);

    // Handle endDate - allow explicit null to clear the field
    if (dto.endDate === null) {
      updateData.endDate = null;
    } else if (dto.endDate !== undefined && dto.endDate !== '') {
      updateData.endDate = new Date(dto.endDate);
    }

    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.isLocationPublic !== undefined) updateData.isLocationPublic = dto.isLocationPublic;
    if (dto.isOnline !== undefined) updateData.isOnline = dto.isOnline;
    if (dto.onlineLink !== undefined) updateData.onlineLink = dto.onlineLink;
    if (dto.coverImage !== undefined) updateData.coverImage = dto.coverImage;
    if (dto.gallery !== undefined) updateData.gallery = dto.gallery;
    if (dto.passFeeTobuyer !== undefined) updateData.passFeeTobuyer = dto.passFeeTobuyer;
    if (dto.hideTicketSalesProgress !== undefined) updateData.hideTicketSalesProgress = dto.hideTicketSalesProgress;

    // Handle tier updates
    if (dto.tiers !== undefined && dto.tiers.length > 0) {
      if (hasTicketSales && !adminOverride) {
        // After sales without override:
        // - existing tiers: capacity can change, price must remain unchanged
        // - new tiers can be added
        // - existing tiers cannot be removed

        // Map existing tiers by id
        const existingById = new Map(event.tiers.map((t: any) => [t.id, t]));

        const providedExistingIds = (dto.tiers as any[])
          .filter((t) => t.id && typeof t.id === 'string' && t.id.length > 15)
          .map((t) => t.id);

        // Prevent removing tiers that already have sales; allow deleting tiers with zero sales
        const missing = event.tiers.filter((t: any) => !providedExistingIds.includes(t.id));
        const missingWithSales = missing.filter((t: any) => Number(t.sold || 0) > 0);
        if (missingWithSales.length > 0) {
          throw new ForbiddenException('Cannot remove tiers that already have sales.');
        }
        // Only delete tiers that truly have no ticket records to avoid FK issues
        const candidateDeleteIds = missing
          .filter((t: any) => Number(t.sold || 0) === 0)
          .map((t: any) => t.id);
        let safeDeleteIds: string[] = [];
        if (candidateDeleteIds.length > 0) {
          const counts = await Promise.all(
            candidateDeleteIds.map(async (id: string) => ({ id, count: await this.prisma.ticket.count({ where: { tierId: id } }) }))
          );
          safeDeleteIds = counts.filter((c) => c.count === 0).map((c) => c.id);
        }

        await this.prisma.$transaction(async (tx: any) => {
          // Delete tiers that have zero sales and zero tickets
          if (safeDeleteIds.length > 0) {
            await tx.ticketTier.deleteMany({ where: { id: { in: safeDeleteIds } } });
          }
          for (const tier of dto.tiers as any[]) {
            if (tier.id) {
              const existing = existingById.get(tier.id);
              if (!existing) {
                throw new ForbiddenException('Invalid tier id provided.');
              }

              const updateTierData: any = {};
              const existingPrice = existing.price instanceof Decimal ? existing.price.toNumber() : Number(existing.price);
              const existingSold = Number(existing.sold || 0);

              if (existingSold === 0) {
                // No sales on this tier: allow full edits (name, price, refund)
                if (tier.name !== undefined) updateTierData.name = tier.name;
                if (tier.price !== undefined) updateTierData.price = Number(tier.price);
                if (tier.refundEnabled !== undefined) updateTierData.refundEnabled = !!tier.refundEnabled;
              } else {
                // Has sales: disallow price/name/refund changes
                if (tier.price !== undefined && Number(tier.price) !== Number(existingPrice)) {
                  throw new ForbiddenException('Cannot change tier price after sales begin.');
                }
              }

              // Capacity and saleEndDate are always allowed to change
              if (tier.capacity !== undefined && Number(tier.capacity) !== Number(existing.capacity)) {
                updateTierData.capacity = Number(tier.capacity);
              }
              if (tier.saleEndDate !== undefined) {
                updateTierData.saleEndDate = tier.saleEndDate ? new Date(tier.saleEndDate) : null;
              }
              
              if (Object.keys(updateTierData).length > 0) {
                await tx.ticketTier.update({
                  where: { id: tier.id },
                  data: updateTierData,
                });
              }
            } else {
              // New tier: allow adding
              await tx.ticketTier.create({
                data: {
                  eventId: id,
                  name: tier.name,
                  description: tier.description || null,
                  price: Number(tier.price || 0),
                  capacity: Number(tier.capacity || 0),
                  sold: 0,
                  refundEnabled: tier.refundEnabled || false,
                  saleEndDate: tier.saleEndDate ? new Date(tier.saleEndDate) : null,
                },
              });
            }
          }

          // Update event core fields (allowed set enforced earlier)
          await tx.event.update({
            where: { id },
            data: updateData,
          });
        });

        // Return updated event with tiers
        const updated = await this.prisma.event.findUnique({
          where: { id },
          include: {
            tiers: true,
            organizer: { select: { id: true, title: true } },
          },
        });

        return updated;
      } else if (hasTicketSales && adminOverride) {
        // Admin override ON with sales: allow full tier edits and deletions
        const existingById = new Map(event.tiers.map((t: any) => [t.id, t]));
        const providedExistingIds = (dto.tiers as any[])
          .filter((t) => t.id && typeof t.id === 'string' && t.id.length > 15)
          .map((t) => t.id);
        const toDelete = event.tiers.filter((t: any) => !providedExistingIds.includes(t.id));
        const zeroSold = toDelete.filter((t: any) => Number(t.sold || 0) === 0);
        const nonDeletable = toDelete.filter((t: any) => Number(t.sold || 0) > 0);

        // Further restrict deletions to tiers with NO tickets and NO payments to avoid FK issues
        let safeDeleteIds: string[] = [];
        if (zeroSold.length > 0) {
          const checks = await Promise.all(
            zeroSold.map(async (t: any) => {
              const [ticketCount, paymentCount] = await Promise.all([
                this.prisma.ticket.count({ where: { tierId: t.id } }),
                this.prisma.payment.count({ where: { tierId: t.id } }),
              ]);
              return { id: t.id, ticketCount, paymentCount };
            })
          );
          safeDeleteIds = checks.filter(c => c.ticketCount === 0 && c.paymentCount === 0).map(c => c.id);
        }

        await this.prisma.$transaction(async (tx: any) => {
          // Only delete tiers that have zero sales and zero related records
          if (safeDeleteIds.length > 0) {
            await tx.ticketTier.deleteMany({ where: { id: { in: safeDeleteIds } } });
          }
          // Note: nonDeletable tiers and those with related records remain

          // Upsert remaining/provided tiers
          for (const tier of dto.tiers as any[]) {
            const baseData: any = {
              name: tier.name,
              description: tier.description || null,
              price: Number(tier.price || 0),
              capacity: Number(tier.capacity || 0),
              refundEnabled: !!tier.refundEnabled,
              saleEndDate: tier.saleEndDate ? new Date(tier.saleEndDate) : null,
            };

            if (tier.id) {
              // Update existing tier
              const exists = existingById.get(tier.id);
              if (!exists) {
                throw new NotFoundException('Tier not found for this event');
              }
              await tx.ticketTier.update({ where: { id: tier.id }, data: baseData });
            } else {
              // Create new tier
              await tx.ticketTier.create({ data: { ...baseData, eventId: id } });
            }
          }

          // Update event core fields
          await tx.event.update({ where: { id }, data: updateData });
        });

        const updated = await this.prisma.event.findUnique({
          where: { id },
          include: { tiers: true, organizer: { select: { id: true, title: true } } },
        });
        return updated;
      } else if (!hasTicketSales) { 
        // No ticket sales - safe to update/replace tiers entirely
        // Prepare tiers data with proper date parsing
        const tiersData = dto.tiers.map((tier) => {
          let saleEndDate = null;
          if (tier.saleEndDate && tier.saleEndDate.trim() !== '') {
            saleEndDate = new Date(tier.saleEndDate);
            if (isNaN(saleEndDate.getTime())) {
              this.logger.warn(`Invalid saleEndDate for tier ${tier.name}: ${tier.saleEndDate}`);
              saleEndDate = null;
            }
          }

          return {
            name: tier.name,
            description: tier.description || null,
            price: tier.price,
            capacity: tier.capacity,
            sold: 0,
            refundEnabled: tier.refundEnabled || false,
            saleEndDate,
          };
        });

        // Use a transaction to delete old tiers and create new ones
        const updated = await this.prisma.$transaction(async (tx: any) => {
          // Delete existing tiers
          await tx.ticketTier.deleteMany({
            where: { eventId: id },
          });

          // Update event with new tiers
          return tx.event.update({
            where: { id },
            data: {
              ...updateData,
              tiers: {
                create: tiersData,
              },
            },
            include: {
              tiers: true,
              organizer: { select: { id: true, title: true } },
            },
          });
        });

        return updated;
      }
    }

    // Update without tier changes (either no tiers provided or has ticket sales)
    const updated = await this.prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        tiers: true,
        organizer: { select: { id: true, title: true } },
      },
    });

    return updated;
  }

  async publish(id: string, organizerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { tiers: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only publish your own events');
    }

    // Validate required fields for publishing
    if (!event.description || event.description.trim().length < 10) {
      throw new ForbiddenException('Event description must be at least 10 characters to publish');
    }

    if (!event.startDate) {
      throw new ForbiddenException('Event must have a start date to publish');
    }

    if (event.tiers.length === 0) {
      throw new ForbiddenException('Event must have at least one ticket tier to publish');
    }

    // Validate all tiers have required fields
    for (const tier of event.tiers) {
      if (!tier.name || tier.name.trim() === '') {
        throw new ForbiddenException('All ticket tiers must have a name to publish');
      }
    }

    const published = await this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        tiers: true,
        organizer: {
          include: {
            user: {
              select: { email: true },
            },
            virtualAccount: true,
          },
        },
      },
    });

    // Create virtual account for organizer if they don't have one yet
    // This happens on first event publish
    if (!published.organizer.virtualAccount) {
      try {
        this.logger.log(`Creating virtual account for organizer ${published.organizer.id}`);

        const vaResponse = await this.monnifyService.createVirtualAccount(
          published.organizer.id,
          published.organizer.title || 'Organizer',
          published.organizer.user?.email || '',
        );

        // Save virtual account to database
        await this.prisma.virtualAccount.create({
          data: {
            accountNumber: vaResponse.accountNumber,
            accountName: vaResponse.accountName,
            bankName: vaResponse.bankName,
            bankCode: vaResponse.bankCode,
            accountReference: vaResponse.accountReference,
            monnifyContractCode: this.monnifyService['contractCode'],
            organizerId: published.organizer.id,
          },
        });

        this.logger.log(`Virtual account created: ${vaResponse.accountNumber}`);
      } catch (error) {
        // Log but don't fail the publish - VA can be created later
        this.logger.error(
          `Failed to create virtual account for organizer ${published.organizer.id}:`,
          error,
        );
      }
    }

    return published;
  }

  async unpublish(id: string, organizerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tiers: true,
        tickets: {
          where: {
            status: { in: ['ACTIVE', 'CHECKED_IN'] },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only unpublish your own events');
    }

    if (event.status !== 'PUBLISHED') {
      throw new ForbiddenException('Event is not published');
    }

    // Check if there are any sales
    if (event.tickets.length > 0) {
      throw new ForbiddenException(
        'Cannot unpublish event with ticket sales. Please contact support at support@hdticketdesk.com for assistance.',
      );
    }

    const unpublished = await this.prisma.event.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: {
        tiers: true,
        organizer: { select: { id: true, title: true } },
      },
    });

    return unpublished;
  }

  async getAnalytics(id: string, organizerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tiers: true,
        tickets: {
          select: {
            id: true,
            status: true,
            tierId: true,
            checkedInAt: true,
            createdAt: true,
            payment: { select: { status: true, amount: true, reference: true, monnifyTransactionRef: true } },
            tier: { select: { price: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view analytics for your own events');
    }

    const activeTickets = event.tickets.filter((t: any) =>
      ['ACTIVE', 'CHECKED_IN'].includes(t.status) && (t.payment?.status || '').toUpperCase() === 'SUCCESS',
    );

    const totalSold = activeTickets.length;
    const checkedIn = event.tickets.filter(
      (t: { status: string }) => t.status === 'CHECKED_IN',
    ).length;

    // Analytics: compute gross revenue and organizer net using the ledger.
    const platformFeePercent = 5;

    // Get ledger entries for this event's tickets
    const ticketIds = activeTickets.map((t: any) => t.id);
    const ledgerEntries = ticketIds.length > 0 ? await this.prisma.ledgerEntry.findMany({
      where: {
        ticketId: { in: ticketIds },
        type: 'TICKET_SALE',
      },
      select: {
        id: true,
        ticketId: true,
        credit: true,
        amount: true,
        monnifyTransactionRef: true,
      },
    }) : [];

    // Create ticketId -> ledger entry map
    const ledgerByTicketId = new Map<string, typeof ledgerEntries[0]>();
    for (const le of ledgerEntries) {
      if (le.ticketId && !ledgerByTicketId.has(le.ticketId)) {
        ledgerByTicketId.set(le.ticketId, le);
      }
    }

    // Calculate gross revenue (what buyers paid) and organizer net (from ledger)
    const seenPayments = new Set<string>();
    let grossRevenue = 0;
    let organizerNet = 0;

    for (const t of activeTickets as any[]) {
      const paymentKey = t.payment?.monnifyTransactionRef || t.payment?.reference || t.id;
      if (seenPayments.has(paymentKey)) continue;
      seenPayments.add(paymentKey);

      // Gross revenue: use payment amount, fallback to tier price if payment amount is missing
      let paymentAmount = 0;
      if (t.payment?.amount !== undefined && t.payment?.amount !== null) {
        paymentAmount = t.payment.amount instanceof Decimal
          ? t.payment.amount.toNumber()
          : Number(t.payment.amount);
      } else if (t.tier?.price !== undefined && t.tier?.price !== null) {
        // Fallback to tier price if payment amount not available
        paymentAmount = t.tier.price instanceof Decimal
          ? t.tier.price.toNumber()
          : Number(t.tier.price);
      }
      grossRevenue += paymentAmount;

      // Organizer net from ledger (source of truth), with fallback
      const ledgerEntry = ledgerByTicketId.get(t.id);
      if (ledgerEntry) {
        const leAmount = ledgerEntry.credit instanceof Decimal
          ? ledgerEntry.credit.toNumber()
          : (ledgerEntry.amount instanceof Decimal 
              ? ledgerEntry.amount.toNumber() 
              : Number(ledgerEntry.credit || ledgerEntry.amount || 0));
        organizerNet += Math.abs(leAmount);
      } else {
        // Fallback: if no ledger entry, estimate organizer net (tier price minus 5% fee)
        organizerNet += paymentAmount * 0.95;
      }
    }

    // Platform fees = grossRevenue - organizerNet
    const platformFees = grossRevenue - organizerNet;

    // Tier breakdown with ledger-based earnings
    const tierBreakdown = event.tiers.map(
      (tier: { id: string; name: string; price: Decimal | number; capacity: number }) => {
        const tierTickets = (activeTickets as any[]).filter((t: { tierId: string }) => t.tierId === tier.id);
        const tierPrice = tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price);
        
        const seenTierPayments = new Set<string>();
        let tierGrossRevenue = 0;
        let tierOrganizerNet = 0;

        for (const t of tierTickets) {
          const paymentKey = t.payment?.monnifyTransactionRef || t.payment?.reference || t.id;
          if (seenTierPayments.has(paymentKey)) continue;
          seenTierPayments.add(paymentKey);

          // Gross revenue: use payment amount, fallback to tier price if payment amount is missing
          let paymentAmount = 0;
          if (t.payment?.amount !== undefined && t.payment?.amount !== null) {
            paymentAmount = t.payment.amount instanceof Decimal
              ? t.payment.amount.toNumber()
              : Number(t.payment.amount);
          } else if (t.tier?.price !== undefined && t.tier?.price !== null) {
            // Fallback to tier price if payment amount not available
            paymentAmount = t.tier.price instanceof Decimal
              ? t.tier.price.toNumber()
              : Number(t.tier.price);
          }
          tierGrossRevenue += paymentAmount;

          // Organizer net from ledger, fallback to calculated value
          const ledgerEntry = ledgerByTicketId.get(t.id);
          if (ledgerEntry) {
            const leAmount = ledgerEntry.credit instanceof Decimal
              ? ledgerEntry.credit.toNumber()
              : (ledgerEntry.amount instanceof Decimal 
                  ? ledgerEntry.amount.toNumber() 
                  : Number(ledgerEntry.credit || ledgerEntry.amount || 0));
            tierOrganizerNet += Math.abs(leAmount);
          } else {
            // Fallback: if no ledger entry, estimate organizer net (tier price minus 5% fee)
            tierOrganizerNet += paymentAmount * 0.95;
          }
        }

        const tierPlatformFees = tierGrossRevenue - tierOrganizerNet;

        return {
          name: tier.name,
          price: tierPrice || 0,
          capacity: tier.capacity || 0,
          sold: tierTickets.length,
          revenue: tierGrossRevenue || 0,
          grossRevenue: tierGrossRevenue || 0,
          platformFees: tierPlatformFees || 0,
          organizerNet: tierOrganizerNet || 0,
        };
      },
    );

    return {
      totalSold,
      checkedIn,
      checkInRate: totalSold > 0 ? Math.round((checkedIn / totalSold) * 100) : 0,
      grossRevenue,
      platformFees,
      organizerNet,
      platformFeePercent,
      tierBreakdown,
    };
  }

  async remove(id: string, organizerId: string) {
    // Fetch event with ALL related tickets and payments (not just active ones)
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tickets: true, // Get ALL tickets regardless of status
        payments: true, // Get ALL payments regardless of status
        tiers: true, // Get tiers for deletion
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    // Only allow deleting draft events
    if (event.status !== 'DRAFT') {
      throw new ForbiddenException(
        'Only draft events can be deleted. Please unpublish the event first, or contact support if there are ticket sales.',
      );
    }

    // Check for ANY tickets (regardless of status) - preserves financial records integrity
    if (event.tickets.length > 0) {
      throw new ForbiddenException(
        'Cannot delete event with ticket records. Please contact support at support@hdticketdesk.com for assistance.',
      );
    }

    // Check for ANY payments (regardless of status) - preserves financial records integrity
    if (event.payments.length > 0) {
      throw new ForbiddenException(
        'Cannot delete event with payment records. Please contact support at support@hdticketdesk.com for assistance.',
      );
    }

    // Use transaction to safely delete event and related tiers
    // TicketTiers have onDelete: Cascade, so they'll be deleted automatically
    await this.prisma.$transaction(async (tx: any) => {
      // Delete the event (tiers cascade automatically due to schema)
      await tx.event.delete({ where: { id } });
    });

    return { message: 'Event deleted successfully' };
  }

  // Helpers

  private addComputedFields(events: any[]) {
    return events.map((event) => {
      const totalTicketsSold =
        event.tiers?.reduce((sum: number, tier: any) => sum + (tier.sold || 0), 0) || 0;

      const totalRevenue =
        event.tiers?.reduce((sum: number, tier: any) => {
          const price = tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price);
          return sum + (tier.sold || 0) * price;
        }, 0) || 0;

      // Convert Decimal fields to numbers for JSON serialization
      const processedTiers = event.tiers?.map((tier: any) => ({
        ...tier,
        price: tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price),
      }));

      return {
        ...event,
        tiers: processedTiers,
        totalTicketsSold,
        totalRevenue,
      };
    });
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();

    const uniqueId = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${uniqueId}`;
  }
}
