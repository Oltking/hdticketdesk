import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cron job that runs every 5 minutes to move pending balances to available balances.
   * 
   * Logic: Sum up all ticket sales that are older than 24 hours for each organizer,
   * add back refunds (which are stored as negative amounts),
   * subtract what's already been moved to available (withdrawals + current available),
   * and move the matured amount from pending to available.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePendingBalanceMaturity() {
    this.logger.log('Running pending balance maturity check...');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get all organizers with pending balance > 0
      const organizersWithPending = await this.prisma.organizerProfile.findMany({
        where: {
          pendingBalance: { gt: 0 },
        },
        select: {
          id: true,
          pendingBalance: true,
          availableBalance: true,
          withdrawnBalance: true,
        },
      });

      if (organizersWithPending.length === 0) {
        this.logger.log('No organizers with pending balance found.');
        return { processed: 0, total: 0 };
      }

      let processedCount = 0;

      for (const organizer of organizersWithPending) {
        // Sum all ticket sales older than 24 hours (matured sales)
        const maturedSalesResult = await this.prisma.ledgerEntry.aggregate({
          where: {
            organizerId: organizer.id,
            type: 'TICKET_SALE',
            createdAt: { lte: twentyFourHoursAgo },
          },
          _sum: { amount: true },
        });

        const totalMaturedSales = maturedSalesResult._sum.amount 
          ? (maturedSalesResult._sum.amount instanceof Decimal 
              ? maturedSalesResult._sum.amount.toNumber() 
              : Number(maturedSalesResult._sum.amount))
          : 0;

        // Sum all refunds - note: refunds are stored as NEGATIVE amounts in ledger
        // So we need to get the absolute value of refunds
        const refundsResult = await this.prisma.ledgerEntry.aggregate({
          where: {
            organizerId: organizer.id,
            type: 'REFUND',
          },
          _sum: { amount: true },
        });

        // Refunds are negative, so Math.abs to get the actual refund amount
        const totalRefunds = refundsResult._sum.amount 
          ? Math.abs(refundsResult._sum.amount instanceof Decimal 
              ? refundsResult._sum.amount.toNumber() 
              : Number(refundsResult._sum.amount))
          : 0;

        // Calculate what should be available (matured sales minus absolute refunds)
        const shouldBeAvailableOrWithdrawn = totalMaturedSales - totalRefunds;

        // Current available + withdrawn is what's already been released
        const currentAvailable = organizer.availableBalance instanceof Decimal
          ? organizer.availableBalance.toNumber()
          : Number(organizer.availableBalance) || 0;
        
        const currentWithdrawn = organizer.withdrawnBalance instanceof Decimal
          ? organizer.withdrawnBalance.toNumber()
          : Number(organizer.withdrawnBalance) || 0;

        const alreadyReleased = currentAvailable + currentWithdrawn;

        // Amount to move = what should be released - what's already released
        const amountToMove = Math.max(0, shouldBeAvailableOrWithdrawn - alreadyReleased);

        // Also cap it at current pending balance (safety check)
        const currentPending = organizer.pendingBalance instanceof Decimal
          ? organizer.pendingBalance.toNumber()
          : Number(organizer.pendingBalance) || 0;

        const finalAmountToMove = Math.min(amountToMove, currentPending);

        if (finalAmountToMove > 0) {
          await this.prisma.organizerProfile.update({
            where: { id: organizer.id },
            data: {
              pendingBalance: { decrement: finalAmountToMove },
              availableBalance: { increment: finalAmountToMove },
            },
          });

          this.logger.log(
            `Moved ${finalAmountToMove} from pending to available for organizer ${organizer.id}`,
          );
          processedCount++;
        }
      }

      this.logger.log(
        `Pending balance maturity check completed. Processed ${processedCount} organizers.`,
      );

      return { processed: processedCount, total: organizersWithPending.length };
    } catch (error) {
      this.logger.error('Error during pending balance maturity check:', error);
      throw error;
    }
  }

  /**
   * Process pending balance for a specific organizer immediately.
   * Called after successful payments to ensure immediate balance update if eligible.
   */
  async processOrganizerPendingBalance(organizerId: string) {
    this.logger.log(`Processing pending balance for organizer ${organizerId}`);

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const organizer = await this.prisma.organizerProfile.findUnique({
        where: { id: organizerId },
        select: {
          id: true,
          pendingBalance: true,
          availableBalance: true,
          withdrawnBalance: true,
        },
      });

      if (!organizer) {
        this.logger.warn(`Organizer ${organizerId} not found`);
        return { processed: false, reason: 'Organizer not found' };
      }

      const currentPending = organizer.pendingBalance instanceof Decimal
        ? organizer.pendingBalance.toNumber()
        : Number(organizer.pendingBalance) || 0;

      if (currentPending <= 0) {
        return { processed: false, reason: 'No pending balance' };
      }

      // Check if 24 hours have passed since first paid sale
      const firstPaidSale = await this.prisma.ledgerEntry.findFirst({
        where: {
          organizerId,
          type: 'TICKET_SALE',
          amount: { gt: 0 },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!firstPaidSale) {
        return { processed: false, reason: 'No paid sales found' };
      }

      const hoursSinceFirstSale = (Date.now() - firstPaidSale.createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceFirstSale < 24) {
        return { processed: false, reason: `Only ${hoursSinceFirstSale.toFixed(1)} hours since first sale` };
      }

      // Sum all ticket sales older than 24 hours (matured sales)
      const maturedSalesResult = await this.prisma.ledgerEntry.aggregate({
        where: {
          organizerId,
          type: 'TICKET_SALE',
          createdAt: { lte: twentyFourHoursAgo },
        },
        _sum: { amount: true },
      });

      const totalMaturedSales = maturedSalesResult._sum.amount 
        ? (maturedSalesResult._sum.amount instanceof Decimal 
            ? maturedSalesResult._sum.amount.toNumber() 
            : Number(maturedSalesResult._sum.amount))
        : 0;

      // Sum all refunds (absolute value since they're stored as negative)
      const refundsResult = await this.prisma.ledgerEntry.aggregate({
        where: {
          organizerId,
          type: 'REFUND',
        },
        _sum: { amount: true },
      });

      const totalRefunds = refundsResult._sum.amount 
        ? Math.abs(refundsResult._sum.amount instanceof Decimal 
            ? refundsResult._sum.amount.toNumber() 
            : Number(refundsResult._sum.amount))
        : 0;

      const shouldBeAvailableOrWithdrawn = totalMaturedSales - totalRefunds;

      const currentAvailable = organizer.availableBalance instanceof Decimal
        ? organizer.availableBalance.toNumber()
        : Number(organizer.availableBalance) || 0;
      
      const currentWithdrawn = organizer.withdrawnBalance instanceof Decimal
        ? organizer.withdrawnBalance.toNumber()
        : Number(organizer.withdrawnBalance) || 0;

      const alreadyReleased = currentAvailable + currentWithdrawn;
      const amountToMove = Math.max(0, shouldBeAvailableOrWithdrawn - alreadyReleased);
      const finalAmountToMove = Math.min(amountToMove, currentPending);

      if (finalAmountToMove > 0) {
        await this.prisma.organizerProfile.update({
          where: { id: organizerId },
          data: {
            pendingBalance: { decrement: finalAmountToMove },
            availableBalance: { increment: finalAmountToMove },
          },
        });

        this.logger.log(
          `Moved ${finalAmountToMove} from pending to available for organizer ${organizerId}`,
        );
        return { processed: true, amountMoved: finalAmountToMove };
      }

      return { processed: false, reason: 'No amount to move' };
    } catch (error) {
      this.logger.error(`Error processing pending balance for organizer ${organizerId}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger the pending balance maturity check.
   * Useful for admin to force-process pending balances.
   */
  async manualProcessPendingBalances() {
    this.logger.log('Manually triggered pending balance maturity check');
    return this.handlePendingBalanceMaturity();
  }

  /**
   * Cron job that runs every 10 minutes to check and recover stuck pending payments.
   *
   * This automatically verifies payments that are stuck in PENDING status
   * and processes them if they were successful on Monnify.
   *
   * Helps recover payments where webhook failed or was delayed.
   */
  @Cron('*/10 * * * *') // Every 10 minutes
  async checkStuckPendingPayments() {
    this.logger.log('Running automatic stuck payment recovery check...');

    try {
      // Get pending payments older than 5 minutes (webhook should have arrived by then)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const stuckPayments = await this.prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lte: fiveMinutesAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 20, // Process max 20 at a time to avoid overload
      });

      if (stuckPayments.length === 0) {
        this.logger.log('No stuck pending payments found.');
        return { checked: 0, recovered: 0, failed: 0 };
      }

      this.logger.log(`Found ${stuckPayments.length} stuck pending payments to check`);

      const results = {
        checked: stuckPayments.length,
        recovered: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Import services dynamically
      const { MonnifyService } = await import('../payments/monnify.service');
      const { PaymentsService } = await import('../payments/payments.service');
      const { TicketsService } = await import('../tickets/tickets.service');
      const { LedgerService } = await import('../ledger/ledger.service');
      const { EmailService } = await import('../emails/email.service');
      const { QrService } = await import('../qr/qr.service');
      const { MediaService } = await import('../media/media.service');
      const { ConfigService } = await import('@nestjs/config');

      const configService = new ConfigService();
      const monnifyService = new MonnifyService(configService);
      const mediaService = new MediaService(configService);
      const qrService = new QrService(mediaService);
      const emailService = new EmailService(configService);
      const ticketsService = new TicketsService(this.prisma, emailService, qrService);
      const ledgerService = new LedgerService(this.prisma);

      const paymentsService = new PaymentsService(
        this.prisma,
        configService,
        monnifyService,
        ticketsService,
        ledgerService,
        this,
      );

      for (const payment of stuckPayments) {
        try {
          const transactionRef = payment.monnifyTransactionRef || payment.reference;

          // Verify with Monnify
          const monnifyData = await monnifyService.verifyTransaction(transactionRef);

          if (monnifyData.status === 'paid' || monnifyData.status === 'success') {
            // Process the payment
            await (paymentsService as any).handleSuccessfulPayment({
              reference: payment.reference,
              amount: monnifyData.amount,
              id: monnifyData.transactionReference,
              paid_at: monnifyData.paidOn,
              customer: monnifyData.customer,
            });

            results.recovered++;
            this.logger.log(`Auto-recovered stuck payment: ${payment.reference}`);
          } else {
            this.logger.log(`Payment ${payment.reference} status on Monnify: ${monnifyData.status}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = `${payment.reference}: ${error.message}`;
          results.errors.push(errorMsg);
          this.logger.warn(`Failed to check payment ${payment.reference}:`, error.message);
        }
      }

      this.logger.log(
        `Stuck payment check complete: ${results.recovered} recovered, ${results.failed} failed out of ${results.checked} checked`
      );

      return results;
    } catch (error) {
      this.logger.error('Error in stuck payment recovery cron:', error);
      return { checked: 0, recovered: 0, failed: 0, error: error.message };
    }
  }
}
