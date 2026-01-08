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
    return this.request<{ 
      user: any; 
      accessToken: string; 
      refreshToken: string;
      userId: string;
      message?: string;
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

  async verifyOtp(data: { userId: string; code: string; type: string }) {
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

  async resendOtp(data: { userId: string; type: string }) {
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
    return this.request<any>('/auth/me');
  }

  async logout() {
    this.setToken(null);
    localStorage.removeItem('refreshToken');
  }

  // ==================== HOMEPAGE SECTIONS ====================
  
  async getCarouselEvents() {
    return this.request<any[]>('/events/carousel');
  }

  async getLiveEvents() {
    return this.request<any[]>('/events/live');
  }

  async getTrendingEvents() {
    return this.request<any[]>('/events/trending');
  }

  async getUpcomingEvents() {
    return this.request<any[]>('/events/upcoming');
  }

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

  async getEventById(id: string) {
    return this.request<any>(`/events/id/${id}`);
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

  async deleteEvent(id: string) {
    return this.request<{ message: string }>(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async publishEvent(id: string) {
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
    return this.request<any[]>(`/events/${id}/tickets`);
  }

  // ==================== TICKETS ====================
  async initializePayment(eventId: string, tierId: string, quantity = 1) {
    return this.request<{ authorizationUrl: string; reference: string }>('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ eventId, tierId, quantity }),
    });
  }

  async verifyPayment(reference: string) {
    return this.request<{ ticket: any; message: string }>(`/payments/verify/${reference}`);
  }

  async getMyTickets() {
    return this.request<any[]>('/tickets/my');
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
    }>('/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ code, eventId }),
    });
  }

  async checkInTicket(ticketId: string) {
    return this.request<{ message: string; ticket: any }>(`/tickets/${ticketId}/checkin`, {
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

  async getProfile() {
    return this.request<any>('/users/profile');
  }

  async getBanks() {
    return this.request<any[]>('/payments/banks');
  }

  async resolveAccount(accountNumber: string, bankCode: string) {
    return this.request<{ accountName: string; accountNumber: string }>('/payments/resolve-account', {
      method: 'POST',
      body: JSON.stringify({ accountNumber, bankCode }),
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
    }>('/withdrawals/available');
  }

  async requestWithdrawal(amount: number) {
    return this.request<{ withdrawalId: string; message: string }>('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async verifyWithdrawalOtp(withdrawalId: string, otp: string) {
    return this.request<{ message: string }>('/withdrawals/verify', {
      method: 'POST',
      body: JSON.stringify({ withdrawalId, otp }),
    });
  }

  async getWithdrawalHistory() {
    return this.request<any[]>('/withdrawals/history');
  }

  // ==================== REFUNDS ====================
  async requestRefund(ticketId: string, reason?: string) {
    return this.request<{ refundId: string; message: string }>('/refunds/request', {
      method: 'POST',
      body: JSON.stringify({ ticketId, reason }),
    });
  }

  async getMyRefunds() {
    return this.request<any[]>('/refunds/my');
  }

  async getOrganizerRefunds() {
    return this.request<any[]>('/refunds/organizer');
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
    if (folder) formData.append('folder', folder);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json() as Promise<{ url: string; publicId: string }>;
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
}

export const api = new ApiClient();
