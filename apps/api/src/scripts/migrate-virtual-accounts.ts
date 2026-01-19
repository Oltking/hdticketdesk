/**
 * Migration Script: Create Virtual Accounts for Existing Organizers
 * 
 * This script creates Monnify virtual accounts for all organizers who have
 * at least one published event but don't have a virtual account yet.
 * 
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/migrate-virtual-accounts.ts
 * Or add to package.json: "migrate:va": "ts-node -r tsconfig-paths/register src/scripts/migrate-virtual-accounts.ts"
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

interface MonnifyAuthResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    accessToken: string;
    expiresIn: number;
  };
}

interface MonnifyVAResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    accountReference: string;
    accountName: string;
    currencyCode: string;
    customerEmail: string;
    customerName: string;
    accounts: Array<{
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }>;
  };
}

class MonnifyMigration {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private contractCode: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env.MONNIFY_BASE_URL || 'https://api.monnify.com';
    this.apiKey = process.env.MONNIFY_API_KEY || '';
    this.secretKey = process.env.MONNIFY_SECRET_KEY || '';
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE || '';

    if (!this.apiKey || !this.secretKey || !this.contractCode) {
      throw new Error('Missing Monnify credentials. Please set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE');
    }
  }

  private async getAccessToken(): Promise<string> {
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

    const data: MonnifyAuthResponse = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(`Monnify auth failed: ${data.responseMessage}`);
    }

    this.accessToken = data.responseBody.accessToken;
    this.tokenExpiry = Date.now() + (data.responseBody.expiresIn * 1000);

    return this.accessToken!;
  }

  async createVirtualAccount(
    organizerId: string,
    organizerName: string,
    organizerEmail: string,
  ): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
    accountReference: string;
  }> {
    const token = await this.getAccessToken();
    const accountReference = `HD-ORG-${organizerId}-${Date.now()}`;

    const response = await fetch(`${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountReference,
        accountName: `HDTicketDesk - ${organizerName}`,
        currencyCode: 'NGN',
        contractCode: this.contractCode,
        customerEmail: organizerEmail,
        customerName: organizerName,
        getAllAvailableBanks: false,
        preferredBanks: ['035'], // Wema Bank
      }),
    });

    const data: MonnifyVAResponse = await response.json();

    if (!data.requestSuccessful) {
      throw new Error(`Failed to create VA: ${data.responseMessage}`);
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
}

async function migrateVirtualAccounts() {
  console.log('🚀 Starting Virtual Account Migration...\n');

  const monnify = new MonnifyMigration();

  // Find all organizers with at least one published event but no virtual account
  const organizersToMigrate = await prisma.organizerProfile.findMany({
    where: {
      virtualAccount: null, // No VA yet
      events: {
        some: {
          status: 'PUBLISHED', // Has at least one published event
        },
      },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      events: {
        where: {
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  console.log(`📋 Found ${organizersToMigrate.length} organizers needing virtual accounts\n`);

  if (organizersToMigrate.length === 0) {
    console.log('✅ No organizers need migration. All caught up!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const organizer of organizersToMigrate) {
    console.log(`\n📦 Processing: ${organizer.title} (${organizer.user.email})`);
    console.log(`   Published events: ${organizer.events.length}`);

    try {
      // Create virtual account with Monnify
      const vaResponse = await monnify.createVirtualAccount(
        organizer.id,
        organizer.title || 'Organizer',
        organizer.user.email,
      );

      // Save to database
      await prisma.virtualAccount.create({
        data: {
          accountNumber: vaResponse.accountNumber,
          accountName: vaResponse.accountName,
          bankName: vaResponse.bankName,
          bankCode: vaResponse.bankCode,
          accountReference: vaResponse.accountReference,
          monnifyContractCode: process.env.MONNIFY_CONTRACT_CODE!,
          organizerId: organizer.id,
        },
      });

      console.log(`   ✅ Created VA: ${vaResponse.accountNumber} (${vaResponse.bankName})`);
      successCount++;

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(50));
}

// Run the migration
migrateVirtualAccounts()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
