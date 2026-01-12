import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'BUYER' | 'ORGANIZER' | 'ADMIN';
  emailVerified: boolean;
  organizerProfile?: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setAuthenticated: (value) => set({ isAuthenticated: value, isLoading: false }),


  login: async (email, password) => {
    const { user, accessToken } = await api.login({ email, password });
    api.setToken(accessToken);
    // Always fetch fresh user data after login to ensure correct role
    const freshUser = await api.getMe?.() || user;
    set({ user: freshUser, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    const result = await api.register(data);
    // Registration now requires email verification first
    // Don't set authenticated state - user needs to verify email
    // The result contains userId, email, role but no tokens
    if (result.accessToken) {
      // If tokens are returned (email already verified case), set them
      api.setToken(result.accessToken);
      const freshUser = await api.getMe?.() || result.user;
      set({ user: freshUser, isAuthenticated: true, isLoading: false });
    } else {
      // Email verification required - don't authenticate yet
      set({ isLoading: false });
    }
  },

  logout: () => {
    api.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
