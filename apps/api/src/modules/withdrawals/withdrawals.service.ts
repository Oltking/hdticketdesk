import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LedgerService } from '../ledger/ledger.service';
import { PaystackService } from '../payments/paystack.service';
import { EmailService } from '../emails/email.service';
import { WithdrawalStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

@Injectable()
export class WithdrawalsService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private paystackService: PaystackService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // REQUEST WITHDRAWAL
  // ============================================

  async requestWithdrawal(userId: string, amount: number) {
    // Get organizer profile
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    // Check bank verification
    if (!organizer.bankVerified) {
      throw new BadRequestException('Please verify your bank account first');
    }

    // Check minimum withdrawal
    if (amount < 1000) {
      throw new BadRequestException('Minimum withdrawal is ₦1,000');
    }

    // Check available balance
    if (Number(organizer.availableBalance) < amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    // Check 24h cooldown from first ticket sale
    const firstTicket = await this.prisma.ticket.findFirst({
      where: {
        event: {
          organizerId: organizer.id,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (firstTicket) {
      const cooldownHours = Number(
        this.configService.get('WITHDRAWAL_COOLDOWN_HOURS', 24),
      );
      const hoursSinceFirstSale =
        (Date.now() - firstTicket.createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceFirstSale < cooldownHours) {
        throw new BadRequestException(
          `Withdrawals available ${cooldownHours} hours after first ticket sale`,
        );
      }
    }

    // Create withdrawal request
    const withdrawal = await this.prisma.withdrawal.create({
      data: {
        organizerId: organizer.id,
        amount,
        status: WithdrawalStatus.PENDING,
      },
    });

    // Send OTP for verification
    const otp = await this.generateWithdrawalOtp(userId, withdrawal.id);
    await this.emailService.sendOtpEmail(
      organizer.user.email,
      otp,
      'Withdrawal Verification',
    );

    return {
      withdrawalId: withdrawal.id,
      message: 'OTP sent to your email. Please verify to complete withdrawal.',
    };
  }

  // ============================================
  // VERIFY OTP AND PROCESS WITHDRAWAL
  // ============================================

  async verifyAndProcess(userId: string, withdrawalId: string, otp: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.organizerId !== organizer.id) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Withdrawal already processed');
    }

    // Verify OTP
    const isValidOtp = await this.verifyWithdrawalOtp(userId, withdrawalId, otp);
    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Update withdrawal status
    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.OTP_VERIFIED,
        otpVerified: true,
        otpVerifiedAt: new Date(),
      },
    });

    // Process withdrawal
    await this.processWithdrawal(withdrawalId);

    return { message: 'Withdrawal processed successfully' };
  }

  // ============================================
  // PROCESS WITHDRAWAL (INTERNAL)
  // ============================================

  private async processWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        organizer: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    try {
      // Update status to processing
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.PROCESSING,
        },
      });

      // Create transfer recipient if not exists
      // In production, you'd store recipient code in organizer profile
      const recipientData = await this.paystackService.createTransferRecipient({
        type: 'nuban',
        name: withdrawal.organizer.accountName,
        account_number: withdrawal.organizer.accountNumber,
        bank_code: withdrawal.organizer.bankName, // Should be bank code, not name
        currency: 'NGN',
      });

      // Initiate transfer
      const transferReference = `WTH-${nanoid(12)}`;
      const transferData = await this.paystackService.initiateTransfer({
        amount: Number(withdrawal.amount) * 100, // Convert to kobo
        recipient: recipientData.data.recipient_code,
        reference: transferReference,
        reason: 'Ticket sales withdrawal',
      });

      // Update withdrawal
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.COMPLETED,
          paystackTransferId: transferData.data.id,
          paystackReference: transferReference,
          completedAt: new Date(),
        },
      });

      // Update ledger
      await this.ledgerService.recordWithdrawal({
        organizerId: withdrawal.organizerId,
        withdrawalId,
        amount: Number(withdrawal.amount),
      });
    } catch (error) {
      // Mark as failed
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.FAILED,
          failureReason: error.message,
        },
      });

      throw error;
    }
  }

  // ============================================
  // OTP HELPERS
  // ============================================

  private async generateWithdrawalOtp(
    userId: string,
    withdrawalId: string,
  ): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.prisma.otpVerification.create({
      data: {
        userId,
        code: otp,
        type: 'WITHDRAWAL',
        expiresAt,
      },
    });

    return otp;
  }

  private async verifyWithdrawalOtp(
    userId: string,
    withdrawalId: string,
    code: string,
  ): Promise<boolean> {
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        userId,
        code,
        type: 'WITHDRAWAL',
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return false;
    }

    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    return true;
  }

  // ============================================
  // GET WITHDRAWAL HISTORY
  // ============================================

  async getHistory(userId: string) {
    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });

    if (!organizer) {
      throw new NotFoundException('Organizer profile not found');
    }

    return this.prisma.withdrawal.findMany({
      where: { organizerId: organizer.id },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}