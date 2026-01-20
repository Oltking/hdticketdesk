import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MonnifyService } from './monnify.service';
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
    private monnifyService: MonnifyService,
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

    // Check if ticket sales have ended for this tier
    if (tier.saleEndDate && new Date(tier.saleEndDate) < new Date()) {
      throw new BadRequestException('Ticket sales have ended for this tier');
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
        paymentRef: reference,
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

    // For paid tickets, proceed with Monnify payment
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
        organizerId: event.organizerId, // Track organizer for reconciliation
      },
    });

    // Get user info for customer name
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer' : 'Customer';

    // Initialize Monnify transaction with total amount (including service fee if passed to buyer)
    const monnifyResponse = await this.monnifyService.initializeTransaction(
      email,
      totalAmountForBuyer, // Monnify expects Naira (not kobo)
      reference,
      {
        eventId,
        tierId,
        paymentId: payment.id,
        organizerId: event.organizerId,
        serviceFee: serviceFee.toString(),
        passFeeTobuyer: passFeeTobuyer ? 'true' : 'false',
        customerName,
        description: `Ticket for ${event.title}`,
      },
    );

    // Update payment with Monnify transaction reference
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        monnifyTransactionRef: monnifyResponse.transactionReference,
      },
    });

    return {
      isFree: false,
      authorizationUrl: monnifyResponse.checkoutUrl, // Monnify checkout URL
      reference,
      paymentId: payment.id,
      transactionReference: monnifyResponse.transactionReference,
      // Return breakdown for frontend display if needed
      tierPrice,
      serviceFee,
      totalAmount: totalAmountForBuyer,
    };
  }

  /**
   * Handle successful payment webhook from Monnify
   */
  async handleMonnifyPaymentSuccess(eventData: any) {
    const { paymentReference, transactionReference, amountPaid, paidOn } = eventData;

    // Find payment record by reference
    const payment = await this.prisma.payment.findUnique({
      where: { reference: paymentReference },
    });

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${paymentReference}`);
      return;
    }

    if (payment.status !== 'PENDING') {
      this.logger.log(`Payment already processed: ${paymentReference}`);
      return;
    }

    // Process the successful payment
    await this.handleSuccessfulPayment({
      reference: paymentReference,
      amount: amountPaid,
      id: transactionReference,
      paid_at: paidOn,
    });
  }

  /**
   * Handle failed payment webhook from Monnify
   */
  async handleMonnifyPaymentFailed(eventData: any) {
    const { paymentReference, transactionReference } = eventData;

    const payment = await this.prisma.payment.findUnique({
      where: { reference: paymentReference },
    });

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${paymentReference}`);
      return;
    }

    // Mark payment as failed
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        monnifyTransactionRef: transactionReference,
      },
    });

    this.logger.log(`Payment marked as failed: ${paymentReference}`);
  }

  /**
   * Handle successful transfer/disbursement webhook from Monnify
   */
  async handleMonnifyTransferSuccess(eventData: any) {
    const { reference, amount, status } = eventData;

    // Find withdrawal by transfer reference
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: { monnifyTransferRef: reference },
    });

    if (!withdrawal) {
      this.logger.error(`Withdrawal not found for transfer reference: ${reference}`);
      return;
    }

    // Update withdrawal status
    await this.prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'COMPLETED',
        monnifyTransferStatus: status,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Withdrawal completed: ${withdrawal.id}`);
  }

  /**
   * Handle failed transfer/disbursement webhook from Monnify
   */
  async handleMonnifyTransferFailed(eventData: any) {
    const { reference, status, responseMessage } = eventData;

    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: { monnifyTransferRef: reference },
    });

    if (!withdrawal) {
      this.logger.error(`Withdrawal not found for transfer reference: ${reference}`);
      return;
    }

    // Update withdrawal status to failed and restore balance
    await this.prisma.$transaction(async (tx: any) => {
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          monnifyTransferStatus: status,
          failureReason: responseMessage || 'Transfer failed',
        },
      });

      // Restore the available balance since transfer failed
      await tx.organizerProfile.update({
        where: { id: withdrawal.organizerId },
        data: {
          availableBalance: { increment: withdrawal.amount },
        },
      });
    });

    this.logger.warn(`Withdrawal failed: ${withdrawal.id} - ${responseMessage}`);
  }

  /**
   * Handle reversed transfer webhook from Monnify
   */
  async handleMonnifyTransferReversed(eventData: any) {
    const { reference, responseMessage } = eventData;

    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: { monnifyTransferRef: reference },
    });

    if (!withdrawal) {
      this.logger.error(`Withdrawal not found for transfer reference: ${reference}`);
      return;
    }

    // Handle reversal - restore organizer balance
    await this.prisma.$transaction(async (tx: any) => {
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          monnifyTransferStatus: 'REVERSED',
          failureReason: responseMessage || 'Transfer reversed',
        },
      });

      // Restore both balances
      await tx.organizerProfile.update({
        where: { id: withdrawal.organizerId },
        data: {
          availableBalance: { increment: withdrawal.amount },
          withdrawnBalance: { decrement: withdrawal.amount },
        },
      });
    });

    this.logger.warn(`Withdrawal reversed: ${withdrawal.id}`);
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
    const expectedAmount = tierPrice + serviceFee; // Monnify sends amount in Naira, not kobo
    
    // Allow small tolerance for floating point differences (₦0.50)
    const amountDifference = Math.abs(amount - expectedAmount);
    if (amountDifference > 0.5) {
      this.logger.error(`Amount mismatch for ${reference}: expected ${expectedAmount}, got ${amount}, diff: ${amountDifference}`);
      // Mark payment as failed instead of silently returning
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
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
      paymentRef: reference,
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

    // All new payments go to pendingBalance first
    // The cron job (tasks.service.ts) handles moving funds to availableBalance 
    // after 24 hours based on each individual ledger entry's createdAt timestamp
    await this.prisma.organizerProfile.update({
      where: { id: event.organizerId },
      data: { pendingBalance: { increment: organizerAmount } },
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
        monnifyTransactionRef: data.id?.toString(),
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
      },
    });

    // Update tier sold count
    await this.prisma.ticketTier.update({
      where: { id: payment.tierId },
      data: { sold: { increment: 1 } },
    });

    // Process any pending balance that should now be available
    // This moves any matured funds (older than 24 hours) from pending to available
    try {
      await this.tasksService.processOrganizerPendingBalance(event.organizerId);
    } catch (error) {
      // Log but don't fail the payment process
      this.logger.warn(`Failed to process pending balance for organizer ${event.organizerId}:`, error);
    }
  }

  /**
   * Check and recover pending payments for a user
   * This handles cases where buyer closes the page after payment but before ticket creation
   */
  async checkPendingPayments(userId: string) {
    // Find all pending payments for this user (within last 24 hours to avoid stale data)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        buyerId: userId,
        status: 'PENDING',
        createdAt: { gte: twentyFourHoursAgo },
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
      return { pendingPayments: [], verified: [] };
    }

    // Verify each pending payment with Monnify
    const verificationResults = [];
    for (const payment of pendingPayments) {
      try {
        // Use Monnify transaction reference if available, otherwise use payment reference
        const transactionRef = payment.monnifyTransactionRef || payment.reference;
        const monnifyData = await this.monnifyService.verifyTransaction(transactionRef);

        if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
          // Process the payment using the same logic as webhook
          await this.handleSuccessfulPayment({
            reference: payment.reference,
            amount: monnifyData.amount,
            id: monnifyData.transactionReference,
            paid_at: monnifyData.paidOn,
          });
          
          verificationResults.push({
            reference: payment.reference,
            status: 'verified',
            eventTitle: payment.event?.title,
          });
        }
      } catch (error) {
        this.logger.warn(`Could not verify payment ${payment.reference}:`, error);
        // Continue to next payment - don't fail the entire check
      }
    }

    // Refetch pending payments to exclude those that were just verified
    const remainingPending = await this.prisma.payment.findMany({
      where: {
        buyerId: userId,
        status: 'PENDING',
        createdAt: { gte: twentyFourHoursAgo },
      },
      include: {
        event: true,
      },
    });

    return {
      pendingPayments: remainingPending.map((p: any) => ({
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

    // If payment is still pending, verify with Monnify and process it
    if (payment.status === 'PENDING') {
      try {
        // Get transaction reference for Monnify verification
        const transactionRef = payment.monnifyTransactionRef || reference;
        
        // Verify transaction with Monnify
        const monnifyData = await this.monnifyService.verifyTransaction(transactionRef);

        // Check if payment was successful on Monnify
        if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
          // Process the payment using the same logic as webhook
          await this.handleSuccessfulPayment({
            reference: payment.reference,
            amount: monnifyData.amount,
            id: monnifyData.transactionReference,
            paid_at: monnifyData.paidOn,
          });

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
          // Payment not successful on Monnify
          throw new BadRequestException(`Payment verification failed: ${monnifyData.status || 'Payment not completed'}`);
        }
      } catch (error) {
        // If verification fails, log and rethrow
        this.logger.error(`Failed to verify payment ${reference}:`, error);
        throw new BadRequestException('Unable to verify payment with Monnify. Please try again or contact support.');
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
