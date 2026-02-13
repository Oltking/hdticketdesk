
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Session expiry event - components can listen to this
export const SESSION_EXPIRED_EVENT = 'session-expired';

// Token refresh timing constants
const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 1000; // Refresh 2 minutes before expiry
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute

// If the user has been idle for too long, we consider the session ended (even if refresh token still exists).
// This prevents users from returning after many hours and still appearing logged in.
const IDLE_SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Used only for proactive access-token refresh while user is actively using the site.
const INACTIVITY_THRESHOLD = 14 * 60 * 1000; // 14 minutes (just under 15min access token expiry)

// Dispatch session expired event so the app can handle it
function dispatchSessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { message: 'Your session has expired. Please log in again.' }
    }));
  }
}

// Parse JWT to get expiration time
function getTokenExpiration(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private lastActivityTime: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private activityListenersAdded = false;

  private readonly lastActivityKey = 'lastActivityTime';

  constructor() {
    // Hydrate last activity time on startup so idle time survives page refresh.
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.lastActivityKey);
      if (stored) {
        const parsed = Number(stored);
        if (!Number.isNaN(parsed)) {
          this.lastActivityTime = parsed;
        }
      }
    }
  }

    async updateOrganizerBank(data: { bankCode: string; accountNumber: string; accountName: string; bankName?: string }) {
      return this.request<{ message: string; organizerProfile: any }>(
        '/organizer/bank', {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    }

  setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token);
        // Start activity tracking when we have a token
        this.startActivityTracking();
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        // Stop activity tracking when token is cleared
        this.stopActivityTracking();
      }
    }
  }

  /**
   * Record user activity - call this on user interactions
   */
  recordActivity() {
    this.lastActivityTime = Date.now();
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.lastActivityKey, String(this.lastActivityTime));
    }
  }

  /**
   * If user has been idle too long, end the session.
   */
  isIdleSessionExpired(): boolean {
    return Date.now() - this.lastActivityTime > IDLE_SESSION_TIMEOUT;
  }

  /**
   * Check if user is currently active (has interacted recently)
   */
  isUserActive(): boolean {
    return Date.now() - this.lastActivityTime < INACTIVITY_THRESHOLD;
  }

  /**
   * Start tracking user activity and proactively refresh tokens
   */
  private startActivityTracking() {
    if (typeof window === 'undefined' || this.activityListenersAdded) return;

    // Track user activity
    const activityHandler = () => this.recordActivity();
    
    window.addEventListener('click', activityHandler, { passive: true });
    window.addEventListener('keydown', activityHandler, { passive: true });
    window.addEventListener('scroll', activityHandler, { passive: true });
    window.addEventListener('mousemove', activityHandler, { passive: true });
    window.addEventListener('touchstart', activityHandler, { passive: true });
    
    this.activityListenersAdded = true;

    // Periodically check if we need to refresh the token
    this.activityCheckInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, ACTIVITY_CHECK_INTERVAL);

    // Initial activity timestamp
    this.recordActivity();
  }

  /**
   * Stop tracking user activity
   */
  private stopActivityTracking() {
    if (typeof window === 'undefined') return;

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    
    // Note: We don't remove event listeners to avoid complexity
    // They will just update lastActivityTime which is harmless
  }

  /**
   * Check if token is about to expire and refresh it proactively if user is active
   */
  private async checkAndRefreshToken() {
    const token = this.getToken();
    if (!token) return;

    const expiration = getTokenExpiration(token);
    if (!expiration) return;

    const timeUntilExpiry = expiration - Date.now();
    
    // If token expires soon and user is active, refresh proactively
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0) {
      if (this.isUserActive()) {
        console.log('[Auth] Proactively refreshing token - user is active');
        await this.tryRefreshToken();
      } else {
        console.log('[Auth] Token expiring soon but user is inactive - will prompt on next action');
      }
    }
  }

  getToken(): string | null {
    // Always try to get from localStorage first to ensure we have the latest token
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        // If the user has been idle too long, force logout and do not return a token.
        if (this.isIdleSessionExpired()) {
          this.handleSessionExpired();
          return null;
        }

        this.accessToken = storedToken;
        // Ensure activity tracking is running when we have a token
        if (!this.activityListenersAdded) {
          this.startActivityTracking();
        }
      }
    }
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, skipAuthRetry = false): Promise<T> {
    // Record activity on every API request - user is clearly active
    this.recordActivity();
    
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // Handle wrapped error response
      const errorData = error.data || error;

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !skipAuthRetry && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the original request with new token
          return this.request<T>(endpoint, options, true);
        }
        
        // Refresh failed - session is expired
        this.handleSessionExpired();
        const err = new Error('Your session has expired. Please log in again.');
        (err as any).response = { data: errorData, status: 401, sessionExpired: true };
        throw err;
      }

      // Provide more helpful error messages for common status codes
      let errorMessage = errorData.message || error.message;

      // If there are detailed validation errors, include them in the message
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const detailedErrors = errorData.errors
          .map((err: any) => {
            if (err.property && err.errors) {
              return `${err.property}: ${err.errors.join(', ')}`;
            }
            return JSON.stringify(err);
          })
          .join(' | ');
        errorMessage = `${errorMessage}: ${detailedErrors}`;
      }

      if (!errorMessage) {
        if (response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else {
          errorMessage = `Request failed with status ${response.status}`;
        }
      }

      const err = new Error(errorMessage);
      (err as any).response = { data: errorData, status: response.status };
      throw err;
    }

    const json = await response.json();
    
    // Unwrap the response if it's wrapped by TransformInterceptor
    // Backend wraps responses as: { success: true, data: {...}, timestamp: "..." }
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    
    return json as T;
  }

  /**
   * Try to refresh the access token using the refresh token
   */
  private async tryRefreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve(false);
    }

    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        const result = data.data || data;
        
        if (result.accessToken) {
          this.setToken(result.accessToken);
          if (result.refreshToken && typeof window !== 'undefined') {
            localStorage.setItem('refreshToken', result.refreshToken);
          }
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Handle session expiration - clear tokens and notify the app
   */
  /**
   * Public helper: force session expired (clears tokens + emits event)
   */
  forceSessionExpired() {
    this.handleSessionExpired();
  }

  private handleSessionExpired() {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(this.lastActivityKey);
    }
    dispatchSessionExpired();
  }

  // ==================== AUTH ====================
  async register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }) {
    return this.request<{ 
      user: any; 
      accessToken: string; 
      refreshToken: string;
      userId: string;
      message?: string;
      role?: string;
      organizerProfile?: { id: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ 
      user: any; 
      accessToken: string; 
      refreshToken: string;
      requiresOtp?: boolean; 
      userId?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string) {
    return this.request<{ message: string; user?: any }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async verifyOtp(data: { userId?: string; email?: string; code: string; type: string }) {
    return this.request<{ 
      user: any; 
      accessToken: string; 
      refreshToken: string;
      message?: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resendOtp(data: { userId?: string; email?: string; type: string }) {
    return this.request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resendVerification(email: string) {
    return this.request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Get Google OAuth URL - redirects to Google consent screen
  // Pass role='organizer' for organizer signups to collect organization name after OAuth
  getGoogleAuthUrl(role?: string): string {
    const params = role ? `?role=${role}` : '';
    return `${API_BASE}/auth/google${params}`;
  }

  // Complete organizer profile setup (after Google OAuth signup)
  async completeOrganizerSetup(organizationName: string) {
    return this.request<{ message: string; user: any }>('/auth/complete-organizer-setup', {
      method: 'POST',
      body: JSON.stringify({ organizationName }),
    });
  }

  // Update organizer profile (title/organization name)
  async updateOrganizerProfile(data: { title?: string; description?: string }) {
    return this.request<{ message: string; organizerProfile: any }>('/users/organizer-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; password: string }) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getMe() {
    return this.request<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      role: 'BUYER' | 'ORGANIZER' | 'ADMIN';
      emailVerified: boolean;
      organizerProfile?: {
        id: string;
        title: string;
        pendingBalance: number;
        availableBalance: number;
        withdrawnBalance: number;
      };
    }>('/auth/me');
  }

  async logout() {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
    }
  }

  // ==================== HOMEPAGE SECTIONS ====================
  // These methods return empty arrays on error to prevent frontend crashes
  
  async getCarouselEvents(): Promise<any[]> {
    try {
      const response = await this.request<any>('/events/carousel');
      // Handle both array response and { data: [] } response
      return Array.isArray(response) ? response : (response?.data || response?.events || []);
    } catch (err) {
      console.error('Failed to fetch carousel events:', err);
      return [];
    }
  }

  async getLiveEvents(): Promise<any[]> {
    try {
      const response = await this.request<any>('/events/live');
      return Array.isArray(response) ? response : (response?.data || response?.events || []);
    } catch (err) {
      console.error('Failed to fetch live events:', err);
      return [];
    }
  }

  async getTrendingEvents(): Promise<any[]> {
    try {
      const response = await this.request<any>('/events/trending');
      return Array.isArray(response) ? response : (response?.data || response?.events || []);
    } catch (err) {
      console.error('Failed to fetch trending events:', err);
      return [];
    }
  }

  async getUpcomingEvents(): Promise<any[]> {
    try {
      const response = await this.request<any>('/events/upcoming');
      return Array.isArray(response) ? response : (response?.data || response?.events || []);
    } catch (err) {
      console.error('Failed to fetch upcoming events:', err);
      return [];
    }
  }

  async getFeaturedEvents(): Promise<any[]> {
    try {
      const response = await this.request<any>('/events/featured');
      return Array.isArray(response) ? response : (response?.data || response?.events || []);
    } catch (err) {
      console.error('Failed to fetch featured events:', err);
      return [];
    }
  }

  // ==================== EVENTS ====================
  async getEvents(params?: { search?: string; sort?: string; filter?: string; page?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ events: any[]; total: number; page: number }>(`/events?${query}`);
  }

  async getEventBySlug(slug: string) {
    return this.request<any>(`/events/${slug}`);
  }

  async getEventById(id: string) {
    // Backend uses slug-based routing, so try to get by slug (which could be an ID)
    return this.request<any>(`/events/${id}`);
  }

  async getMyEvents(): Promise<any[]> {
    try {
      const response = await this.request<any>('/events/my');
      return Array.isArray(response) ? response : (response?.data || response?.events || []);
    } catch (err) {
      console.error('Failed to fetch my events:', err);
      return [];
    }
  }

  async createEvent(data: any) {
    // Ensure we have a valid token before attempting to create an event
    const token = this.getToken();
    if (!token) {
      throw new Error('You must be logged in to create an event. Please log in and try again.');
    }
    
    return this.request<any>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: any) {
    return this.request<any>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request<{ message: string }>(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async publishEvent(id: string) {
    // Ensure we have a valid token before attempting to publish
    const token = this.getToken();
    if (!token) {
      throw new Error('You must be logged in to publish an event. Please log in and try again.');
    }
    
    return this.request<any>(`/events/${id}/publish`, {
      method: 'POST',
    });
  }

  async unpublishEvent(id: string) {
    return this.request<any>(`/events/${id}/unpublish`, {
      method: 'POST',
    });
  }

  async getEventAnalytics(id: string) {
    return this.request<any>(`/events/${id}/analytics`);
  }

  async getEventTickets(id: string) {
    return this.request<any[]>(`/tickets/event/${id}`);
  }

  // ==================== TICKETS ====================
  async initializePayment(eventId: string, tierId: string, guestEmail?: string, quantity = 1) {
    console.log('[API] Initializing payment with:', { eventId, tierId, guestEmail, quantity });
    try {
      const response = await this.request<{
        // For paid tickets
        authorizationUrl?: string;
        reference: string;
        paymentId: string;
        // Price breakdown (for service fee display)
        tierPrice?: number;
        serviceFee?: number;
        totalAmount?: number;
        // For free tickets
        isFree?: boolean;
        success?: boolean;
        ticketId?: string;
        ticketNumber?: string;
        message?: string;
      }>('/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ eventId, tierId, quantity, guestEmail }),
      });
      console.log('[API] Payment initialized successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] Payment initialization failed:', {
        message: error.message,
        response: (error as any).response,
        status: (error as any).response?.status,
      });
      throw error;
    }
  }

  async checkPendingPayments() {
    return this.request<{
      pendingPayments: any[];
      verified: { reference: string; status: string; eventTitle: string }[];
    }>('/payments/check-pending');
  }

  /**
   * Verify payment by reference - works for both guest and authenticated users
   * This is the primary method for payment recovery when users close the page
   */
  async verifyPaymentByReference(reference: string) {
    return this.request<{ 
      ticket: any; 
      message: string; 
      payment?: any;
    }>(`/payments/verify/${reference}`);
  }

  async verifyPayment(reference: string) {
    return this.request<{ ticket: any; message: string; payment?: any }>(`/payments/verify/${reference}`);
  }

  async getMyTickets(): Promise<any[]> {
    try {
      const response = await this.request<any>('/tickets/my');
      return Array.isArray(response) ? response : (response?.data || response?.tickets || []);
    } catch (err) {
      console.error('Failed to fetch my tickets:', err);
      return [];
    }
  }

  async getTicketById(id: string) {
    return this.request<any>(`/tickets/${id}`);
  }

  async getTicketByNumber(ticketNumber: string) {
    return this.request<any>(`/tickets/number/${ticketNumber}`);
  }

  // ==================== QR / CHECK-IN ====================
  async validateQr(code: string, eventId: string) {
    return this.request<{ 
      valid: boolean; 
      ticket?: any; 
      message: string;
    }>('/tickets/validate-qr', {
      method: 'POST',
      body: JSON.stringify({ qrCode: code, eventId }),
    });
  }

  async checkInTicket(ticketId: string) {
    return this.request<{ message: string; ticket: any }>(`/tickets/${ticketId}/check-in`, {
      method: 'POST',
    });
  }

  async scanQr(data: { qrCode: string; eventId: string }) {
    return this.request<{ 
      success: boolean; 
      ticket?: any; 
      message: string;
    }>('/tickets/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== USER ====================
  /**
   * Update user role (for new OAuth users selecting their role)
   */
  async updateUserRole(role: 'BUYER' | 'ORGANIZER') {
    return this.request<{ message: string; user: any }>('/users/update-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async updateProfile(data: any) {
    return this.request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateBankDetails(data: any) {
    return this.request<any>('/users/bank-details', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request<any>('/users/profile');
  }

  async getBanks(): Promise<any[]> {
    try {
      const response = await this.request<any>('/payments/banks');
      return Array.isArray(response) ? response : (response?.data || response?.banks || []);
    } catch (err) {
      console.error('Failed to fetch banks:', err);
      return [];
    }
  }

  // Get organizer payment history
  async getPaymentHistory() {
    return this.request<{ entries: any[] }>('/payments/history');
  }

  async resolveAccount(accountNumber: string, bankCode: string) {
    return this.request<{ accountName: string; accountNumber: string }>('/payments/resolve-account', {
      method: 'POST',
      body: JSON.stringify({ accountNumber, bankCode }),
    });
  }

  async verifyBankAccount(bankCode: string, accountNumber: string) {
    return this.request<{ account_name: string; account_number: string }>('/payments/verify-account', {
      method: 'POST',
      body: JSON.stringify({ bankCode, accountNumber }),
    });
  }

  // ==================== BALANCE & WITHDRAWALS ====================
  async getBalance() {
    return this.request<{ 
      pending: number; 
      available: number; 
      withdrawn: number;
      withdrawable: number;
    }>('/users/balance');
  }

  async getWithdrawableAmount() {
    return this.request<{ 
      pending: number; 
      available: number; 
      withdrawn: number; 
      withdrawable: number;
    }>('/withdrawals/balance');
  }

  async requestWithdrawal(amount: number) {
    return this.request<{ withdrawalId: string; message: string }>('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async verifyWithdrawalOtp(withdrawalId: string, otp: string) {
    return this.request<{ message: string }>(`/withdrawals/${withdrawalId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
  }

  async getWithdrawalHistory(): Promise<any[]> {
    try {
      const response = await this.request<any>('/withdrawals/history');
      return Array.isArray(response) ? response : (response?.data || response?.withdrawals || []);
    } catch (err) {
      console.error('Failed to fetch withdrawal history:', err);
      return [];
    }
  }

  // ==================== REFUNDS ====================
  async requestRefund(ticketId: string, reason?: string) {
    return this.request<{ refundId: string; message: string }>('/refunds/request', {
      method: 'POST',
      body: JSON.stringify({ ticketId, reason }),
    });
  }

  async getMyRefunds(): Promise<any[]> {
    try {
      const response = await this.request<any>('/refunds/my');
      return Array.isArray(response) ? response : (response?.data || response?.refunds || []);
    } catch (err) {
      console.error('Failed to fetch my refunds:', err);
      return [];
    }
  }

  async getOrganizerRefunds(): Promise<any[]> {
    try {
      const response = await this.request<any>('/refunds/organizer');
      return Array.isArray(response) ? response : (response?.data || response?.refunds || []);
    } catch (err) {
      console.error('Failed to fetch organizer refunds:', err);
      return [];
    }
  }

  async approveRefund(refundId: string) {
    return this.request<{ message: string }>(`/refunds/${refundId}/approve`, {
      method: 'POST',
    });
  }

  async rejectRefund(refundId: string, reason: string) {
    return this.request<{ message: string }>(`/refunds/${refundId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ==================== MEDIA ====================
  async uploadImage(file: File, folder?: string) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use folder in URL path if provided, otherwise use default endpoint
    const endpoint = folder ? `/media/upload/${folder}` : '/media/upload';
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorData = error.data || error;
      throw new Error(errorData.message || error.message || 'Upload failed');
    }

    const json = await response.json();
    
    // Unwrap the response if it's wrapped by TransformInterceptor
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as { url: string; publicId: string };
    }
    
    return json as { url: string; publicId: string };
  }

  async deleteImage(publicId: string) {
    return this.request<{ message: string }>(`/media/${publicId}`, {
      method: 'DELETE',
    });
  }

  // ==================== ADMIN ====================
  async getAdminDashboard() {
    return this.request<{
      totalUsers: number;
      totalOrganizers: number;
      totalEvents: number;
      totalTickets: number;
      totalRevenue: number;
      platformFees: number;
      recentPayments: any[];
    }>('/admin/dashboard');
  }

  async getAdminUsers(page = 1, limit = 20) {
    return this.request<{ users: any[]; total: number; page: number; totalPages: number }>(
      `/admin/users?page=${page}&limit=${limit}`
    );
  }

  async getAdminEvents(page = 1, limit = 20) {
    return this.request<{ events: any[]; total: number; page: number; totalPages: number }>(
      `/admin/events?page=${page}&limit=${limit}`
    );
  }

  async getAdminLedger(page = 1, limit = 50) {
    return this.request<{ entries: any[]; total: number; page: number; totalPages: number }>(
      `/admin/ledger?page=${page}&limit=${limit}`
    );
  }

  async getAdminRefunds(page = 1, limit = 20) {
    return this.request<{ refunds: any[]; total: number; page: number; totalPages: number }>(
      `/admin/refunds?page=${page}&limit=${limit}`
    );
  }

  async getAdminWithdrawals(page = 1, limit = 20) {
    return this.request<{ withdrawals: any[]; total: number; page: number; totalPages: number }>(
      `/admin/withdrawals?page=${page}&limit=${limit}`
    );
  }

  async adminUnpublishEvent(id: string) {
    return this.request<{ message: string; ticketsSold: number }>(`/admin/events/${id}/unpublish`, {
      method: 'POST',
    });
  }

  async adminDeleteEvent(id: string) {
    return this.request<{
      message: string;
      deletedRecords: { tickets: number; payments: number; tiers: number };
      organizer: string;
    }>(`/admin/events/${id}/delete`, {
      method: 'POST',
    });
  }

  async getAllOrganizersEarnings(page = 1, limit = 20) {
    return this.request<{
      organizers: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/admin/organizers/earnings?page=${page}&limit=${limit}`);
  }

  async getOrganizerEarnings(organizerId: string) {
    return this.request<any>(`/admin/organizers/${organizerId}/earnings`);
  }

  async processRefund(refundId: string) {
    return this.request<{ message: string; refund: any }>(`/admin/refunds/${refundId}/process`, {
      method: 'POST',
    });
  }

  async getOrganizersWithoutVirtualAccount() {
    return this.request<{
      organizers: any[];
      total: number;
    }>('/admin/organizers/no-virtual-account');
  }

  async createVirtualAccountForOrganizer(organizerId: string) {
    return this.request<{
      message: string;
      virtualAccount: any;
      organizer: { id: string; title: string; email: string };
    }>(`/admin/organizers/${organizerId}/create-virtual-account`, {
      method: 'POST',
    });
  }

  // Payment recovery methods
  async getAdminPaymentsExplorer(params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
    search?: string;
    startDate?: string;
    endDate?: string;
    organizerId?: string;
    eventId?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.organizerId) qs.set('organizerId', params.organizerId);
    if (params?.eventId) qs.set('eventId', params.eventId);

    return this.request<{
      payments: Array<{
        id: string;
        reference: string;
        amount: number;
        status: string;
        buyerEmail: string;
        monnifyTransactionRef?: string | null;
        monnifyPaymentRef?: string | null;
        createdAt: string;
        paidAt?: string | null;
        event?: { id: string; title: string; organizerId: string } | null;
        tier?: { id?: string; name?: string; price?: number } | null;
      }>;
      summary: {
        grossRevenue: number;
        platformFees: number;
        organizerNet: number;
        platformFeePercent: number;
        successfulTickets: number;
      };
      total: number;
      page: number;
      totalPages: number;
    }>(`/admin/payments${qs.toString() ? `?${qs.toString()}` : ''}`);
  }

  async getAdminFilterOrganizers() {
    return this.request<{ organizers: Array<{ id: string; title: string }> }>(
      '/admin/filters/organizers',
    );
  }

  async getAdminFilterEvents(organizerId?: string) {
    const qs = organizerId ? `?organizerId=${encodeURIComponent(organizerId)}` : '';
    return this.request<{ events: Array<{ id: string; title: string; organizerId: string }> }>(
      `/admin/filters/events${qs}`,
    );
  }

  async getAllPendingPayments(page = 1, limit = 50) {
    return this.request<{
      payments: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/admin/payments/pending?page=${page}&limit=${limit}`);
  }

  async manuallyVerifyPayment(reference: string) {
    return this.request<{
      message: string;
      payment: any;
      ticket?: any;
    }>(`/admin/payments/${reference}/verify`, {
      method: 'POST',
    });
  }

  async verifyAllPendingPayments() {
    return this.request<{
      message: string;
      total: number;
      verified: number;
      failed: number;
      errors: any[];
    }>('/admin/payments/verify-all-pending', {
      method: 'POST',
    });
  }

  async debugPaymentVerification(reference: string) {
    return this.request<any>(`/admin/payments/${encodeURIComponent(reference)}/debug`);
  }

  // Force confirm a payment (bypasses Monnify verification)
  // Use when you've manually verified in Monnify dashboard
  async forceConfirmPayment(reference: string, confirmedAmount?: number, adminNotes?: string) {
    return this.request<{
      success: boolean;
      message: string;
      payment: any;
      ticket: any;
      financials: any;
      adminNotes?: string;
    }>(`/admin/payments/${encodeURIComponent(reference)}/force-confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmedAmount, adminNotes }),
    });
  }

  // ==================== ORGANIZER DASHBOARD & RECONCILIATION ====================
  
  /**
   * Get organizer dashboard data including balances, virtual account, and stats
   */
  async getOrganizerDashboard() {
    return this.request<{
      balances: {
        pending: number;
        available: number;
        withdrawn: number;
        total: number;
        withdrawable: number;
      };
      virtualAccount: {
        accountNumber: string;
        accountName: string;
        bankName: string;
        isActive: boolean;
      } | null;
      bankDetails: {
        bankName: string | null;
        accountNumber: string | null;
        accountName: string | null;
        isVerified: boolean;
      };
      stats: {
        publishedEvents: number;
      };
    }>('/users/dashboard');
  }

  /**
   * Get organizer's virtual account (reserved account) details
   */
  async getOrganizerVirtualAccount() {
    return this.request<{
      hasVirtualAccount: boolean;
      message?: string;
      virtualAccount?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
        bankCode: string;
        isActive: boolean;
        createdAt: string;
      };
    }>('/users/virtual-account');
  }

  /**
   * Get reconciliation report for the organizer
   */
  async getReconciliationReport(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    return this.request<{
      organizerId: string;
      organizerName: string;
      period: { start: string; end: string };
      summary: {
        totalTicketSales: number;
        totalRefunds: number;
        totalWithdrawals: number;
        platformFees: number;
        netRevenue: number;
        pendingBalance: number;
        availableBalance: number;
        withdrawnBalance: number;
        calculatedBalance: number;
        balanceDiscrepancy: number;
      };
      transactions: {
        ticketSales: any[];
        refunds: any[];
        withdrawals: any[];
      };
      virtualAccount?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
      };
    }>(`/reconciliation/report${query ? `?${query}` : ''}`);
  }

  /**
   * Get daily transaction summary for the organizer
   */
  async getDailyTransactionSummary(date?: string) {
    const query = date ? `?date=${date}` : '';
    return this.request<{
      date: string;
      ticketSales: number;
      refunds: number;
      withdrawals: number;
      netChange: number;
      transactions: number;
    }>(`/reconciliation/daily-summary${query}`);
  }

  // ==================== AGENT METHODS ====================

  /**
   * Create a new agent access code for an event (organizer only)
   */
  async createAgentCode(eventId: string, label?: string) {
    return this.request<{
      id: string;
      code: string;
      label: string | null;
      isActive: boolean;
      checkInCount: number;
      createdAt: string;
      event: { id: string; title: string; slug: string };
    }>(`/agents/events/${eventId}/codes`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  }

  /**
   * Get all agent access codes for an event (organizer only)
   */
  async getEventAgentCodes(eventId: string) {
    return this.request<Array<{
      id: string;
      code: string;
      label: string | null;
      isActive: boolean;
      activatedAt: string | null;
      lastUsedAt: string | null;
      checkInCount: number;
      createdAt: string;
    }>>(`/agents/events/${eventId}/codes`);
  }

  /**
   * Deactivate an agent access code (organizer only)
   */
  async deactivateAgentCode(codeId: string) {
    return this.request(`/agents/codes/${codeId}/deactivate`, {
      method: 'PATCH',
    });
  }

  /**
   * Reactivate an agent access code (organizer only)
   */
  async reactivateAgentCode(codeId: string) {
    return this.request(`/agents/codes/${codeId}/reactivate`, {
      method: 'PATCH',
    });
  }

  /**
   * Delete an agent access code (organizer only)
   */
  async deleteAgentCode(codeId: string) {
    return this.request(`/agents/codes/${codeId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Activate/verify an agent access code (public - no auth required)
   */
  async activateAgentCode(code: string) {
    return this.request<{
      valid: boolean;
      event: {
        id: string;
        title: string;
        slug: string;
        startDate: string;
        endDate: string | null;
        location: string | null;
        coverImage: string | null;
        status: string;
      };
      label: string | null;
      checkInCount: number;
    }>('/agents/activate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  /**
   * Check in a ticket using agent access code (public - no auth required)
   */
  async agentCheckIn(qrCode: string, accessCode: string) {
    return this.request<{
      success: boolean;
      message: string;
      checkedInAt?: string;
      checkedInBy?: string;
      ticket?: {
        ticketNumber: string;
        tierName: string;
        buyerName: string;
        checkedInAt?: string;
        checkedInBy?: string;
        status?: string;
      };
    }>('/agents/check-in', {
      method: 'POST',
      body: JSON.stringify({ qrCode, accessCode }),
    });
  }
}

export const api = new ApiClient();