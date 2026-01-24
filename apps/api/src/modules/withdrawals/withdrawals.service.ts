import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MonnifyService } from '../payments/monnify.service';
import { LedgerService } from '../ledger/ledger.service';
import { EmailService } from '../emails/email.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private monnifyService: MonnifyService,
    private ledgerService: LedgerService,
    private emailService: EmailService,
  ) {}

  async getWithdrawableAmount(organizerId: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    const pendingBalance = organizer.pendingBalance instanceof Decimal 
      ? organizer.pendingBalance.toNumber() 
      : Number(organizer.pendingBalance);
      
    const availableBalance = organizer.availableBalance instanceof Decimal 
      ? organizer.availableBalance.toNumber() 
      : Number(organizer.availableBalance);
      
    const withdrawnBalance = organizer.withdrawnBalance instanceof Decimal 
      ? organizer.withdrawnBalance.toNumber() 
      : Number(organizer.withdrawnBalance);

    return {
      pending: pendingBalance,
      available: availableBalance,
      withdrawn: withdrawnBalance,
      withdrawable: availableBalance,
    };
  }

  async requestWithdrawal(organizerId: string, amount: number) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { id: organizerId },
      include: { user: true },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    // Check if bank details are set
    if (!organizer.bankCode || !organizer.accountNumber || !organizer.accountName) {
      throw new BadRequestException('Please set up your bank details first');
    }

    // Check 24-hour rule: Find the first PAID ticket sale (amount > 0)
    // Free tickets (amount = 0) should not count towards this restriction
    const firstPaidSale = await this.prisma.ledgerEntry.findFirst({
      where: {
        organizerId,
        type: 'TICKET_SALE',
        amount: { gt: 0 }, // Only paid tickets (amount > 0)
      },
      orderBy: { createdAt: 'asc' },
    });

    if (firstPaidSale) {
      const hoursSinceFirstSale = (Date.now() - firstPaidSale.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFirstSale < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceFirstSale);
        throw new BadRequestException(
          `Not eligible for withdrawal yet. Please wait ${hoursRemaining} more hour${hoursRemaining > 1 ? 's' : ''} after your first paid sale.`,
        );
      }
    }

    const availableBalance = organizer.availableBalance instanceof Decimal 
      ? organizer.availableBalance.toNumber() 
      : Number(organizer.availableBalance);

    // Minimum withdrawal amount (₦1,000)
    const minimumWithdrawal = 1000;
    if (amount < minimumWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal amount is ₦${minimumWithdrawal.toLocaleString()}`);
    }

    // Check available balance
    if (amount > availableBalance) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Prevent multiple pending withdrawals
    const pendingWithdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        organizerId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pendingWithdrawal) {
      throw new BadRequestException('You have a pending withdrawal. Please wait for it to complete before requesting another.');
    }

    // Generate OTP - cryptographically secure
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(
      Date.now() +
        (this.configService.get<number>('OTP_EXPIRY_MINUTES') || 10) * 60 * 1000,
    );

    // Create withdrawal request
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        amount,
        status: 'PENDING',
        organizerId,
        bankName: organizer.bankName || '',
        bankCode: organizer.bankCode || '',
        accountNumber: organizer.accountNumber || '',
        accountName: organizer.accountName || '',
        otpCode: otp,
        otpExpiresAt: otpExpiry,
      },
    });

    // Send OTP email
    await this.emailService.sendWithdrawalOtpEmail(
      organizer.user.email,
      otp,
      amount,
    );

    return {
      withdrawalId: withdrawal.id,
      message: 'OTP sent to your email',
    };
  }

  async verifyWithdrawalOtp(
    organizerId: string,
    withdrawalId: string,
    otp: string,
  ) {
    const withdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        organizerId,
        status: 'PENDING',
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    // SECURITY: Check OTP attempt limit (max 5 attempts)
    const maxAttempts = 5;
    if ((withdrawal.otpAttempts || 0) >= maxAttempts) {
      // Cancel the withdrawal request after too many failed attempts
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'FAILED',
          failureReason: 'Too many failed OTP attempts',
          otpCode: null,
          otpExpiresAt: null,
        },
      });
      throw new BadRequestException('Too many failed attempts. Withdrawal request cancelled for security.');
    }

    if (withdrawal.otpExpiresAt && withdrawal.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    const otpMatch = withdrawal.otpCode && otp && 
      crypto.timingSafeEqual(Buffer.from(withdrawal.otpCode), Buffer.from(otp.padEnd(withdrawal.otpCode.length)));
    
    if (!otpMatch) {
      // Increment attempt counter
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { otpAttempts: (withdrawal.otpAttempts || 0) + 1 },
      });
      const remaining = maxAttempts - (withdrawal.otpAttempts || 0) - 1;
      throw new BadRequestException(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }

    // Update status to processing
    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'PROCESSING',
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Process withdrawal in background
    this.processWithdrawal(withdrawalId).catch(console.error);

    return { message: 'Withdrawal is being processed' };
  }

  private async processWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        organizer: {
          include: { user: true },
        },
      },
    });

    if (!withdrawal) {
      this.logger.error(`Withdrawal not found: ${withdrawalId}`);
      return;
    }

    // Get withdrawal amount
    const withdrawalAmount = withdrawal.amount instanceof Decimal 
      ? withdrawal.amount.toNumber() 
      : Number(withdrawal.amount);

    // Track if balance was deducted (for rollback on failure)
    let balanceDeducted = false;

    try {
      this.logger.log(`Initiating Monnify transfer of ${withdrawalAmount} to ${withdrawal.accountNumber}`);
      
      // Initiate transfer via Monnify
      const transferResult = await this.monnifyService.initiateTransfer(
        withdrawalAmount,
        withdrawal.bankCode,
        withdrawal.accountNumber,
        withdrawal.accountName,
        `HDTicketDesk withdrawal for ${withdrawal.organizer.title}`,
      );

      this.logger.log(`Monnify transfer initiated: ${JSON.stringify(transferResult)}`);

      // Update withdrawal status to PROCESSING (will be updated to COMPLETED by webhook)
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { 
          status: 'PROCESSING', 
          monnifyTransferRef: transferResult.reference,
          monnifyTransferStatus: transferResult.status,
        },
      });

      // Deduct from available balance ONLY after Monnify accepts the transfer
      await this.prisma.organizerProfile.update({
        where: { id: withdrawal.organizerId },
        data: { 
          availableBalance: { decrement: withdrawal.amount },
        },
      });
      balanceDeducted = true;

      // Record in ledger ONLY after balance is deducted
      await this.ledgerService.recordWithdrawal(
        withdrawal.organizerId, 
        withdrawalId, 
        withdrawalAmount
      );

      // If transfer is already successful (some transfers complete immediately)
      if (transferResult.status === 'SUCCESS') {
        await this.prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: { 
            status: 'COMPLETED', 
            processedAt: new Date(),
          },
        });

        // Update withdrawn balance
        await this.prisma.organizerProfile.update({
          where: { id: withdrawal.organizerId },
          data: { 
            withdrawnBalance: { increment: withdrawal.amount },
          },
        });

        // Send success email
        await this.emailService.sendWithdrawalEmail(withdrawal.organizer.user.email, {
          amount: withdrawalAmount,
          bankName: withdrawal.bankName,
          accountNumber: withdrawal.accountNumber,
          status: 'success',
        });

        this.logger.log(`Withdrawal ${withdrawalId} completed successfully`);
      } else {
        // Transfer is pending - webhook will update final status
        this.logger.log(`Withdrawal ${withdrawalId} initiated, awaiting confirmation`);
      }
    } catch (error: any) {
      this.logger.error(`Withdrawal ${withdrawalId} failed:`, error);
      
      // CRITICAL: Restore balance if it was deducted before the failure
      if (balanceDeducted) {
        try {
          await this.prisma.organizerProfile.update({
            where: { id: withdrawal.organizerId },
            data: { 
              availableBalance: { increment: withdrawal.amount },
            },
          });
          this.logger.log(`Balance restored for failed withdrawal ${withdrawalId}`);
        } catch (restoreError) {
          // Critical error - manual intervention needed
          this.logger.error(`CRITICAL: Failed to restore balance for withdrawal ${withdrawalId}:`, restoreError);
        }
      }
      
      // Update withdrawal status to failed
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'FAILED',
          failureReason: error.message || 'Transfer failed',
        },
      });

      // Send failure email
      await this.emailService.sendWithdrawalEmail(withdrawal.organizer.user.email, {
        amount: withdrawalAmount,
        bankName: withdrawal.bankName,
        accountNumber: withdrawal.accountNumber,
        status: 'failed',
        reason: error.message || 'Transfer failed',
      });
    }
  }

  async getWithdrawalHistory(organizerId: string) {
    return this.prisma.withdrawal.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        bankName: true,
        accountNumber: true,
        createdAt: true,
        processedAt: true,
        failureReason: true,
      },
    });
  }
}
