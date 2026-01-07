import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../emails/email.service';
import { QrService } from '../qr/qr.service';

interface CreateTicketData {
  eventId: string;
  tierId: string;
  buyerId: string;
  buyerEmail: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  paymentId: string;
  paystackRef: string;
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

    // Generate QR code
    const qrResult = await this.qrService.generateQrCode(ticketNumber);
    const qrCodeString = typeof qrResult === 'string' ? qrResult : qrResult.url || qrResult.code;

    // Create ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        qrCode: qrCodeString,
        qrCodeUrl: qrCodeString,
        status: 'ACTIVE',
        eventId: data.eventId,
        tierId: data.tierId,
        buyerId: data.buyerId,
        buyerEmail: data.buyerEmail,
        buyerFirstName: data.buyerFirstName,
        buyerLastName: data.buyerLastName,
        paymentId: data.paymentId,
        paystackRef: data.paystackRef,
        amountPaid: data.amountPaid,
      },
      include: {
        event: true,
        tier: true,
      },
    });

    // Send ticket email
    await this.emailService.sendTicketEmail(data.buyerEmail, {
      ticketNumber: ticket.ticketNumber,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startDate,
      eventLocation: ticket.event.location || 'TBA',
      tierName: ticket.tier.name,
      buyerName: `${data.buyerFirstName || ''} ${data.buyerLastName || ''}`.trim() || 'Guest',
      qrCodeUrl: ticket.qrCodeUrl || qrCodeString,
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
    return this.prisma.ticket.findMany({
      where: { buyerId },
      include: {
        event: {
          include: {
            organizer: { select: { id: true, title: true } },
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

  async checkInTicket(ticketNumber: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketNumber },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        success: false,
        message: 'Ticket already checked in',
        checkedInAt: ticket.checkedInAt,
      };
    }

    if (ticket.status !== 'ACTIVE') {
      return {
        success: false,
        message: `Ticket status is ${ticket.status}`,
      };
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
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
