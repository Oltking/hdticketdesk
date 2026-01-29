'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api, SESSION_EXPIRED_EVENT } from '@/lib/api-client';
import { ToastProvider, useToast } from '@/hooks/use-toast';
import { LoadingBar } from '@/components/ui/loading-bar';

// Component to handle session expiry events
function SessionExpiryHandler() {
  const router = useRouter();
  const { error: showError } = useToast();
  const { logout } = useAuthStore();

  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      // Clear auth state
      logout();
      
      // Show toast notification
      showError(event.detail?.message || 'Your session has expired. Please log in again.');
      
      // Redirect to login page after a short delay so toast is visible
      setTimeout(() => {
        router.push('/login');
      }, 500);
    };

    // Listen for session expired events
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
    
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired as EventListener);
    };
  }, [logout, router, showError]);

  return null;
}

// Separate component to handle auth initialization
// This prevents Zustand hydration issues during SSG
function AuthInitializer({ children }: { children: ReactNode }) {
  const { setUser, setAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Enforce idle-session timeout even across page refresh.
    // If the user has been away too long, clear tokens and let the session-expired handler redirect.
    if (typeof window !== 'undefined' && api.isIdleSessionExpired?.()) {
      // This triggers toast + redirect via SessionExpiryHandler
      api.forceSessionExpired();
      setAuthenticated(false);
      return;
    }

    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((user) => {
          setUser(user);
          setAuthenticated(true);
        })
        .catch((error) => {
          // Check if this is a session expiry error
          const isSessionExpired = error?.response?.sessionExpired || error?.response?.status === 401;
          
          api.setToken(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('refreshToken');
          }
          setAuthenticated(false);
          
          // If session expired, the SESSION_EXPIRED_EVENT will handle the redirect
          // For other errors, just clear auth state silently
        });
    } else {
      // No token - mark as not authenticated and stop loading
      setAuthenticated(false);
    }
  }, [setUser, setAuthenticated, logout]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Suspense fallback={null}>
          <LoadingBar />
        </Suspense>
        <SessionExpiryHandler />
        <AuthInitializer>{children}</AuthInitializer>
      </ToastProvider>
    </QueryClientProvider>
  );
}
