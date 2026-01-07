export const APP_NAME = 'hdticketdesk';
export const APP_DESCRIPTION = "Africa's Premier Event Ticketing Platform";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hdticketdesk.com';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  EVENTS: '/events',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  PAYOUTS: '/payouts',
  TICKETS: '/tickets',
  REFUNDS: '/refunds',
  ADMIN: '/admin/overview',
} as const;

export const EVENT_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export const TICKET_STATUS = {
  ACTIVE: 'ACTIVE',
  CHECKED_IN: 'CHECKED_IN',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;

export const USER_ROLES = {
  BUYER: 'BUYER',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
} as const;

export const PLATFORM_FEE_PERCENTAGE = 5;

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
