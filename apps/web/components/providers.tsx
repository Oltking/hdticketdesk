'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { ToastProvider } from '@/hooks/use-toast';

// Separate component to handle auth initialization
// This prevents Zustand hydration issues during SSG
function AuthInitializer({ children }: { children: ReactNode }) {
  const { setUser, setAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((user) => {
          setUser(user);
          setAuthenticated(true);
        })
        .catch(() => {
          api.setToken(null);
          setAuthenticated(false);
        });
    } else {
      // No token - mark as not authenticated and stop loading
      setAuthenticated(false);
    }
  }, [setUser, setAuthenticated]);

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
        <AuthInitializer>{children}</AuthInitializer>
      </ToastProvider>
    </QueryClientProvider>
  );
}
