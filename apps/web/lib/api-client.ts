
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private accessToken: string | null = null;

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
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getToken(): string | null {
    // Always try to get from localStorage first to ensure we have the latest token
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        this.accessToken = storedToken;
      }
    }
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    return this.request<{
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
}

export const api = new ApiClient();