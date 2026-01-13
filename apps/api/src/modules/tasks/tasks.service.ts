import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cron job that runs every hour to move pending balances to available balances
   * for organizers who have had their first paid sale more than 24 hours ago.
   * 
   * This ensures organizers can withdraw their earnings even if no new sales come in
   * after the 24-hour waiting period.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePendingBalanceMaturity() {
    this.logger.log('Running pending balance maturity check...');

    try {
      // Get all organizers with pending balance > 0
      const organizersWithPending = await this.prisma.organizerProfile.findMany({
        where: {
          pendingBalance: { gt: 0 },
        },
        select: {
          id: true,
          pendingBalance: true,
        },
      });

      if (organizersWithPending.length === 0) {
        this.logger.log('No organizers with pending balance found.');
        return;
      }

      let processedCount = 0;

      for (const organizer of organizersWithPending) {
        // Find the first paid sale for this organizer
        const firstPaidSale = await this.prisma.ledgerEntry.findFirst({
          where: {
            organizerId: organizer.id,
            type: 'TICKET_SALE',
            amount: { gt: 0 }, // Only paid tickets (amount > 0), excludes free tickets
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!firstPaidSale) {
          // No paid sales yet, skip this organizer
          continue;
        }

        const hoursSinceFirstSale = 
          (Date.now() - firstPaidSale.createdAt.getTime()) / (1000 * 60 * 60);

        // If 24 hours have passed since first paid sale, move pending to available
        if (hoursSinceFirstSale >= 24) {
          const pendingAmount = organizer.pendingBalance instanceof Decimal
            ? organizer.pendingBalance.toNumber()
            : Number(organizer.pendingBalance);

          if (pendingAmount > 0) {
            await this.prisma.organizerProfile.update({
              where: { id: organizer.id },
              data: {
                pendingBalance: { decrement: pendingAmount },
                availableBalance: { increment: pendingAmount },
              },
            });

            this.logger.log(
              `Moved ${pendingAmount} from pending to available for organizer ${organizer.id}`,
            );
            processedCount++;
          }
        }
      }

      this.logger.log(
        `Pending balance maturity check completed. Processed ${processedCount} organizers.`,
      );
    } catch (error) {
      this.logger.error('Error during pending balance maturity check:', error);
    }
  }
}
