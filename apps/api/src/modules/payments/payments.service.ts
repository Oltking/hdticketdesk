import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PaystackService } from './paystack.service';
import { nanoid } from 'nanoid';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // INITIALIZE TICKET PURCHASE
  // ============================================

  async initializeTicketPurchase(data: {
    eventId: string;
    tierId: string;
    buyerEmail: string;
    quantity?: number;
  }) {
    // Get event and tier
    const tier = await this.prisma.ticketTier.findUnique({
      where: { id: data.tierId },
      include: { event: true },
    });

    if (!tier) {
      throw new Error('Ticket tier not found');
    }

    // Check availability
    const quantity = data.quantity || 1;
    if (tier.sold + quantity > tier.capacity) {
      throw new Error('Not enough tickets available');
    }

    // Calculate amounts
    const ticketPrice = Number(tier.price);
    const platformFeePercentage = Number(
      this.configService.get('PLATFORM_FEE_PERCENTAGE', 0.05),
    );
    const platformFee = ticketPrice * platformFeePercentage;
    const totalAmount = ticketPrice; // Buyer pays ticket price, fee is invisible

    // Generate reference
    const reference = `TKT-${nanoid(12)}`;

    // Initialize payment with Paystack
    const paymentData = await this.paystack.initializePayment({
      email: data.buyerEmail,
      amount: Math.round(totalAmount * 100), // Convert to kobo
      reference,
      metadata: {
        eventId: data.eventId,
        tierId: data.tierId,
        quantity,
        ticketPrice,
        platformFee,
      },
      callback_url: `${this.configService.get('APP_URL')}/payment/callback`,
    });

    return {
      reference,
      authorizationUrl: paymentData.data.authorization_url,
      accessCode: paymentData.data.access_code,
    };
  }

  // ============================================
  // VERIFY PAYMENT
  // ============================================

  async verifyPayment(reference: string) {
    const verification = await this.paystack.verifyPayment(reference);

    if (verification.data.status !== 'success') {
      throw new Error('Payment not successful');
    }

    return verification.data;
  }

  // ============================================
  // CALCULATE PLATFORM FEE
  // ============================================

  calculatePlatformFee(amount: number): number {
    const feePercentage = Number(
      this.configService.get('PLATFORM_FEE_PERCENTAGE', 0.05),
    );
    return amount * feePercentage;
  }
}