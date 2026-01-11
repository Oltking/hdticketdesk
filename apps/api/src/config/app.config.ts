export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '5'),
  withdrawalWaitHours: parseInt(process.env.WITHDRAWAL_WAIT_HOURS || '24', 10),
  refundWindowHours: parseInt(process.env.REFUND_WINDOW_HOURS || '24', 10),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),

  // Security
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  loginLockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10),
});
