import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private secretKey: string;
  private baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata?: Record<string, string>,
  ) {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        reference,
        metadata,
        callback_url: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/payment/callback`,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize transaction');
    }

    return data.data;
  }

  async verifyTransaction(reference: string) {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to verify transaction');
    }

    return data.data;
  }

  async refundTransaction(reference: string, amountInKobo?: number) {
    const body: any = { transaction: reference };
    if (amountInKobo) {
      body.amount = amountInKobo;
    }

    const response = await fetch(`${this.baseUrl}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to process refund');
    }

    return data.data;
  }

  async createTransferRecipient(
    accountName: string,
    accountNumber: string,
    bankCode: string,
  ) {
    const response = await fetch(`${this.baseUrl}/transferrecipient`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to create transfer recipient');
    }

    return data.data;
  }

  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reason: string,
  ) {
    const response = await fetch(`${this.baseUrl}/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initiate transfer');
    }

    return data.data;
  }

  async getBanks() {
    const response = await fetch(`${this.baseUrl}/bank`, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to get banks');
    }

    return data.data;
  }

  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    const response = await fetch(
      `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to resolve account');
    }

    // Map Paystack's snake_case response to camelCase for frontend
    return {
      accountNumber: data.data.account_number,
      accountName: data.data.account_name,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}
