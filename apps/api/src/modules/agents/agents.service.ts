import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a secure 9-character access code
   * Uses uppercase letters and numbers for easy reading/typing
   */
  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 to avoid confusion
    let code = '';
    const randomBytes = crypto.randomBytes(9);
    for (let i = 0; i < 9; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Create a new agent access code for an event
   * Only organizers can create codes for their events
   */
  async createAccessCode(eventId: string, organizerId: string, label?: string) {
    // Verify the event exists and belongs to the organizer
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true, title: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only create agent codes for your own events');
    }

    // Generate a unique code (retry if collision)
    let code: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      code = this.generateAccessCode();
      const existing = await this.prisma.agentAccessCode.findUnique({
        where: { code },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new BadRequestException('Failed to generate unique code. Please try again.');
    }

    const agentCode = await this.prisma.agentAccessCode.create({
      data: {
        code,
        label,
        eventId,
      },
      include: {
        event: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    this.logger.log(`Created agent access code ${code} for event ${event.title}`);

    return agentCode;
  }

  /**
   * Get all agent access codes for an event
   */
  async getEventAgentCodes(eventId: string, organizerId: string) {
    // Verify the event exists and belongs to the organizer
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only view agent codes for your own events');
    }

    return this.prisma.agentAccessCode.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deactivate an agent access code
   */
  async deactivateCode(codeId: string, organizerId: string) {
    const agentCode = await this.prisma.agentAccessCode.findUnique({
      where: { id: codeId },
      include: {
        event: { select: { organizerId: true } },
      },
    });

    if (!agentCode) {
      throw new NotFoundException('Agent code not found');
    }

    if (agentCode.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only deactivate agent codes for your own events');
    }

    return this.prisma.agentAccessCode.update({
      where: { id: codeId },
      data: { isActive: false },
    });
  }

  /**
   * Reactivate an agent access code
   */
  async reactivateCode(codeId: string, organizerId: string) {
    const agentCode = await this.prisma.agentAccessCode.findUnique({
      where: { id: codeId },
      include: {
        event: { select: { organizerId: true } },
      },
    });

    if (!agentCode) {
      throw new NotFoundException('Agent code not found');
    }

    if (agentCode.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only reactivate agent codes for your own events');
    }

    return this.prisma.agentAccessCode.update({
      where: { id: codeId },
      data: { isActive: true },
    });
  }

  /**
   * Delete an agent access code
   */
  async deleteCode(codeId: string, organizerId: string) {
    const agentCode = await this.prisma.agentAccessCode.findUnique({
      where: { id: codeId },
      include: {
        event: { select: { organizerId: true } },
      },
    });

    if (!agentCode) {
      throw new NotFoundException('Agent code not found');
    }

    if (agentCode.event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only delete agent codes for your own events');
    }

    await this.prisma.agentAccessCode.delete({
      where: { id: codeId },
    });

    return { message: 'Agent code deleted successfully' };
  }

  /**
   * Activate/verify an agent access code (public endpoint for agents)
   * Returns event details if the code is valid
   */
  async activateCode(code: string) {
    const agentCode = await this.prisma.agentAccessCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            location: true,
            coverImage: true,
            status: true,
          },
        },
      },
    });

    if (!agentCode) {
      throw new NotFoundException('Invalid access code');
    }

    if (!agentCode.isActive) {
      throw new ForbiddenException('This access code has been deactivated');
    }

    // Update activation timestamp if first use
    const updateData: any = {
      lastUsedAt: new Date(),
    };

    if (!agentCode.activatedAt) {
      updateData.activatedAt = new Date();
    }

    await this.prisma.agentAccessCode.update({
      where: { id: agentCode.id },
      data: updateData,
    });

    return {
      valid: true,
      event: agentCode.event,
      label: agentCode.label,
      checkInCount: agentCode.checkInCount,
    };
  }

  /**
   * Check in a ticket using an agent access code
   * 
   * IMPORTANT: This method uses atomic database operations to prevent:
   * 1. Race conditions (two agents checking in the same ticket simultaneously)
   * 2. Duplicate check-ins
   * 3. Invalid state transitions
   */
  async agentCheckIn(qrCode: string, accessCode: string) {
    // Validate input early
    const sanitizedQrCode = qrCode?.trim();
    if (!sanitizedQrCode || sanitizedQrCode.length > 100) {
      return {
        success: false,
        message: 'Invalid QR code format',
      };
    }

    // Validate the access code
    const agentCode = await this.prisma.agentAccessCode.findUnique({
      where: { code: accessCode.toUpperCase() },
      include: {
        event: {
          select: { id: true, title: true, startDate: true, endDate: true },
        },
      },
    });

    if (!agentCode) {
      throw new NotFoundException('Invalid access code');
    }

    if (!agentCode.isActive) {
      throw new ForbiddenException('This access code has been deactivated');
    }

    const eventId = agentCode.eventId;
    const agentLabel = agentCode.label || `Agent-${accessCode.substring(0, 4)}`;

    // Validate event timing BEFORE hitting the database for ticket
    const now = new Date();
    // startDate can be null for draft events, but agents can only access published events with valid dates
    const eventStart = new Date(agentCode.event.startDate!);
    const fiveHoursBefore = new Date(eventStart.getTime() - 5 * 60 * 60 * 1000);

    if (now < fiveHoursBefore) {
      return {
        success: false,
        message: `Check-in opens 5 hours before event start (${eventStart.toLocaleString()})`,
      };
    }

    // Check if event has ended (allow 24 hour grace period)
    const eventEnd = agentCode.event.endDate
      ? new Date(agentCode.event.endDate)
      : eventStart;
    const gracePeriodEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);

    if (now > gracePeriodEnd) {
      return {
        success: false,
        message: 'Event has ended. Check-in is no longer available.',
      };
    }

    // Use a transaction with ATOMIC updateMany to prevent race conditions
    // This ensures only ONE request can successfully check in a ticket
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // First, find the ticket
        const ticket = await tx.ticket.findFirst({
          where: {
            OR: [{ qrCode: sanitizedQrCode }, { ticketNumber: sanitizedQrCode }],
            eventId,
          },
          include: {
            tier: true,
          },
        });

        if (!ticket) {
          return {
            success: false,
            message: 'Invalid QR code or ticket not found for this event',
          };
        }

        // Check current status
        if (ticket.status === 'CHECKED_IN') {
          return {
            success: false,
            message: 'Ticket already checked in',
            checkedInAt: ticket.checkedInAt,
            checkedInBy: ticket.checkedInBy,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              tierName: ticket.tier.name,
              buyerName: `${ticket.buyerFirstName || ''} ${ticket.buyerLastName || ''}`.trim() || 'Guest',
            },
          };
        }

        if (ticket.status !== 'ACTIVE') {
          return {
            success: false,
            message: `Cannot check in ticket with status: ${ticket.status}`,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              status: ticket.status,
            },
          };
        }

        // ATOMIC CHECK-IN: Only update if status is still ACTIVE
        // This prevents race conditions - if another request already changed the status,
        // this updateMany will affect 0 rows
        const checkInTime = new Date();
        const updateResult = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: 'ACTIVE', // CRITICAL: Only update if still ACTIVE
          },
          data: {
            status: 'CHECKED_IN',
            checkedInAt: checkInTime,
            checkedInBy: agentLabel,
          },
        });

        // If no rows were updated, another request already checked in this ticket
        if (updateResult.count === 0) {
          // Re-fetch to get the actual current state
          const currentTicket = await tx.ticket.findUnique({
            where: { id: ticket.id },
            include: { tier: true },
          });

          return {
            success: false,
            message: 'Ticket already checked in',
            checkedInAt: currentTicket?.checkedInAt,
            checkedInBy: currentTicket?.checkedInBy,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              tierName: ticket.tier.name,
              buyerName: `${ticket.buyerFirstName || ''} ${ticket.buyerLastName || ''}`.trim() || 'Guest',
            },
          };
        }

        // Successfully checked in - increment agent counter
        await tx.agentAccessCode.update({
          where: { id: agentCode.id },
          data: {
            checkInCount: { increment: 1 },
            lastUsedAt: checkInTime,
          },
        });

        return {
          success: true,
          message: 'Ticket checked in successfully',
          ticket: {
            ticketNumber: ticket.ticketNumber,
            tierName: ticket.tier.name,
            buyerName: `${ticket.buyerFirstName || ''} ${ticket.buyerLastName || ''}`.trim() || 'Guest',
            checkedInAt: checkInTime,
            checkedInBy: agentLabel,
          },
        };
      }, {
        // Transaction options for better handling
        maxWait: 5000, // Max time to wait for a connection
        timeout: 10000, // Max time for the transaction
      });

      if (result.success) {
        this.logger.log(
          `Agent ${agentLabel} checked in ticket ${result.ticket?.ticketNumber} for event ${agentCode.event.title}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Check-in failed for QR ${sanitizedQrCode}:`, error);
      
      // Handle specific Prisma errors
      if (error.code === 'P2028') {
        return {
          success: false,
          message: 'Check-in timed out. Please try again.',
        };
      }
      
      throw error;
    }
  }
}
