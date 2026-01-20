import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface MonnifyAuthResponse {
  accessToken: string;
  expiresIn: number;
}

interface MonnifyVirtualAccountResponse {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  accountReference: string;
}

interface MonnifyTransactionResponse {
  transactionReference: string;
  paymentReference: string;
  checkoutUrl: string;
}

interface MonnifyTransferResponse {
  reference: string;
  status: string;
  totalAmount: number;
}

@Injectable()
export class MonnifyService {
  private readonly logger = new Logger(MonnifyService.name);
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private contractCode: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('MONNIFY_BASE_URL') || 'https://api.monnify.com';
    this.apiKey = this.configService.get<string>('MONNIFY_API_KEY') || '';
    this.secretKey = this.configService.get<string>('MONNIFY_SECRET_KEY') || '';
    this.contractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE') || '';
  }

  /**
   * Get authentication token from Monnify
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Monnify auth failed:', data);
      throw new Error(data.responseMessage || 'Failed to authenticate with Monnify');
    }

    this.accessToken = data.responseBody.accessToken;
    this.tokenExpiry = Date.now() + (data.responseBody.expiresIn * 1000);

    return this.accessToken!;
  }

  /**
   * Create a reserved (virtual) account for an organizer
   * Monnify API: POST /api/v2/bank-transfer/reserved-accounts
   */
  async createVirtualAccount(
    organizerId: string,
    organizerName: string,
    organizerEmail: string,
  ): Promise<MonnifyVirtualAccountResponse> {
    const token = await this.getAccessToken();
    const accountReference = `HD-ORG-${organizerId}-${Date.now()}`;

    // Sanitize organizer name - Monnify has restrictions on account names
    const sanitizedName = organizerName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .substring(0, 50) // Max 50 chars
      .trim() || 'Organizer';

    const requestBody = {
      accountReference,
      accountName: `HDTicketDesk - ${sanitizedName}`,
      currencyCode: 'NGN',
      contractCode: this.contractCode,
      customerEmail: organizerEmail,
      customerName: sanitizedName,
      getAllAvailableBanks: false,
      preferredBanks: ['035'], // Wema Bank - good for VAs
    };

    this.logger.log(`Creating virtual account for ${organizerId}: ${JSON.stringify(requestBody)}`);

    const response = await fetch(`${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Failed to create virtual account:', JSON.stringify(data));
      throw new Error(data.responseMessage || 'Failed to create virtual account');
    }

    const account = data.responseBody.accounts[0];
    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountReference: data.responseBody.accountReference,
    };
  }

  /**
   * Deallocate/deactivate a virtual account
   */
  async deactivateVirtualAccount(accountReference: string): Promise<boolean> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/api/v1/bank-transfer/reserved-accounts/reference/${accountReference}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();
    return data.requestSuccessful;
  }

  /**
   * Initialize a payment transaction (for card/bank transfer payments)
   */
  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata?: Record<string, string>,
  ): Promise<MonnifyTransactionResponse> {
    const token = await this.getAccessToken();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const response = await fetch(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        customerName: metadata?.customerName || 'Customer',
        customerEmail: email,
        paymentReference: reference,
        paymentDescription: metadata?.description || 'Ticket Purchase',
        currencyCode: 'NGN',
        contractCode: this.contractCode,
        redirectUrl: `${frontendUrl}/payment/callback`,
        paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
        metadata,
      }),
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Failed to initialize transaction:', data);
      throw new Error(data.responseMessage || 'Failed to initialize transaction');
    }

    return {
      transactionReference: data.responseBody.transactionReference,
      paymentReference: data.responseBody.paymentReference,
      checkoutUrl: data.responseBody.checkoutUrl,
    };
  }

  /**
   * Verify a transaction status
   */
  async verifyTransaction(transactionReference: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/api/v2/transactions/${encodeURIComponent(transactionReference)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Failed to verify transaction:', data);
      throw new Error(data.responseMessage || 'Failed to verify transaction');
    }

    return {
      status: data.responseBody.paymentStatus?.toLowerCase(),
      amount: data.responseBody.amountPaid,
      reference: data.responseBody.paymentReference,
      transactionReference: data.responseBody.transactionReference,
      paidOn: data.responseBody.paidOn,
      paymentMethod: data.responseBody.paymentMethod,
    };
  }

  /**
   * Initiate a refund
   */
  async refundTransaction(transactionReference: string, amount?: number): Promise<any> {
    const token = await this.getAccessToken();
    const refundReference = `REFUND-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const body: any = {
      transactionReference,
      refundReference,
      refundReason: 'Customer refund request',
    };

    if (amount) {
      body.refundAmount = amount;
    }

    const response = await fetch(`${this.baseUrl}/api/v1/refunds/initiate-refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Failed to process refund:', data);
      throw new Error(data.responseMessage || 'Failed to process refund');
    }

    return data.responseBody;
  }

  /**
   * Get list of Nigerian banks
   */
  async getBanks(): Promise<any[]> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/api/v1/banks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Failed to get banks:', data);
      throw new Error(data.responseMessage || 'Failed to get banks');
    }

    // Map to consistent format
    return data.responseBody.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
      ussdTemplate: bank.ussdTemplate,
    }));
  }

  /**
   * Validate/resolve bank account
   */
  async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<{ accountNumber: string; accountName: string }> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Failed to resolve account:', data);
      throw new Error(data.responseMessage || 'Failed to resolve account');
    }

    return {
      accountNumber: data.responseBody.accountNumber,
      accountName: data.responseBody.accountName,
    };
  }

  /**
   * Initiate a single transfer (disbursement) to a bank account
   */
  async initiateTransfer(
    amount: number,
    bankCode: string,
    accountNumber: string,
    accountName: string,
    narration: string,
  ): Promise<MonnifyTransferResponse> {
    const token = await this.getAccessToken();
    const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const response = await fetch(`${this.baseUrl}/api/v2/disbursements/single`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        reference,
        narration,
        destinationBankCode: bankCode,
        destinationAccountNumber: accountNumber,
        destinationAccountName: accountName,
        currency: 'NGN',
        sourceAccountNumber: this.configService.get<string>('MONNIFY_WALLET_ACCOUNT_NUMBER'),
      }),
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Monnify transfer error:', JSON.stringify(data));
      throw new Error(data.responseMessage || 'Failed to initiate transfer');
    }

    return {
      reference: data.responseBody.reference,
      status: data.responseBody.status,
      totalAmount: data.responseBody.totalAmount,
    };
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(reference: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/api/v2/disbursements/single/summary?reference=${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(data.responseMessage || 'Failed to get transfer status');
    }

    return data.responseBody;
  }

  /**
   * Verify webhook using Monnify's transaction hash method
   * Monnify computes: SHA512(secretKey|paymentReference|amountPaid|paidOn|transactionReference)
   * SECURITY: Fails closed - rejects webhooks if secret key is not configured
   */
  verifyWebhookPayload(
    paymentReference: string,
    amountPaid: number | string,
    paidOn: string,
    transactionReference: string,
    transactionHash: string,
  ): boolean {
    // SECURITY: Fail closed - reject all webhooks if secret key is not configured
    if (!this.secretKey) {
      this.logger.error('SECURITY: Monnify secret key not configured - rejecting webhook');
      return false;
    }

    if (!transactionHash) {
      this.logger.warn('No transaction hash provided in webhook request');
      return false;
    }

    // Monnify's hash format: secretKey|paymentReference|amountPaid|paidOn|transactionReference
    const stringToHash = `${this.secretKey}|${paymentReference}|${amountPaid}|${paidOn}|${transactionReference}`;
    const computedHash = crypto
      .createHash('sha512')
      .update(stringToHash)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(transactionHash));
    } catch {
      return false;
    }
  }

}
