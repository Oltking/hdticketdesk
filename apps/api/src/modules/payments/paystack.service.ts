import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get('PAYSTACK_SECRET_KEY');
    this.webhookSecret = this.configService.get('PAYSTACK_WEBHOOK_SECRET');
  }

  // ============================================
  // INITIALIZE PAYMENT
  // ============================================

  async initializePayment(data: {
    email: string;
    amount: number; // In kobo (NGN minor unit)
    reference: string;
    metadata?: any;
    callback_url?: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        data,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data);
      throw new BadRequestException('Payment initialization failed');
    }
  }

  // ============================================
  // VERIFY PAYMENT
  // ============================================

  async verifyPayment(reference: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data);
      throw new BadRequestException('Payment verification failed');
    }
  }

  // ============================================
  // WEBHOOK SIGNATURE VALIDATION
  // ============================================

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  // ============================================
  // TRANSFER (WITHDRAWAL)
  // ============================================

  async initiateTransfer(data: {
    amount: number; // In kobo
    recipient: string; // Recipient code
    reference: string;
    reason?: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        data,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Paystack transfer error:', error.response?.data);
      throw new BadRequestException('Transfer initiation failed');
    }
  }

  // ============================================
  // CREATE TRANSFER RECIPIENT
  // ============================================

  async createTransferRecipient(data: {
    type: 'nuban'; // Nigerian bank account
    name: string;
    account_number: string;
    bank_code: string;
    currency: 'NGN';
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        data,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Paystack recipient creation error:', error.response?.data);
      throw new BadRequestException('Recipient creation failed');
    }
  }

  // ============================================
  // LIST BANKS
  // ============================================

  async listBanks(country: string = 'nigeria') {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank?country=${country}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Paystack banks list error:', error.response?.data);
      throw new BadRequestException('Failed to fetch banks');
    }
  }

  // ============================================
  // RESOLVE ACCOUNT NUMBER
  // ============================================

  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Account resolution error:', error.response?.data);
      throw new BadRequestException('Account verification failed');
    }
  }
}