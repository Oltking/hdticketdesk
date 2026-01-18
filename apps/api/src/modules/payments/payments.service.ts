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
import { TasksService } from '../tasks/tasks.service';
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
    private tasksService: TasksService,
  ) {}

  async initializePayment(
    eventId: string,
    tierId: string,
    userId: string | null,
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

    // Only check user restrictions if authenticated
    if (userId) {
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
    } else {
      // For guest checkout, first check if this email belongs to an organizer account
      const existingUser = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { role: true, emailVerified: true },
      });

      if (existingUser) {
        if (existingUser.role === 'ORGANIZER') {
          throw new BadRequestException(
            'This email is registered as an organizer account. Organizers cannot purchase tickets. Please use a different email or create an attendee account.',
          );
        }

        // If the email belongs to a buyer account, suggest logging in
        if (existingUser.emailVerified) {
          throw new BadRequestException(
            'This email is already registered. Please log in to purchase tickets.',
          );
        }
      }

      // Check if email already has a ticket for this event
      const existingTicket = await this.prisma.ticket.findFirst({
        where: {
          eventId,
          buyerEmail: email,
          status: {
            in: ['ACTIVE', 'CHECKED_IN'],
          },
        },
      });

      if (existingTicket) {
        throw new BadRequestException(
          'This email already has a ticket for this event. Please sign in or use a different email.',
        );
      }
    }

    // Calculate amount
    const tierPrice = tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price);
    
    // Calculate service fee (5%) - only added to buyer's payment if organizer opted to pass fee
    const platformFeePercent = this.configService.get<number>('platformFeePercent') || 5;
    const passFeeTobuyer = (event as any).passFeeTobuyer ?? false;
    const serviceFee = passFeeTobuyer ? tierPrice * (platformFeePercent / 100) : 0;
    const totalAmountForBuyer = tierPrice + serviceFee;

    // Create reference
    const reference = `HD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Handle FREE tickets (price = 0) - skip payment gateway
    if (tierPrice === 0) {
      // Get user info if authenticated
      const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;

      // Create payment record as SUCCESS immediately for free tickets
      const payment = await this.prisma.payment.create({
        data: {
          reference,
          amount: 0,
          status: 'SUCCESS',
          eventId,
          tierId,
          buyerId: userId || null,
          buyerEmail: email,
        },
      });

      // Create ticket directly
      const ticket = await this.ticketsService.createTicket({
        eventId,
        tierId,
        buyerId: userId || '',
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
    // Store the tier price in payment record (what organizer receives before platform fee)
    const payment = await this.prisma.payment.create({
      data: {
        reference,
        amount: tierPrice, // Store original tier price
        status: 'PENDING',
        eventId,
        tierId,
        buyerId: userId || null,
        buyerEmail: email,
      },
    });

    // Initialize Paystack transaction with total amount (including service fee if passed to buyer)
    const paystackResponse = await this.paystackService.initializeTransaction(
      email,
      totalAmountForBuyer * 100, // Paystack expects kobo - includes service fee if applicable
      reference,
      {
        eventId,
        tierId,
        paymentId: payment.id,
        serviceFee: serviceFee.toString(), // Track the service fee in metadata (as string)
        passFeeTobuyer: passFeeTobuyer ? 'true' : 'false',
      },
    );

    return {
      isFree: false,
      authorizationUrl: paystackResponse.authorization_url,
      reference,
      paymentId: payment.id,
      // Return breakdown for frontend display if needed
      tierPrice,
      serviceFee,
      totalAmount: totalAmountForBuyer,
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

    // Verify amount - account for service fee if passed to buyer
    const tierPrice = payment.amount instanceof Decimal 
      ? payment.amount.toNumber() 
      : Number(payment.amount);
    const platformFeePercent = this.configService.get<number>('platformFeePercent') || 5;
    const eventPassFeeTobuyer = (event as any).passFeeTobuyer ?? false;
    const serviceFee = eventPassFeeTobuyer ? tierPrice * (platformFeePercent / 100) : 0;
    const expectedAmount = (tierPrice + serviceFee) * 100; // In kobo
      
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

    // Calculate organizer earnings
    // If fee was passed to buyer: organizer gets full tier price (buyer paid tier + fee)
    // If fee was NOT passed to buyer: organizer gets tier price minus platform fee
    const paymentAmount = payment.amount instanceof Decimal 
      ? payment.amount.toNumber() 
      : Number(payment.amount);
    
    let organizerAmount: number;
    let platformFee: number;
    
    if (eventPassFeeTobuyer) {
      // Buyer paid the fee separately, organizer gets full tier price
      organizerAmount = paymentAmount;
      platformFee = paymentAmount * (platformFeePercent / 100); // Still track fee for records
    } else {
      // Organizer absorbs the fee
      platformFee = paymentAmount * (platformFeePercent / 100);
      organizerAmount = paymentAmount - platformFee;
    }

    // Check if 24 hours have passed since first paid sale
    // If yes, new sales go directly to availableBalance
    // If no, sales go to pendingBalance
    const firstPaidSale = await this.prisma.ledgerEntry.findFirst({
      where: {
        organizerId: event.organizerId,
        type: 'TICKET_SALE',
        amount: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    const hoursSinceFirstSale = firstPaidSale 
      ? (Date.now() - firstPaidSale.createdAt.getTime()) / (1000 * 60 * 60)
      : 0;
    
    const isAfter24Hours = firstPaidSale && hoursSinceFirstSale >= 24;

    // Get current organizer profile for pending balance check
    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { id: event.organizerId },
    });

    // If 24 hours have passed and there's still pending balance, move it to available first
    if (isAfter24Hours && organizerProfile) {
      const currentPending = organizerProfile.pendingBalance instanceof Decimal
        ? organizerProfile.pendingBalance.toNumber()
        : Number(organizerProfile.pendingBalance);
      
      if (currentPending > 0) {
        await this.prisma.organizerProfile.update({
          where: { id: event.organizerId },
          data: {
            pendingBalance: { decrement: currentPending },
            availableBalance: { increment: currentPending },
          },
        });
      }
    }

    // Update organizer balance - go to availableBalance if after 24h, otherwise pendingBalance
    await this.prisma.organizerProfile.update({
      where: { id: event.organizerId },
      data: isAfter24Hours
        ? { availableBalance: { increment: organizerAmount } }
        : { pendingBalance: { increment: organizerAmount } },
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

    // Process any pending balance that should now be available
    // This ensures immediate balance update if 24 hours have passed since first sale
    try {
      await this.tasksService.processOrganizerPendingBalance(event.organizerId);
    } catch (error) {
      // Log but don't fail the payment process
      this.logger.warn(`Failed to process pending balance for organizer ${event.organizerId}:`, error);
    }
  }

  async checkPendingPayments(userId: string) {
    // Find all pending payments for this user
    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        buyerId: userId,
        status: 'PENDING',
      },
      include: {
        event: true,
        tier: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (pendingPayments.length === 0) {
      return { pendingPayments: [] };
    }

    // Verify each pending payment with Paystack
    const verificationResults = [];
    for (const payment of pendingPayments) {
      try {
        const paystackData = await this.paystackService.verifyTransaction(payment.reference);

        if (paystackData.status === 'success') {
          // Process the payment
          await this.handleSuccessfulPayment(paystackData);
          verificationResults.push({
            reference: payment.reference,
            status: 'verified',
            eventTitle: payment.event?.title,
          });
        }
      } catch (error) {
        this.logger.warn(`Could not verify payment ${payment.reference}:`, error);
        // Continue to next payment
      }
    }

    return {
      pendingPayments: pendingPayments.map(p => ({
        reference: p.reference,
        eventId: p.eventId,
        eventTitle: p.event?.title,
        amount: p.amount,
        createdAt: p.createdAt,
      })),
      verified: verificationResults,
    };
  }

  async verifyPayment(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // If payment is still pending, verify with Paystack and process it
    if (payment.status === 'PENDING') {
      try {
        // Verify transaction with Paystack
        const paystackData = await this.paystackService.verifyTransaction(reference);

        // Check if payment was successful on Paystack
        if (paystackData.status === 'success') {
          // Process the payment using the same logic as webhook
          await this.handleSuccessfulPayment(paystackData);

          // Refetch payment to get updated status
          const updatedPayment = await this.prisma.payment.findUnique({
            where: { reference },
          });

          // Get the created ticket
          const ticket = await this.prisma.ticket.findFirst({
            where: { paymentId: payment.id },
            include: {
              event: true,
              tier: true,
            },
          });

          return {
            message: 'Payment verified successfully!',
            payment: updatedPayment,
            ticket,
          };
        } else {
          // Payment not successful on Paystack
          throw new BadRequestException(`Payment verification failed: ${paystackData.gateway_response || 'Payment not completed'}`);
        }
      } catch (error) {
        // If verification fails, log and rethrow
        this.logger.error(`Failed to verify payment ${reference}:`, error);
        throw new BadRequestException('Unable to verify payment with Paystack. Please try again or contact support.');
      }
    }

    // Payment already processed, fetch ticket
    const ticket = await this.prisma.ticket.findFirst({
      where: { paymentId: payment.id },
      include: {
        event: true,
        tier: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found for this payment');
    }

    return {
      message: 'Payment already verified',
      payment,
      ticket,
    };
  }
}
