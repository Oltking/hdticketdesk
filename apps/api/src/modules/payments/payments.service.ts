import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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

  async initializePayment(eventId: string, tierId: string, userId: string | null, email: string) {
    this.logger.log(`initializePayment called: eventId=${eventId}, tierId=${tierId}, userId=${userId}, email=${email}`);
    
    // Validate required parameters
    if (!eventId || !tierId) {
      throw new BadRequestException('Event ID and Tier ID are required');
    }
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
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
        where: { email: normalizedEmail },
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
          buyerEmail: normalizedEmail,
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

    // =============================================================================
    // PAYMENT AMOUNT CALCULATION
    // =============================================================================
    // Platform fee (5%) can be paid by buyer or absorbed by organizer:
    //
    // If passFeeTobuyer = true:
    //   - Buyer pays: tierPrice + 5% service fee
    //   - Organizer gets: full tierPrice
    //
    // If passFeeTobuyer = false:
    //   - Buyer pays: just tierPrice
    //   - Organizer gets: tierPrice - 5%
    // =============================================================================

    const tierPrice = tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price);
    const platformFeePercent = this.configService.get<number>('platformFeePercent') || 5;
    const passFeeTobuyer = (event as any).passFeeTobuyer ?? false;

    // Calculate service fee (5% of tier price)
    const serviceFee = tierPrice * (platformFeePercent / 100);

    // Total amount buyer will pay
    // If fee is passed to buyer: tierPrice + serviceFee
    // If organizer absorbs fee: just tierPrice (organizer gets tierPrice - serviceFee)
    const totalAmountForBuyer = passFeeTobuyer ? tierPrice + serviceFee : tierPrice;

    this.logger.log(`Payment initialized for event ${event.title}:`);
    this.logger.log(`  - Tier: ${tier.name}, Price: ₦${tierPrice}`);
    this.logger.log(`  - Service fee (${platformFeePercent}%): ₦${serviceFee.toFixed(2)}`);
    this.logger.log(`  - Fee passed to buyer: ${passFeeTobuyer}`);
    this.logger.log(`  - Buyer will pay: ₦${totalAmountForBuyer.toFixed(2)}`);

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
          buyerEmail: normalizedEmail,
        },
      });

      // Create ticket directly
      const ticket = await this.ticketsService.createTicket({
        eventId,
        tierId,
        buyerId: userId || '',
        buyerEmail: normalizedEmail,
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
    // Store the TOTAL amount the buyer will pay (including service fee if passed to buyer)
    // This is critical for payment verification - Monnify will return this exact amount
    let payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          reference,
          amount: totalAmountForBuyer, // Store TOTAL amount buyer pays (tier price + service fee if applicable)
          status: 'PENDING',
          eventId,
          tierId,
          buyerId: userId || null,
          buyerEmail: normalizedEmail,
          organizerId: event.organizerId, // Track organizer for reconciliation
        },
      });
      this.logger.log(`Payment record created: ${payment.id}, reference: ${reference}`);
    } catch (dbError) {
      this.logger.error(`Failed to create payment record: ${dbError.message}`, dbError.stack);
      throw new BadRequestException('Unable to initialize payment. Please try again.');
    }

    // Get user info for customer name
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    const customerName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer'
      : 'Customer';

    // Initialize Monnify transaction with total amount buyer will pay
    let monnifyResponse;
    try {
      this.logger.log(`Calling Monnify initializeTransaction for ${reference}, amount: ${totalAmountForBuyer}`);
      monnifyResponse = await this.monnifyService.initializeTransaction(
        normalizedEmail,
        totalAmountForBuyer, // Total amount buyer pays (Monnify expects Naira, not kobo)
        reference,
        {
          eventId,
          tierId,
          paymentId: payment.id,
          organizerId: event.organizerId,
          tierPrice: tierPrice.toString(), // Original ticket price
          serviceFee: serviceFee.toString(), // 5% fee amount
          passFeeTobuyer: passFeeTobuyer ? 'true' : 'false',
          totalAmount: totalAmountForBuyer.toString(), // What buyer is paying
          customerName,
          description: `Ticket for ${event.title} - ${tier.name}`,
        },
      );
      this.logger.log(`Monnify response received: ${JSON.stringify(monnifyResponse)}`);
    } catch (monnifyError) {
      this.logger.error(`Monnify initialization failed: ${monnifyError.message}`, monnifyError.stack);
      // Mark the payment as failed since Monnify couldn't initialize
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(
        `Payment gateway error: ${monnifyError.message || 'Unable to connect to payment provider. Please try again.'}`,
      );
    }

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
      // Return breakdown for frontend display
      breakdown: {
        tierPrice, // Base ticket price
        serviceFee, // 5% service fee amount
        serviceFeePercent: platformFeePercent,
        passFeeTobuyer, // Whether buyer pays the fee
        totalAmount: totalAmountForBuyer, // What buyer actually pays
        // For display purposes:
        buyerPays: totalAmountForBuyer,
        organizerReceives: passFeeTobuyer ? tierPrice : tierPrice - serviceFee,
      },
      // Keep legacy fields for backward compatibility
      tierPrice,
      serviceFee: passFeeTobuyer ? serviceFee : 0, // Only show fee to buyer if they're paying it
      totalAmount: totalAmountForBuyer,
    };
  }

  /**
   * Handle successful payment webhook from Monnify
   * This is called when Monnify confirms a payment was successful
   */
  async handleMonnifyPaymentSuccess(eventData: any) {
    const { paymentReference, transactionReference, amountPaid, paidOn, customer } = eventData;

    this.logger.log(
      `Processing successful payment: ${paymentReference}, amount: ${amountPaid}, customer: ${customer?.email}`,
    );

    // Find payment record by reference
    const payment = await this.prisma.payment.findUnique({
      where: { reference: paymentReference },
    });

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${paymentReference}`);
      return;
    }

    if (payment.status === 'SUCCESS') {
      this.logger.log(`Payment already processed successfully: ${paymentReference}`);
      return;
    }

    if (payment.status === 'FAILED') {
      this.logger.warn(
        `Received success webhook for failed payment: ${paymentReference} - Re-processing...`,
      );
      // If Monnify says it's successful, process it even if we previously marked it failed
      // This handles cases where we marked it failed due to amount mismatch but payment actually went through
    }

    // Process the successful payment
    await this.handleSuccessfulPayment({
      reference: paymentReference,
      amount: amountPaid,
      customer,
      id: transactionReference,
      paid_at: paidOn,
    });
  }

  /**
   * Handle failed payment webhook from Monnify
   * This is called when a payment fails, expires, or is cancelled
   */
  async handleMonnifyPaymentFailed(eventData: any) {
    const { paymentReference, transactionReference, paymentStatus } = eventData;

    this.logger.log(`Processing failed payment: ${paymentReference}, status: ${paymentStatus}`);

    const payment = await this.prisma.payment.findUnique({
      where: { reference: paymentReference },
    });

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${paymentReference}`);
      return;
    }

    // Don't overwrite if already processed successfully
    if (payment.status === 'SUCCESS') {
      this.logger.warn(
        `Received failed webhook for successful payment: ${paymentReference} - ignoring`,
      );
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

    // Record withdrawal in ledger (only on successful completion)
    try {
      await this.ledgerService.recordWithdrawal({
        organizerId: withdrawal.organizerId,
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount instanceof Decimal
          ? withdrawal.amount.toNumber()
          : Number(withdrawal.amount),
        description: `Withdrawal completed via Monnify`,
      });
    } catch (e) {
      this.logger.warn(`Failed to record withdrawal in ledger: ${withdrawal.id}`, e as any);
    }

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
    const { reference, amount, customer } = data;

    this.logger.log(
      `handleSuccessfulPayment called: ${reference}, amount: ${amount}, customer: ${customer?.email}`,
    );

    // Find payment record - try by reference first
    let payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    // IMPORTANT: Do not attempt to match payments by email/amount.
    // Only process payments we can identify by our reference / Monnify references.

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${reference}`);
      return;
    }

    // Idempotency check - prevent double processing
    if (payment.status === 'SUCCESS') {
      this.logger.log(`Payment already processed successfully: ${payment.reference}`);
      return;
    }

    if (payment.status === 'FAILED') {
      this.logger.warn(`Payment was previously marked as FAILED: ${payment.reference}`);
      this.logger.warn(`Monnify says it's successful, so re-processing as successful payment...`);
      // Don't return - continue processing since Monnify confirms it was paid
    }

    // Check if ticket already exists for this payment (another idempotency check)
    const existingTicket = await this.prisma.ticket.findFirst({
      where: { paymentId: payment.id },
    });

    if (existingTicket) {
      this.logger.log(`Ticket already exists for payment: ${reference}`);
      // Update payment status to SUCCESS since ticket exists
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS' },
      });
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

    // Get the expected amount from payment record
    // NOTE: payment.amount now stores the TOTAL amount buyer paid (tier price + service fee if applicable)
    const storedAmount =
      payment.amount instanceof Decimal ? payment.amount.toNumber() : Number(payment.amount);

    const platformFeePercent = this.configService.get<number>('platformFeePercent') || 5;
    const eventPassFeeTobuyer = (event as any).passFeeTobuyer ?? false;

    // Get the actual tier price for organizer earnings calculation
    const actualTierPrice =
      tier.price instanceof Decimal ? tier.price.toNumber() : Number(tier.price);

    // Log amount details for debugging
    this.logger.log(`Amount verification for ${reference}:`);
    this.logger.log(`  - Stored payment amount: ₦${storedAmount}`);
    this.logger.log(`  - Tier price: ₦${actualTierPrice}`);
    this.logger.log(`  - Pass fee to buyer: ${eventPassFeeTobuyer}`);
    this.logger.log(`  - Actual paid (from Monnify): ₦${amount}`);

    // Verify amount matches what we stored (which is what Monnify charged)
    // More flexible tolerance - allow up to ₦5 difference for floating point and rounding
    const amountDifference = Math.abs(amount - storedAmount);
    this.logger.log(`  - Difference from stored: ₦${amountDifference}`);

    if (amountDifference > 5) {
      // Try to match against tier price as fallback (for old payments before this fix)
      const tierPriceDiff = Math.abs(amount - actualTierPrice);
      this.logger.log(`  - Difference from tier price: ₦${tierPriceDiff}`);

      // Also check if it matches tier price + calculated service fee
      const calculatedServiceFee = eventPassFeeTobuyer
        ? actualTierPrice * (platformFeePercent / 100)
        : 0;
      const calculatedTotal = actualTierPrice + calculatedServiceFee;
      const calculatedTotalDiff = Math.abs(amount - calculatedTotal);
      this.logger.log(
        `  - Calculated total (tier + fee): ₦${calculatedTotal}, diff: ₦${calculatedTotalDiff}`,
      );

      if (tierPriceDiff <= 5 || calculatedTotalDiff <= 5) {
        this.logger.log(`Amount matches tier price or calculated total (within ₦5), proceeding...`);
      } else {
        this.logger.error(`Amount mismatch for ${reference}:`);
        this.logger.error(
          `  Stored: ₦${storedAmount}, Tier: ₦${actualTierPrice}, Calculated: ₦${calculatedTotal}, Paid: ₦${amount}`,
        );
        this.logger.error(
          `  Diffs - Stored: ₦${amountDifference}, Tier: ₦${tierPriceDiff}, Calculated: ₦${calculatedTotalDiff}`,
        );
        // Don't mark as failed - just log the warning
        // The payment was successful on Monnify, so we should still create the ticket
        this.logger.warn(`Proceeding despite amount mismatch since Monnify confirmed payment`);
      }
    } else {
      this.logger.log(`Amount verified successfully (within ₦5 tolerance)`);
    }

    // Get buyer info
    const user = payment.buyerId
      ? await this.prisma.user.findUnique({ where: { id: payment.buyerId } })
      : null;

    // Create ticket - buyerId can be null for guest checkouts
    // Ticket creation is idempotent (by paymentId/paymentRef)
    const ticket = await this.ticketsService.createTicket({
      eventId: payment.eventId,
      tierId: payment.tierId,
      buyerId: payment.buyerId || null, // Pass null for guest checkouts, not empty string
      buyerEmail: payment.buyerEmail,
      buyerFirstName: user?.firstName || undefined,
      buyerLastName: user?.lastName || undefined,
      paymentId: payment.id,
      paymentRef: reference,
      amountPaid:
        payment.amount instanceof Decimal ? payment.amount.toNumber() : Number(payment.amount),
    });

    // =============================================================================
    // ORGANIZER EARNINGS CALCULATION
    // =============================================================================
    // Service fee is ALWAYS 5% of the TICKET PRICE (not the total amount paid)
    //
    // If passFeeTobuyer = true:
    //   - Buyer paid: tierPrice + 5% service fee (e.g., 1000 + 50 = 1050)
    //   - Platform fee: 5% of tierPrice = 50
    //   - Organizer receives: full tierPrice = 1000
    //
    // If passFeeTobuyer = false:
    //   - Buyer paid: tierPrice only (e.g., 1000)
    //   - Platform fee: 5% of tierPrice = 50
    //   - Organizer receives: tierPrice - 5% = 950
    // =============================================================================

    const platformFee = actualTierPrice * (platformFeePercent / 100);
    const organizerAmount = eventPassFeeTobuyer 
      ? actualTierPrice  // Organizer gets full tier price when buyer pays the fee
      : actualTierPrice - platformFee;  // Organizer absorbs the fee

    this.logger.log(`=== Earnings Calculation for ${reference} ===`);
    this.logger.log(`  Tier price: ₦${actualTierPrice.toFixed(2)}`);
    this.logger.log(`  Buyer paid: ₦${storedAmount.toFixed(2)}`);
    this.logger.log(`  Pass fee to buyer: ${eventPassFeeTobuyer}`);
    this.logger.log(`  Platform fee (${platformFeePercent}% of tier price): ₦${platformFee.toFixed(2)}`);
    this.logger.log(`  Organizer receives: ₦${organizerAmount.toFixed(2)}`);
    this.logger.log(`  ================================================`);

    // All new payments go to pendingBalance first
    // The cron job (tasks.service.ts) handles moving funds to availableBalance
    // after 24 hours based on each individual ledger entry's createdAt timestamp
    await this.prisma.organizerProfile.update({
      where: { id: event.organizerId },
      data: { pendingBalance: { increment: organizerAmount } },
    });

    // Record in ledger with full reconciliation data
    // This ensures each Monnify transaction is recorded exactly once
    await this.ledgerService.recordTicketSale({
      organizerId: event.organizerId,
      ticketId: ticket.id,
      amount: organizerAmount,
      platformFee,
      monnifyTransactionRef: data.id?.toString() || null,
      paymentReference: payment.reference,
      paymentId: payment.id,
      valueDate: data.paid_at ? new Date(data.paid_at) : new Date(),
      description: `${event.title} - ${tier.name || 'Ticket'}`,
      narration: `Credit: Ticket sale for ${event.title} - ${tier.name || 'Ticket'}`,
    });

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
      this.logger.warn(
        `Failed to process pending balance for organizer ${event.organizerId}:`,
        error,
      );
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
        const monnifyData = await this.monnifyService.verifyTransaction(
          transactionRef,
          payment.reference,
        );

        if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
          // Process the payment using the same logic as webhook
          await this.handleSuccessfulPayment({
            reference: payment.reference,
            amount: monnifyData.amount,
            id: monnifyData.transactionReference,
            paid_at: monnifyData.paidOn,
            customer: monnifyData.customer,
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
    // Try to find payment by our reference first
    let payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    // If not found, try to find by Monnify transaction reference
    if (!payment) {
      payment = await this.prisma.payment.findFirst({
        where: { monnifyTransactionRef: reference },
      });
    }

    if (!payment) {
      this.logger.error(`Payment not found for reference: ${reference}`);
      throw new NotFoundException('Payment not found');
    }

    // If payment is still pending, verify with Monnify and process it
    if (payment.status === 'PENDING') {
      try {
        // Get transaction reference for Monnify verification
        const transactionRef = payment.monnifyTransactionRef || reference;

        this.logger.log(
          `Verifying payment ${reference} with Monnify transaction ref: ${transactionRef}`,
        );

        // Verify transaction with Monnify with retry logic
        let monnifyData;
        let lastError;

        // Try up to 3 times with delays (sometimes Monnify takes a moment to update status)
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Pass both transaction ref and payment ref to try both
            monnifyData = await this.monnifyService.verifyTransaction(
              transactionRef,
              payment.reference,
            );
            this.logger.log(
              `Monnify verification attempt ${attempt} result: ${JSON.stringify(monnifyData)}`,
            );

            // If we got a successful status, break out of retry loop
            if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
              break;
            }

            // If status is still pending on first attempts, wait and retry
            if (monnifyData.status === 'pending' && attempt < 3) {
              this.logger.log(
                `Payment still pending on Monnify, waiting ${attempt * 2} seconds before retry...`,
              );
              await new Promise((resolve) => setTimeout(resolve, attempt * 2000)); // 2s, 4s delays
              continue;
            }

            // If we got a definitive failed status or it's the last attempt, stop retrying
            break;
          } catch (error) {
            lastError = error;
            this.logger.warn(`Monnify verification attempt ${attempt} failed:`, error);

            // Wait before retrying (except on last attempt)
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 1500)); // 1.5s, 3s delays
            }
          }
        }

        if (!monnifyData) {
          // All retries failed
          this.logger.error(`All verification attempts failed for payment ${reference}`, lastError);
          throw new BadRequestException(
            'Unable to verify payment with Monnify at this time. ' +
              'If you were charged, your ticket will be issued shortly. ' +
              'Please check your tickets page in a few minutes or contact support.',
          );
        }

        // Check if payment was successful on Monnify
        if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
          this.logger.log(`Payment ${reference} verified as successful, processing...`);

          // Process the payment using the same logic as webhook
          await this.handleSuccessfulPayment({
            reference: payment.reference,
            amount: monnifyData.amount,
            id: monnifyData.transactionReference,
            paid_at: monnifyData.paidOn,
            customer: monnifyData.customer,
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
          const statusMsg = monnifyData.status || 'unknown status';
          this.logger.warn(`Payment ${reference} verification returned status: ${statusMsg}`);
          throw new BadRequestException(
            `Payment verification returned status: ${statusMsg}. ` +
              (monnifyData.status === 'pending'
                ? 'Payment is still being processed. Please check your tickets page in a few minutes.'
                : 'Payment was not completed. Please try again or contact support if you were charged.'),
          );
        }
      } catch (error) {
        // If verification fails, log details and provide helpful error
        this.logger.error(`Failed to verify payment ${reference}:`, error);

        // Check if error has a useful message
        const errorMessage = error?.message || 'Unknown error';

        // If it's a BadRequestException we threw, just rethrow it
        if (error instanceof BadRequestException) {
          throw error;
        }

        // Otherwise, provide a generic but helpful error
        throw new BadRequestException(
          'Unable to verify payment with Monnify. ' +
            'If you completed payment and were charged, your ticket will be issued automatically. ' +
            'Please check your tickets page in a few minutes or contact support. ' +
            `Error: ${errorMessage}`,
        );
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
