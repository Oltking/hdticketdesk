import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
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

  // ==================== HOMEPAGE ENDPOINTS ====================

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
        OR: [
          { endDate: { lt: now } },
          { endDate: null, startDate: { lt: now } },
        ],
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
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const liveEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { lte: now },
        OR: [
          { endDate: { gte: now } },
          { endDate: null, startDate: { gte: startOfDay } },
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

  // ==================== STANDARD CRUD ====================

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
      where.startDate = { lte: now };
      where.OR = [{ endDate: { gte: now } }, { endDate: null }];
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
    const statusCondition = includeUnpublished 
      ? {} 
      : { status: 'PUBLISHED' as const };

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
          OR: [{ slug }, { id: slug }]
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
        _count: { select: { tickets: true } },
      },
    });

    return this.addComputedFields(events);
  }

  async create(organizerId: string, dto: CreateEventDto) {
    // Validate that organizerId is provided
    if (!organizerId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.'
      );
    }

    // Verify the organizer profile exists
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizerProfile) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.'
      );
    }

    const slug = this.generateSlug(dto.title);

    try {
      // Parse and validate dates
      const startDate = new Date(dto.startDate);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date format');
      }

      const endDate = dto.endDate ? new Date(dto.endDate) : null;
      if (endDate && isNaN(endDate.getTime())) {
        throw new Error('Invalid end date format');
      }

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

      const event = await this.prisma.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          startDate,
          endDate,
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
          tiers: {
            create: tiersData,
          },
        },
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

    // Handle tier updates - only if tiers are provided and event has no sales
    if (dto.tiers !== undefined && dto.tiers.length > 0) {
      if (hasTicketSales) {
        // If there are ticket sales, only allow updating tier descriptions (not price/capacity)
        // For safety, we'll skip tier updates entirely if there are sales
        // Organizers should contact support for tier changes after sales begin
      } else {
        // No ticket sales - safe to update/replace tiers
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
        const updated = await this.prisma.$transaction(async (tx) => {
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

    if (event.tiers.length === 0) {
      throw new ForbiddenException('Event must have at least one ticket tier');
    }

    const published = await this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        tiers: true,
        organizer: { 
          select: { id: true, title: true, userId: true },
          include: { user: { select: { email: true } }, virtualAccount: true },
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
        this.logger.error(`Failed to create virtual account for organizer ${published.organizer.id}:`, error);
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
        'Cannot unpublish event with ticket sales. Please contact support at support@hdticketdesk.com for assistance.'
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
            amountPaid: true,
            tierId: true,
            checkedInAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You can only view analytics for your own events',
      );
    }

    const activeTickets = event.tickets.filter((t: { status: string }) =>
      ['ACTIVE', 'CHECKED_IN'].includes(t.status),
    );

    const totalSold = activeTickets.length;
    const checkedIn = event.tickets.filter(
      (t: { status: string }) => t.status === 'CHECKED_IN',
    ).length;

    // Handle Decimal type from Prisma
    const totalRevenue = activeTickets.reduce((sum: number, t: { amountPaid: Decimal | number }) => {
      const amount = t.amountPaid instanceof Decimal 
        ? t.amountPaid.toNumber() 
        : Number(t.amountPaid);
      return sum + amount;
    }, 0);

    const tierBreakdown = event.tiers.map((tier: { id: string; name: string; price: Decimal | number; capacity: number }) => {
      const tierTickets = activeTickets.filter((t: { tierId: string }) => t.tierId === tier.id);
      const tierRevenue = tierTickets.reduce((sum: number, t: { amountPaid: Decimal | number }) => {
        const amount = t.amountPaid instanceof Decimal 
          ? t.amountPaid.toNumber() 
          : Number(t.amountPaid);
        return sum + amount;
      }, 0);

      return {
        name: tier.name,
        price: tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price),
        capacity: tier.capacity,
        sold: tierTickets.length,
        revenue: tierRevenue,
      };
    });

    return {
      totalSold,
      checkedIn,
      checkInRate: totalSold > 0 ? Math.round((checkedIn / totalSold) * 100) : 0,
      totalRevenue,
      tierBreakdown,
    };
  }

  async remove(id: string, organizerId: string) {
    // Fetch event with ALL related tickets and payments (not just active ones)
    const event = await this.prisma.event.findUnique({ 
      where: { id },
      include: {
        tickets: true,  // Get ALL tickets regardless of status
        payments: true, // Get ALL payments regardless of status
        tiers: true,    // Get tiers for deletion
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
        'Only draft events can be deleted. Please unpublish the event first, or contact support if there are ticket sales.'
      );
    }

    // Check for ANY tickets (regardless of status) - preserves financial records integrity
    if (event.tickets.length > 0) {
      throw new ForbiddenException(
        'Cannot delete event with ticket records. Please contact support at support@hdticketdesk.com for assistance.'
      );
    }

    // Check for ANY payments (regardless of status) - preserves financial records integrity
    if (event.payments.length > 0) {
      throw new ForbiddenException(
        'Cannot delete event with payment records. Please contact support at support@hdticketdesk.com for assistance.'
      );
    }

    // Use transaction to safely delete event and related tiers
    // TicketTiers have onDelete: Cascade, so they'll be deleted automatically
    await this.prisma.$transaction(async (tx) => {
      // Delete the event (tiers cascade automatically due to schema)
      await tx.event.delete({ where: { id } });
    });

    return { message: 'Event deleted successfully' };
  }

  // ==================== HELPERS ====================

  private addComputedFields(events: any[]) {
    return events.map((event) => {
      const totalTicketsSold =
        event.tiers?.reduce(
          (sum: number, tier: any) => sum + (tier.sold || 0),
          0,
        ) || 0;

      const totalRevenue =
        event.tiers?.reduce((sum: number, tier: any) => {
          const price = tier.price instanceof Decimal 
            ? tier.price.toNumber() 
            : Number(tier.price);
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
