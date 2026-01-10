'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export function useAuth(requireAuth = false, allowedRoles?: string[]) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect buyers to their tickets page; admins to admin overview; others to home
      if (user.role === 'BUYER') {
        router.replace('/tickets');
      } else if (user.role === 'ADMIN') {
        router.replace('/admin/overview');
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isLoading, user, requireAuth, allowedRoles, router]);

  return { user, isAuthenticated, isLoading };
}
