'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setAuthenticated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const errorParam = searchParams.get('error');
      const setupRequired = searchParams.get('setupRequired');

      if (errorParam) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (!accessToken || !refreshToken) {
        setError('Missing authentication tokens.');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      try {
        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        api.setToken(accessToken);

        // Check if organizer needs to complete setup
        if (setupRequired === 'organizer') {
          // Redirect to organizer setup page to collect organization name
          router.replace('/auth/organizer-setup');
          return;
        }

        // Fetch user profile
        const user = await api.getMe();
        
        if (!user) {
          throw new Error('Failed to fetch user profile');
        }

        setUser(user);
        setAuthenticated(true);

        // Redirect based on role
        if (user.role === 'ADMIN') {
          router.replace('/admin/overview');
        } else if (user.role === 'ORGANIZER') {
          // Check if organizer profile exists, if not redirect to setup
          if (!user.organizerProfile) {
            router.replace('/auth/organizer-setup');
          } else {
            router.replace('/dashboard');
          }
        } else {
          router.replace('/tickets');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Failed to complete authentication. Please try again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, setUser, setAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-gray-600">Completing sign in...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
