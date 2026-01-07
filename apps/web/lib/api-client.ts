const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
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
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // ==================== AUTH ====================
  async register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }) {
    return this.request<{ user: any; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ user: any; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    this.setToken(null);
  }

  // ==================== HOMEPAGE SECTIONS ====================
  
  // Carousel: Up to 6 nearest upcoming events, fallback to whatever available
  async getCarouselEvents() {
    return this.request<any[]>('/events/carousel');
  }

  // Live Now: Events currently happening
  async getLiveEvents() {
    return this.request<any[]>('/events/live');
  }

  // Trending: Most ticket sales in last 7 days
  async getTrendingEvents() {
    return this.request<any[]>('/events/trending');
  }

  // Upcoming: Events starting soon
  async getUpcomingEvents() {
    return this.request<any[]>('/events/upcoming');
  }

  // Featured: Organizer-promoted events
  async getFeaturedEvents() {
    return this.request<any[]>('/events/featured');
  }

  // ==================== EVENTS ====================
  async getEvents(params?: { search?: string; sort?: string; filter?: string; page?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ events: any[]; total: number; page: number }>(`/events?${query}`);
  }

  async getEventBySlug(slug: string) {
    return this.request<any>(`/events/${slug}`);
  }

  async getMyEvents() {
    return this.request<any[]>('/events/my');
  }

  async createEvent(data: any) {
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

  async publishEvent(id: string) {
    return this.request<any>(`/events/${id}/publish`, {
      method: 'POST',
    });
  }

  async getEventAnalytics(id: string) {
    return this.request<any>(`/events/${id}/analytics`);
  }

  // ==================== TICKETS ====================
  async initializePayment(eventId: string, tierId: string, quantity = 1) {
    return this.request<{ authorizationUrl: string; reference: string }>('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ eventId, tierId, quantity }),
    });
  }

  async getMyTickets() {
    return this.request<any[]>('/tickets/my');
  }

  async validateQr(code: string, eventId: string) {
    return this.request<any>('/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ code, eventId }),
    });
  }

  // ==================== USER ====================
  async updateProfile(data: any) {
    return this.request<any>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateBankDetails(data: any) {
    return this.request<any>('/users/bank', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getBanks() {
    return this.request<any[]>('/payments/banks');
  }

  async resolveAccount(accountNumber: string, bankCode: string) {
    return this.request<{ accountName: string }>('/payments/resolve-account', {
      method: 'POST',
      body: JSON.stringify({ accountNumber, bankCode }),
    });
  }

  // ==================== BALANCE & WITHDRAWALS ====================
  async getBalance() {
    return this.request<{ pending: number; available: number; withdrawn: number }>('/users/balance');
  }

  async getWithdrawableAmount() {
    return this.request<{ pending: number; available: number; withdrawn: number; withdrawable: number }>('/withdrawals/available');
  }

  async requestWithdrawal(amount: number) {
    return this.request<{ withdrawalId: string }>('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async verifyWithdrawalOtp(withdrawalId: string, otp: string) {
    return this.request('/withdrawals/verify', {
      method: 'POST',
      body: JSON.stringify({ withdrawalId, otp }),
    });
  }

  async getWithdrawalHistory() {
    return this.request<any[]>('/withdrawals/history');
  }

  // ==================== REFUNDS ====================
  async requestRefund(ticketId: string, reason?: string) {
    return this.request('/refunds/request', {
      method: 'POST',
      body: JSON.stringify({ ticketId, reason }),
    });
  }

  // ==================== ADMIN ====================
  async getAdminDashboard() {
    return this.request<any>('/admin/dashboard');
  }

  async getAdminUsers() {
    return this.request<any>('/admin/users');
  }

  async getAdminEvents() {
    return this.request<any>('/admin/events');
  }

  async getAdminLedger() {
    return this.request<any>('/admin/ledger');
  }
}

export const api = new ApiClient();
