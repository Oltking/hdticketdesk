import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PaystackService } from './paystack.service';
import { TicketsService } from '../tickets/tickets.service';
import { LedgerService } from '../ledger/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paystackService: PaystackService,
    private ticketsService: TicketsService,
    private ledgerService: LedgerService,
  ) {}

  async initializePayment(
    eventId: string,
    tierId: string,
    userId: string,
    email: string,
  ) {
    // Get event and tier
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { tiers: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('Event is not published');
    }

    const tier = event.tiers.find((t: { id: string }) => t.id === tierId);
    if (!tier) {
      throw new NotFoundException('Ticket tier not found');
    }

    // Check availability
    if (tier.sold >= tier.capacity) {
      throw new BadRequestException('Tickets sold out');
    }

    // Check if user is an organizer - organizers cannot buy tickets
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'ORGANIZER') {
      throw new BadRequestException(
        'Organizer accounts cannot purchase tickets. Please create or login with an attendee account to buy tickets.',
      );
    }

    // Check if user already has a ticket for this event (any tier)
    const existingTicket = await this.prisma.ticket.findFirst({
      where: {
        eventId,
        buyerId: userId,
        status: {
          in: ['ACTIVE', 'CHECKED_IN'], // Only count valid tickets, not cancelled/refunded
        },
      },
    });

    if (existingTicket) {
      throw new BadRequestException(
        'You already have a ticket for this event. Each user can only purchase one ticket per event.',
      );
    }

    // Calculate amount
    const tierPrice = tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price);

    // Create reference
    const reference = `HD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Handle FREE tickets (price = 0) - skip payment gateway
    if (tierPrice === 0) {
      // Get user info
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      // Create payment record as SUCCESS immediately for free tickets
      const payment = await this.prisma.payment.create({
        data: {
          reference,
          amount: 0,
          status: 'SUCCESS',
          eventId,
          tierId,
          buyerId: userId,
          buyerEmail: email,
        },
      });

      // Create ticket directly
      const ticket = await this.ticketsService.createTicket({
        eventId,
        tierId,
        buyerId: userId,
        buyerEmail: email,
        buyerFirstName: user?.firstName || undefined,
        buyerLastName: user?.lastName || undefined,
        paymentId: payment.id,
        paystackRef: reference,
        amountPaid: 0,
      });

      // Update tier sold count
      await this.prisma.ticketTier.update({
        where: { id: tierId },
        data: { sold: { increment: 1 } },
      });

      // Return success response indicating free ticket was created
      return {
        isFree: true,
        success: true,
        reference,
        paymentId: payment.id,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        message: 'Free ticket claimed successfully!',
      };
    }

    // For paid tickets, proceed with Paystack payment
    const payment = await this.prisma.payment.create({
      data: {
        reference,
        amount: tierPrice,
        status: 'PENDING',
        eventId,
        tierId,
        buyerId: userId,
        buyerEmail: email,
      },
    });

    // Initialize Paystack transaction
    const paystackResponse = await this.paystackService.initializeTransaction(
      email,
      tierPrice * 100, // Paystack expects kobo
      reference,
      {
        eventId,
        tierId,
        paymentId: payment.id,
      },
    );

    return {
      isFree: false,
      authorizationUrl: paystackResponse.authorization_url,
      reference,
      paymentId: payment.id,
    };
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const isValid = this.paystackService.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      await this.handleSuccessfulPayment(data);
    }

    return { received: true };
  }

  private async handleSuccessfulPayment(data: any) {
    const { reference, amount } = data;

    // Find payment record
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${reference}`);
      return;
    }

    if (payment.status !== 'PENDING') {
      this.logger.log(`Payment already processed: ${reference}`);
      return;
    }

    // Get event with organizer
    const event = await this.prisma.event.findUnique({
      where: { id: payment.eventId },
      include: { organizer: true },
    });

    if (!event) {
      this.logger.error(`Event not found for payment: ${reference}`);
      return;
    }

    // Get tier
    const tier = await this.prisma.ticketTier.findUnique({
      where: { id: payment.tierId },
    });

    if (!tier) {
      this.logger.error(`Tier not found for payment: ${reference}`);
      return;
    }

    // Verify amount
    const expectedAmount = payment.amount instanceof Decimal 
      ? payment.amount.toNumber() * 100 
      : Number(payment.amount) * 100;
      
    if (amount !== expectedAmount) {
      this.logger.error(`Amount mismatch for ${reference}: expected ${expectedAmount}, got ${amount}`);
      return;
    }

    // Get buyer info
    const user = payment.buyerId 
      ? await this.prisma.user.findUnique({ where: { id: payment.buyerId } })
      : null;

    // Create ticket
    const ticket = await this.ticketsService.createTicket({
      eventId: payment.eventId,
      tierId: payment.tierId,
      buyerId: payment.buyerId || '',
      buyerEmail: payment.buyerEmail,
      buyerFirstName: user?.firstName || undefined,
      buyerLastName: user?.lastName || undefined,
      paymentId: payment.id,
      paystackRef: reference,
      amountPaid: payment.amount instanceof Decimal 
        ? payment.amount.toNumber() 
        : Number(payment.amount),
    });

    // Calculate platform fee (5%)
    const platformFeePercent = this.configService.get<number>('platformFeePercent') || 5;
    const paymentAmount = payment.amount instanceof Decimal 
      ? payment.amount.toNumber() 
      : Number(payment.amount);
    const platformFee = paymentAmount * (platformFeePercent / 100);
    const organizerAmount = paymentAmount - platformFee;

    // Update organizer balance
    await this.prisma.organizerProfile.update({
      where: { id: event.organizerId },
      data: {
        pendingBalance: { increment: organizerAmount },
      },
    });

    // Record in ledger
    await this.ledgerService.recordTicketSale(
      event.organizerId,
      ticket.id,
      organizerAmount,
      platformFee,
    );

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        paystackRef: data.id?.toString(),
      },
    });

    // Update tier sold count
    await this.prisma.ticketTier.update({
      where: { id: payment.tierId },
      data: { sold: { increment: 1 } },
    });
  }

  async verifyPayment(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Fetch event and tier separately
    const event = await this.prisma.event.findUnique({
      where: { id: payment.eventId },
    });

    const tier = await this.prisma.ticketTier.findUnique({
      where: { id: payment.tierId },
    });

    return {
      ...payment,
      event,
      tier,
    };
  }
}
