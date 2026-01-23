import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../emails/email.service';
import { QrService } from '../qr/qr.service';

interface CreateTicketData {
  eventId: string;
  tierId: string;
  buyerId: string | null;  // Nullable for guest checkouts
  buyerEmail: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  paymentId: string;
  paymentRef: string;
  amountPaid: number;
}

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private qrService: QrService,
  ) {}

  async createTicket(data: CreateTicketData) {
    // Generate ticket number
    const ticketNumber = this.generateTicketNumber();

    // Generate QR code - returns { code: string, url: string, hostedUrl: string }
    const qrResult = await this.qrService.generateQrCode(ticketNumber);
    // Store the actual code value (what gets encoded in the QR) in qrCode field for validation
    // Store the hosted URL (Cloudinary) in qrCodeUrl for display/email (email clients don't support data URLs)
    const qrCode = qrResult.code;
    const qrCodeUrl = qrResult.hostedUrl; // Use hosted URL for email compatibility

    // Create ticket - buyerId is optional for guest checkouts
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        qrCode: qrCode,       // The actual scannable code value
        qrCodeUrl: qrCodeUrl, // The hosted Cloudinary URL
        status: 'ACTIVE',
        eventId: data.eventId,
        tierId: data.tierId,
        ...(data.buyerId && { buyerId: data.buyerId }), // Only include if not null
        buyerEmail: data.buyerEmail,
        buyerFirstName: data.buyerFirstName,
        buyerLastName: data.buyerLastName,
        paymentId: data.paymentId,
        paymentRef: data.paymentRef,
        amountPaid: data.amountPaid,
      },
      include: {
        event: {
          include: {
            tiers: true, // Include all tiers to calculate color ranking
          },
        },
        tier: true,
      },
    });

    // Get all tier prices for color ranking
    const allTierPrices = ticket.event.tiers.map((t: any) =>
      typeof t.price === 'number' ? t.price : Number(t.price)
    );

    const currentTierPrice = typeof ticket.tier.price === 'number'
      ? ticket.tier.price
      : Number(ticket.tier.price);

    // Send ticket email with hosted QR code URL (works in all email clients)
    await this.emailService.sendTicketEmail(data.buyerEmail, {
      ticketNumber: ticket.ticketNumber,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startDate,
      eventLocation: ticket.event.location || 'TBA',
      eventLatitude: ticket.event.latitude,
      eventLongitude: ticket.event.longitude,
      tierName: ticket.tier.name,
      tierPrice: currentTierPrice,
      allTierPrices: allTierPrices, // Pass all prices for color ranking
      buyerName: `${data.buyerFirstName || ''} ${data.buyerLastName || ''}`.trim() || 'Guest',
      qrCodeUrl: qrCodeUrl, // Use the hosted Cloudinary URL for email
      isOnline: ticket.event.isOnline,
      onlineLink: ticket.event.onlineLink || undefined,
    });

    return ticket;
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Get ticket by ID with authorization check
   * - Buyers can only view their own tickets
   * - Organizers can view tickets for their events
   * - Admins can view any ticket
   */
  async getTicketByIdWithAuth(id: string, userId: string, role: string, organizerId?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Admin can view any ticket
    if (role === 'ADMIN') {
      return ticket;
    }

    // Organizer can view tickets for their events
    if (role === 'ORGANIZER' && organizerId && ticket.event.organizerId === organizerId) {
      return ticket;
    }

    // Buyer can only view their own tickets
    if (ticket.buyerId === userId) {
      return ticket;
    }

    throw new ForbiddenException('You do not have permission to view this ticket');
  }

  async getTicketByNumber(ticketNumber: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async getTicketsByBuyer(buyerId: string) {
    // Get user email to also fetch any guest tickets
    const user = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { email: true },
    });

    if (!user) {
      return [];
    }

    // Fetch tickets that either:
    // 1. Have buyerId matching the user (normal tickets)
    // 2. Have matching email but null buyerId (guest tickets not yet linked)
    return this.prisma.ticket.findMany({
      where: {
        OR: [
          { buyerId: buyerId },
          {
            buyerEmail: user.email.toLowerCase(),
            buyerId: null,
          },
        ],
      },
      include: {
        event: {
          include: {
            organizer: { select: { id: true, title: true } },
            tiers: true, // Include tiers for color ranking calculation
          },
        },
        tier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Alias for controller compatibility
  async getBuyerTickets(buyerId: string) {
    return this.getTicketsByBuyer(buyerId);
  }

  async getTicketsByEvent(eventId: string) {
    return this.prisma.ticket.findMany({
      where: { eventId },
      include: {
        tier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Alias for controller compatibility
  async getEventTickets(eventId: string, organizerId?: string) {
    // Verify organizer owns this event
    if (organizerId) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      if (event.organizerId !== organizerId) {
        throw new ForbiddenException('You can only view tickets for your own events');
      }
    }

    return this.getTicketsByEvent(eventId);
  }

  async checkInTicket(ticketNumber: string, checkedInBy?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        success: false,
        message: 'Ticket already checked in',
        checkedInAt: ticket.checkedInAt,
        ticket,
      };
    }

    if (ticket.status !== 'ACTIVE') {
      return {
        success: false,
        message: `Cannot check in ticket with status: ${ticket.status}`,
        ticket,
      };
    }

    // Validate event timing - allow check-in starting 5 hours before event
    const now = new Date();
    const eventStart = new Date(ticket.event.startDate);
    const fiveHoursBefore = new Date(eventStart.getTime() - 5 * 60 * 60 * 1000);
    
    if (now < fiveHoursBefore) {
      return {
        success: false,
        message: `Check-in opens 5 hours before event start (${eventStart.toLocaleString()})`,
        ticket,
      };
    }

    // Check if event has ended (allow 24 hour grace period for late check-ins)
    const eventEnd = ticket.event.endDate ? new Date(ticket.event.endDate) : eventStart;
    const gracePeriodEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    
    if (now > gracePeriodEnd) {
      return {
        success: false,
        message: 'Event has ended. Check-in is no longer available.',
        ticket,
      };
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        checkedInBy: checkedInBy || null,
      },
      include: {
        event: true,
        tier: true,
      },
    });

    return {
      success: true,
      message: 'Ticket checked in successfully',
      ticket: updated,
    };
  }

  // Alias for controller - check in by ticket ID and user
  async checkIn(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify user is the organizer
    const organizer = await this.prisma.organizerProfile.findFirst({
      where: { userId },
    });

    if (!organizer || ticket.event.organizerId !== organizer.id) {
      throw new ForbiddenException('You can only check in tickets for your own events');
    }

    return this.checkInTicket(ticket.ticketNumber);
  }

  async validateQr(qrCode: string, eventId: string) {
    // Find ticket by QR code or ticket number
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          { qrCode },
          { ticketNumber: qrCode },
        ],
        eventId,
      },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      return {
        valid: false,
        message: 'Invalid QR code or ticket not found for this event',
      };
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        valid: false,
        message: 'Ticket already checked in',
        checkedInAt: ticket.checkedInAt,
        ticket,
      };
    }

    if (ticket.status !== 'ACTIVE') {
      return {
        valid: false,
        message: `Ticket status is ${ticket.status}`,
        ticket,
      };
    }

    return {
      valid: true,
      message: 'Valid ticket',
      ticket,
    };
  }

  private generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HD-${timestamp}-${random}`;
  }
}
