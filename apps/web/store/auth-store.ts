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
    set({ user, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    const { user, accessToken } = await api.register(data);
    api.setToken(accessToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    api.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
