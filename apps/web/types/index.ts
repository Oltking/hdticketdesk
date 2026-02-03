// ==================== USER TYPES ====================
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'BUYER' | 'ORGANIZER' | 'ADMIN';
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizerProfile?: OrganizerProfile;
}

export interface OrganizerProfile {
  id: string;
  title: string | null;
  description: string | null;
  bankName: string | null;
  bankCode: string | null;
  accountNumber: string | null;
  accountName: string | null;
  bankVerified: boolean;
  pendingBalance: number;
  availableBalance: number;
  withdrawnBalance: number;
  monnifyRecipientCode: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== EVENT TYPES ====================
export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  startDate: string;
  endDate: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  isLocationPublic: boolean;
  isOnline: boolean;
  onlineLink: string | null;
  coverImage: string | null;
  gallery: string[];
  isFeatured: boolean;
  organizerId: string;
  organizer?: OrganizerProfile & { user?: User };
  tiers?: TicketTier[];
  _count?: {
    tickets: number;
  };
  // Computed/aggregated fields from API
  totalTicketsSold?: number;
  totalRevenue?: number; // legacy (tier.sold-based)
  ticketsSold?: number;
  revenue?: number;

  // Financial truth fields (payment-backed)
  grossRevenue?: number; // gross revenue from successful tickets
  platformFees?: number; // platform fees on successful tickets
  netEarnings?: number; // organizer net earnings after fees
  platformFeePercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number;
  sold: number;
  refundEnabled: boolean;
  sortOrder: number;
  saleEndDate: string | null; // Date and time when ticket sales end for this tier
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== TICKET TYPES ====================
export interface Ticket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  qrCodeUrl: string | null;
  status: 'ACTIVE' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
  checkedInAt: string | null;
  buyerEmail: string;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerPhone: string | null;
  amountPaid: number;
  paymentRef: string | null; // Monnify transaction reference
  eventId: string;
  tierId: string;
  buyerId: string | null;
  paymentId: string;
  event?: Event;
  tier?: TicketTier;
  createdAt: string;
  updatedAt: string;
}

// ==================== PAYMENT TYPES ====================
export interface Payment {
  id: string;
  reference: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  buyerEmail: string;
  monnifyTransactionRef: string | null;
  monnifyPaymentRef: string | null;
  paidAt: string | null;
  eventId: string;
  tierId: string;
  buyerId: string | null;
  organizerId: string | null;
  event?: Event;
  tier?: TicketTier;
  createdAt: string;
  updatedAt: string;
}

// ==================== REFUND TYPES ====================
export interface Refund {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  reason: string | null;
  rejectionNote: string | null;
  refundAmount: number;
  ticketId: string;
  requesterId: string;
  processedBy: string | null;
  processedAt: string | null;
  ticket?: Ticket;
  requester?: User;
  createdAt: string;
  updatedAt: string;
}

// ==================== WITHDRAWAL TYPES ====================
export interface Withdrawal {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  monnifyTransferRef: string | null;
  monnifyTransferCode: string | null;
  monnifyTransferStatus: string | null;
  failureReason: string | null;
  processedAt: string | null;
  organizerId: string;
  organizer?: OrganizerProfile;
  createdAt: string;
  updatedAt: string;
}

// ==================== VIRTUAL ACCOUNT TYPES ====================
export interface VirtualAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  accountReference: string;
  monnifyContractCode: string;
  isActive: boolean;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== LEDGER TYPES ====================
export interface LedgerEntry {
  id: string;
  type: 'TICKET_SALE' | 'REFUND' | 'WITHDRAWAL' | 'CHARGEBACK' | 'ADJUSTMENT';
  amount: number;
  description: string | null;
  pendingBalanceAfter: number;
  availableBalanceAfter: number;
  organizerId: string;
  ticketId: string | null;
  withdrawalId: string | null;
  organizer?: OrganizerProfile;
  createdAt: string;
}

// ==================== API RESPONSE TYPES ====================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ==================== FORM TYPES ====================
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'BUYER' | 'ORGANIZER';
}

export interface EventFormData {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isLocationPublic?: boolean;
  isOnline: boolean;
  onlineLink?: string;
  coverImage?: string;
  tiers: {
    name: string;
    description?: string;
    price: number;
    capacity: number;
    refundEnabled: boolean;
  }[];
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface BankFormData {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

// ==================== DASHBOARD STATS ====================
export interface DashboardStats {
  totalUsers: number;
  totalOrganizers: number;
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
  platformFees: number;
  recentPayments: Payment[];
}

export interface OrganizerDashboardStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  pendingBalance: number;
  availableBalance: number;
  upcomingEvents: Event[];
  recentSales: Ticket[];
}

// ==================== ANALYTICS ====================
export interface EventAnalytics {
  event: Event;
  totalTickets: number;
  totalRevenue: number;
  ticketsByTier: {
    tier: TicketTier;
    sold: number;
    revenue: number;
  }[];
  salesByDay: {
    date: string;
    count: number;
    revenue: number;
  }[];
  checkIns: {
    total: number;
    checkedIn: number;
    percentage: number;
  };
}