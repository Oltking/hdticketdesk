export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
  ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
  
  // OTP
  INVALID_OTP: 'Invalid or expired OTP',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  TOO_MANY_OTP_ATTEMPTS: 'Too many failed OTP attempts. Please request a new code.',
  OTP_ALREADY_SENT: 'OTP already sent. Please wait before requesting a new one.',
  
  // User
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  
  // Organizer
  ORGANIZER_PROFILE_NOT_FOUND: 'Organizer profile not found',
  BANK_NOT_VERIFIED: 'Please verify your bank account before performing this action',
  EMAIL_NOT_VERIFIED_ORGANIZER: 'Please verify your email before publishing events',
  
  // Events
  EVENT_NOT_FOUND: 'Event not found',
  EVENT_NOT_PUBLISHED: 'Event is not published',
  EVENT_ALREADY_CANCELLED: 'Event has already been cancelled',
  EVENT_ALREADY_COMPLETED: 'Event has already completed',
  CANNOT_EDIT_PUBLISHED_EVENT: 'Cannot edit certain fields of a published event',
  
  // Tickets
  TICKET_NOT_FOUND: 'Ticket not found',
  TICKET_ALREADY_CHECKED_IN: 'Ticket has already been checked in',
  TICKET_NOT_ACTIVE: 'Ticket is not active',
  TIER_NOT_FOUND: 'Ticket tier not found',
  TIER_SOLD_OUT: 'This ticket tier is sold out',
  INVALID_QR_CODE: 'Invalid QR code',
  
  // Payments
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  PAYMENT_NOT_FOUND: 'Payment not found',
  INVALID_PAYMENT_AMOUNT: 'Invalid payment amount',
  WEBHOOK_VERIFICATION_FAILED: 'Webhook signature verification failed',
  
  // Refunds
  REFUND_NOT_FOUND: 'Refund request not found',
  REFUND_WINDOW_EXPIRED: 'Refund window has expired',
  REFUND_NOT_ENABLED: 'Refunds are not enabled for this ticket tier',
  REFUND_ALREADY_REQUESTED: 'Refund has already been requested for this ticket',
  REFUND_ALREADY_PROCESSED: 'Refund has already been processed',
  INSUFFICIENT_BALANCE_FOR_REFUND: 'Organizer has insufficient balance for refund',
  
  // Withdrawals
  WITHDRAWAL_NOT_FOUND: 'Withdrawal request not found',
  INSUFFICIENT_BALANCE: 'Insufficient available balance',
  WITHDRAWAL_NOT_ELIGIBLE: 'Not eligible for withdrawal yet. Please wait 24 hours after your first sale.',
  WITHDRAWAL_LIMIT_EXCEEDED: 'Withdrawal amount exceeds available limit',
  WITHDRAWAL_ALREADY_PROCESSING: 'You have a withdrawal already in progress',
  BANK_ACCOUNT_REQUIRED: 'Please add and verify your bank account before withdrawing',
  
  // Media
  FILE_TOO_LARGE: 'File is too large. Maximum size is 2MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Allowed types: JPG, PNG, WebP.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  
  // General
  INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
  VALIDATION_ERROR: 'Validation failed',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
};
