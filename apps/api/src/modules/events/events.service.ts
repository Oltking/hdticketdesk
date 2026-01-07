import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

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

  async findBySlug(slug: string) {
    // Try to find by slug first, then by ID
    let event = await this.prisma.event.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        organizer: { select: { id: true, title: true } },
        tiers: true,
      },
    });

    if (!event) {
      event = await this.prisma.event.findFirst({
        where: { id: slug, status: 'PUBLISHED' },
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
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      include: {
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
    const slug = this.generateSlug(dto.title);

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        location: dto.location,
        isOnline: dto.isOnline || false,
        onlineLink: dto.onlineLink,
        coverImage: dto.coverImage,
        gallery: dto.gallery || [],
        slug,
        organizerId,
        status: 'DRAFT',
        tiers: {
          create: dto.tiers.map((tier) => ({
            name: tier.name,
            description: tier.description,
            price: tier.price,
            capacity: tier.capacity,
            sold: 0,
            refundEnabled: tier.refundEnabled || false,
          })),
        },
      },
      include: {
        tiers: true,
        organizer: { select: { id: true, title: true } },
      },
    });

    return event;
  }

  async update(id: string, organizerId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        location: dto.location,
        isOnline: dto.isOnline,
        onlineLink: dto.onlineLink,
        coverImage: dto.coverImage,
        gallery: dto.gallery,
      },
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
        organizer: { select: { id: true, title: true } },
      },
    });

    return published;
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

    const activeTickets = event.tickets.filter((t) =>
      ['ACTIVE', 'CHECKED_IN'].includes(t.status),
    );

    const totalSold = activeTickets.length;
    const checkedIn = event.tickets.filter(
      (t) => t.status === 'CHECKED_IN',
    ).length;

    // Handle Decimal type from Prisma
    const totalRevenue = activeTickets.reduce((sum, t) => {
      const amount = t.amountPaid instanceof Decimal 
        ? t.amountPaid.toNumber() 
        : Number(t.amountPaid);
      return sum + amount;
    }, 0);

    const tierBreakdown = event.tiers.map((tier) => {
      const tierTickets = activeTickets.filter((t) => t.tierId === tier.id);
      const tierRevenue = tierTickets.reduce((sum, t) => {
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
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.prisma.event.delete({ where: { id } });

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
