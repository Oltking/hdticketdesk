import { registerAs } from '@nestjs/config';

// Monnify configuration for payment processing
export default registerAs('monnify', () => ({
  apiKey: process.env.MONNIFY_API_KEY,
  secretKey: process.env.MONNIFY_SECRET_KEY,
  contractCode: process.env.MONNIFY_CONTRACT_CODE,
  baseUrl: process.env.MONNIFY_BASE_URL || 'https://api.monnify.com',
  walletAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER, // Main wallet for platform fees
  // Default NIN for reserved account creation (required by Monnify)
  defaultNin: process.env.MONNIFY_DEFAULT_NIN,
  // Alternative: BVN instead of NIN
  defaultBvn: process.env.MONNIFY_DEFAULT_BVN,
}));
