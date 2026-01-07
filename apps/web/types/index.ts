export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'ORGANIZER' | 'ADMIN';
  emailVerified: boolean;
  phone?: string;
  organizerProfile?: OrganizerProfile;
  createdAt: string;
}

export interface OrganizerProfile {
  id: string;
  title: string;
  bio?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  pendingBalance: number;
  availableBalance: number;
  withdrawnBalance: number;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isOnline: boolean;
  onlineLink?: string;
  coverImage?: string;
  gallery?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  organizer?: OrganizerProfile;
  organizerId: string;
  tiers: TicketTier[];
  totalTicketsSold: number;
  totalRevenue: number;
  isFeatured?: boolean;
  createdAt: string;
}

export interface TicketTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  sold: number;
  refundEnabled: boolean;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  status: 'ACTIVE' | 'CHECKED_IN' | 'REFUNDED' | 'CANCELLED';
  qrCode: string;
  qrCodeUrl?: string;
  amountPaid: number;
  buyerId: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerEmail: string;
  eventId: string;
  event: Event;
  tierId: string;
  tier: TicketTier;
  checkedInAt?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  type: 'TICKET_SALE' | 'PLATFORM_FEE' | 'REFUND' | 'WITHDRAWAL' | 'CHARGEBACK';
  amount: number;
  description?: string;
  createdAt: string;
}
