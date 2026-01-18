import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PaystackService } from '../payments/paystack.service';
import { LedgerService } from '../ledger/ledger.service';
import { EmailService } from '../emails/email.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paystackService: PaystackService,
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

    // Check available balance
    if (amount > availableBalance) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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

    if (withdrawal.otpCode !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (withdrawal.otpExpiresAt && withdrawal.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
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

    try {
      // Get or create Paystack recipient
      let recipientCode = withdrawal.organizer.paystackRecipientCode;

      if (!recipientCode) {
        this.logger.log(`Creating transfer recipient for organizer ${withdrawal.organizerId}`);
        const recipient = await this.paystackService.createTransferRecipient(
          withdrawal.accountName,
          withdrawal.accountNumber,
          withdrawal.bankCode,
        );
        recipientCode = recipient.recipient_code;

        // Save recipient code
        await this.prisma.organizerProfile.update({
          where: { id: withdrawal.organizerId },
          data: { paystackRecipientCode: recipientCode },
        });
        this.logger.log(`Created recipient code: ${recipientCode}`);
      }

      // Ensure recipientCode is not null before transfer
      if (!recipientCode) {
        throw new Error('Failed to create transfer recipient');
      }

      // Initiate transfer
      const withdrawalAmount = withdrawal.amount instanceof Decimal 
        ? withdrawal.amount.toNumber() 
        : Number(withdrawal.amount);

      this.logger.log(`Initiating transfer of ${withdrawalAmount} to ${recipientCode}`);
      
      const transferResult = await this.paystackService.initiateTransfer(
        withdrawalAmount,
        recipientCode,
        `Withdrawal for ${withdrawal.organizer.title}`,
      );

      this.logger.log(`Transfer initiated: ${JSON.stringify(transferResult)}`);

      // Update withdrawal status and save transfer reference
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { 
          status: 'COMPLETED', 
          processedAt: new Date(),
          paystackTransferRef: transferResult?.reference || null,
          paystackTransferCode: transferResult?.transfer_code || null,
        },
      });

      // Update organizer balance
      await this.prisma.organizerProfile.update({
        where: { id: withdrawal.organizerId },
        data: { 
          availableBalance: { decrement: withdrawal.amount },
          withdrawnBalance: { increment: withdrawal.amount },
        },
      });

      // Record in ledger
      await this.ledgerService.recordWithdrawal(
        withdrawal.organizerId, 
        withdrawalId, 
        withdrawalAmount
      );

      // Send success email
      await this.emailService.sendWithdrawalEmail(withdrawal.organizer.user.email, {
        amount: withdrawalAmount,
        bankName: withdrawal.bankName,
        accountNumber: withdrawal.accountNumber,
        status: 'success',
      });

      this.logger.log(`Withdrawal ${withdrawalId} completed successfully`);
    } catch (error: any) {
      this.logger.error(`Withdrawal ${withdrawalId} failed:`, error);
      
      // Update withdrawal status to failed
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'FAILED',
          failureReason: error.message || 'Transfer failed',
        },
      });

      const withdrawalAmount = withdrawal.amount instanceof Decimal 
        ? withdrawal.amount.toNumber() 
        : Number(withdrawal.amount);

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
