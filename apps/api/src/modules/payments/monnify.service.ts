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
  private defaultNin: string;
  private defaultBvn: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('MONNIFY_BASE_URL') || 'https://api.monnify.com';
    this.apiKey = this.configService.get<string>('MONNIFY_API_KEY') || '';
    this.secretKey = this.configService.get<string>('MONNIFY_SECRET_KEY') || '';
    this.contractCode = this.configService.get<string>('MONNIFY_CONTRACT_CODE') || '';
    this.defaultNin = this.configService.get<string>('MONNIFY_DEFAULT_NIN') || '';
    this.defaultBvn = this.configService.get<string>('MONNIFY_DEFAULT_BVN') || '';
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
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Monnify auth failed:', data);
      throw new Error(data.responseMessage || 'Failed to authenticate with Monnify');
    }

    this.accessToken = data.responseBody.accessToken;
    this.tokenExpiry = Date.now() + data.responseBody.expiresIn * 1000;

    return this.accessToken!;
  }

  /**
   * Create a reserved (virtual) account for an organizer
   * Monnify API: POST /api/v1/bank-transfer/reserved-accounts
   *
   * Note: Uses v1 endpoint as v2 may have different requirements
   */
  async createVirtualAccount(
    organizerId: string,
    organizerName: string,
    organizerEmail: string,
  ): Promise<MonnifyVirtualAccountResponse> {
    const token = await this.getAccessToken();
    const accountReference = `HD-ORG-${organizerId}-${Date.now()}`;

    // Sanitize organizer name - Monnify has restrictions on account names
    const sanitizedName =
      organizerName
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
        .substring(0, 50) // Max 50 chars
        .trim() || 'Organizer';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!organizerEmail || !emailRegex.test(organizerEmail)) {
      throw new Error('Valid organizer email is required to create virtual account');
    }

    // Build request body - Monnify requires either NIN or BVN for reserved accounts
    const requestBody: Record<string, any> = {
      accountReference,
      accountName: sanitizedName, // Monnify will prefix with your business name
      currencyCode: 'NGN',
      contractCode: this.contractCode,
      customerEmail: organizerEmail,
      customerName: sanitizedName,
      getAllAvailableBanks: true, // Let Monnify use available banks
    };

    // Add NIN or BVN - required by Monnify for reserved account creation
    // Priority: NIN > BVN (NIN is preferred by Monnify)
    if (this.defaultNin) {
      requestBody.nin = this.defaultNin;
      this.logger.log(`Using default NIN for virtual account creation`);
    } else if (this.defaultBvn) {
      requestBody.bvn = this.defaultBvn;
      this.logger.log(`Using default BVN for virtual account creation`);
    } else {
      this.logger.warn('No NIN or BVN configured - virtual account creation may fail');
      this.logger.warn('Set MONNIFY_DEFAULT_NIN or MONNIFY_DEFAULT_BVN in your environment');
    }

    this.logger.log(`Creating virtual account for ${organizerId}`);
    this.logger.log(
      `Request: ${JSON.stringify({ ...requestBody, nin: requestBody.nin ? '***' : undefined, bvn: requestBody.bvn ? '***' : undefined })}`,
    );
    this.logger.log(`Contract Code: ${this.contractCode}`);
    this.logger.log(`Base URL: ${this.baseUrl}`);

    // Use v2 endpoint which supports NIN/BVN
    const response = await fetch(`${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    this.logger.log(`Monnify response: ${JSON.stringify(data)}`);

    if (!data.requestSuccessful) {
      this.logger.error('Failed to create virtual account:', JSON.stringify(data));

      // Provide more helpful error messages
      let errorMessage = data.responseMessage || 'Failed to create virtual account';

      if (
        errorMessage.toLowerCase().includes('bvn') ||
        errorMessage.toLowerCase().includes('nin')
      ) {
        errorMessage =
          'NIN or BVN is required. Please set MONNIFY_DEFAULT_NIN or MONNIFY_DEFAULT_BVN in your environment configuration.';
      } else if (errorMessage.includes('business category')) {
        errorMessage =
          'Reserved accounts not enabled for your Monnify account. Please contact Monnify support.';
      } else if (errorMessage.includes('contract')) {
        errorMessage =
          'Invalid contract code. Please verify MONNIFY_CONTRACT_CODE in your configuration.';
      } else if (errorMessage.includes('email')) {
        errorMessage = 'Invalid email format provided.';
      }

      throw new Error(errorMessage);
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
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();
    return data.requestSuccessful;
  }

  /**
   * Initialize a payment transaction (for card/bank transfer payments)
   * Monnify expects amount in Naira (not kobo)
   */
  async initializeTransaction(
    email: string,
    amount: number,
    reference: string,
    metadata?: Record<string, string>,
  ): Promise<MonnifyTransactionResponse> {
    const token = await this.getAccessToken();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    // Validate amount - Monnify has minimum transaction amount
    if (amount < 100) {
      throw new Error('Minimum transaction amount is ₦100');
    }

    // Round to 2 decimal places to avoid floating point issues
    const roundedAmount = Math.round(amount * 100) / 100;

    // Sanitize text fields - remove emojis and special characters that might cause issues
    const sanitizeField = (text: string): string => {
      if (!text) return text;
      // Remove emojis and other problematic Unicode characters
      return text
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
        .substring(0, 500) // Limit length
        .trim();
    };

    const sanitizedDescription = sanitizeField(
      metadata?.description || 'Ticket Purchase'
    );
    const sanitizedCustomerName = sanitizeField(
      metadata?.customerName || 'Customer'
    );

    // Build request body - ensure all values are properly formatted
    const requestBody = {
      amount: roundedAmount,
      customerName: sanitizedCustomerName,
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: sanitizedDescription,
      currencyCode: 'NGN',
      contractCode: this.contractCode,
      redirectUrl: `${frontendUrl}/payment/callback`,
      paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
      metadata: metadata ? {
        ...metadata,
        description: sanitizedDescription,
        customerName: sanitizedCustomerName,
      } : undefined,
    };

    this.logger.log(`Initializing Monnify transaction:`, {
      reference,
      amount: roundedAmount,
      email,
      contractCode: this.contractCode,
      frontendUrl,
      metadataKeys: metadata ? Object.keys(metadata) : [],
      description: sanitizedDescription,
    });

    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/merchant/transactions/init-transaction`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError) {
      this.logger.error(`Network error calling Monnify:`, {
        error: (fetchError as any).message,
        stack: (fetchError as any).stack,
      });
      throw new Error(`Failed to connect to payment gateway: ${(fetchError as any).message}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      this.logger.error(`Failed to parse Monnify response:`, {
        status: response.status,
        statusText: response.statusText,
        error: (parseError as any).message,
      });
      throw new Error(`Invalid response from payment gateway. Status: ${response.status}`);
    }

    this.logger.log(`Monnify response received:`, {
      requestSuccessful: data.requestSuccessful,
      responseCode: data.responseCode,
      responseMessage: data.responseMessage,
      hasResponseBody: !!data.responseBody,
    });

    if (!data.requestSuccessful) {
      const errorDetails = {
        responseCode: data.responseCode,
        responseMessage: data.responseMessage,
        requestBody: requestBody,
        fullResponse: JSON.stringify(data),
      };
      this.logger.error('Failed to initialize transaction:', errorDetails);
      
      // Provide more specific error message based on response
      let userMessage = data.responseMessage || 'Failed to initialize transaction';
      if (data.responseCode === '04' || data.responseCode === 'INVALID_REQUEST') {
        userMessage = 'Invalid payment request. Please check your details and try again.';
      } else if (data.responseCode === '02') {
        userMessage = 'Invalid payment credentials. Please contact support.';
      } else if (data.responseCode === '99') {
        userMessage = 'Payment service temporarily unavailable. Please try again.';
      } else if (userMessage.includes('contract')) {
        userMessage = 'Payment configuration error. Please contact support.';
      }
      
      throw new Error(userMessage);
    }

    if (!data.responseBody?.transactionReference) {
      this.logger.error('Missing transaction reference in Monnify response:', JSON.stringify(data));
      throw new Error('Payment gateway did not return transaction reference');
    }

    this.logger.log(`Transaction initialized successfully: ${data.responseBody.transactionReference}`);

    return {
      transactionReference: data.responseBody.transactionReference,
      paymentReference: data.responseBody.paymentReference,
      checkoutUrl: data.responseBody.checkoutUrl,
    };
  }

  /**
   * Verify a transaction status
   * Can use either transactionReference or paymentReference
   * Will try both if the first one fails
   */
  async verifyTransaction(reference: string, paymentReference?: string): Promise<any> {
    const token = await this.getAccessToken();

    this.logger.log(`Verifying transaction with reference: ${reference}`);

    // Try with the provided reference first
    let response = await fetch(
      `${this.baseUrl}/api/v2/transactions/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    let data = await response.json();
    this.logger.log(`First attempt response: ${JSON.stringify(data)}`);

    // If failed and we have a payment reference to try, attempt with that
    if (!data.requestSuccessful && paymentReference && paymentReference !== reference) {
      this.logger.log(`First attempt failed, trying with payment reference: ${paymentReference}`);

      response = await fetch(
        `${this.baseUrl}/api/v2/transactions/${encodeURIComponent(paymentReference)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      data = await response.json();
      this.logger.log(`Second attempt response: ${JSON.stringify(data)}`);
    }

    if (!response.ok) {
      this.logger.error(`Monnify API returned HTTP ${response.status}: ${response.statusText}`);
      this.logger.error(`Response body: ${JSON.stringify(data)}`);
      throw new Error(`Monnify API error: ${response.status} ${response.statusText}`);
    }

    if (!data.requestSuccessful) {
      this.logger.error('Failed to verify transaction:', JSON.stringify(data));
      this.logger.error(
        `Tried references: ${reference}${paymentReference ? `, ${paymentReference}` : ''}`,
      );
      throw new Error(data.responseMessage || 'Failed to verify transaction');
    }

    const paymentStatus = data.responseBody.paymentStatus?.toUpperCase();

    // Normalize status - Monnify uses PAID, we normalize to 'paid' or 'success'
    let normalizedStatus = 'pending';
    if (paymentStatus === 'PAID' || paymentStatus === 'SUCCESS') {
      normalizedStatus = 'paid';
    } else if (
      paymentStatus === 'FAILED' ||
      paymentStatus === 'EXPIRED' ||
      paymentStatus === 'CANCELLED'
    ) {
      normalizedStatus = 'failed';
    }

    this.logger.log(`Transaction ${reference} status: ${paymentStatus} -> ${normalizedStatus}`);

    return {
      status: normalizedStatus,
      rawStatus: paymentStatus,
      amount: data.responseBody.amountPaid,
      reference: data.responseBody.paymentReference,
      transactionReference: data.responseBody.transactionReference,
      paidOn: data.responseBody.paidOn,
      paymentMethod: data.responseBody.paymentMethod,
      customer: data.responseBody.customer,
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
        Authorization: `Bearer ${token}`,
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
        Authorization: `Bearer ${token}`,
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
  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountNumber: string; accountName: string }> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
   * Monnify charges a fee for transfers - ensure wallet has sufficient balance
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

    const sourceAccountNumber = this.configService.get<string>('MONNIFY_WALLET_ACCOUNT_NUMBER');

    if (!sourceAccountNumber) {
      this.logger.error('MONNIFY_WALLET_ACCOUNT_NUMBER not configured');
      throw new Error('Withdrawal system not properly configured. Please contact support.');
    }

    // Round amount to avoid floating point issues
    const roundedAmount = Math.round(amount * 100) / 100;

    const requestBody = {
      amount: roundedAmount,
      reference,
      narration: narration.substring(0, 100), // Monnify has narration length limit
      destinationBankCode: bankCode,
      destinationAccountNumber: accountNumber,
      destinationAccountName: accountName,
      currency: 'NGN',
      sourceAccountNumber,
    };

    this.logger.log(
      `Initiating transfer: ${reference}, amount: ${roundedAmount}, to: ${accountNumber}`,
    );

    const response = await fetch(`${this.baseUrl}/api/v2/disbursements/single`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!data.requestSuccessful) {
      this.logger.error('Monnify transfer error:', JSON.stringify(data));

      // Provide user-friendly error messages
      let errorMessage = data.responseMessage || 'Failed to initiate transfer';
      if (errorMessage.includes('insufficient')) {
        errorMessage = 'Transfer service temporarily unavailable. Please try again later.';
      } else if (errorMessage.includes('account')) {
        errorMessage = 'Invalid bank account details. Please verify and try again.';
      }

      throw new Error(errorMessage);
    }

    this.logger.log(
      `Transfer initiated: ${data.responseBody.reference}, status: ${data.responseBody.status}`,
    );

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
          Authorization: `Bearer ${token}`,
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
    const computedHash = crypto.createHash('sha512').update(stringToHash).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(transactionHash));
    } catch {
      return false;
    }
  }
}
