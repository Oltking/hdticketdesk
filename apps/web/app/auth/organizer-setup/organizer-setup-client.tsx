'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const schema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
});

type FormData = z.infer<typeof schema>;

export default function OrganizerSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const { success, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // Check if user is authenticated
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        api.setToken(accessToken);
        const user = await api.getMe();
        if (user) {
          setUserName(user.firstName || '');
          // If user already has organizer profile, redirect to dashboard
          if (user.organizerProfile) {
            router.replace('/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch user', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const onSubmit = async (data: FormData) => {
    try {
      const result = await api.completeOrganizerSetup(data.organizationName);

      if (result.user) {
        setUser(result.user);
      }

      success('Your organizer profile is all set!');
      router.replace('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to complete setup. Please try again.';
      showError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>

          <CardTitle className="text-xl">
            {userName ? `Welcome, ${userName}!` : 'Almost there!'}
          </CardTitle>
          <CardDescription className="text-base">
            Just one more step to complete your organizer account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-green-50 rounded-lg border border-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-green-700 font-medium">Google account connected</span>
              <p className="text-green-600 text-xs">Your email has been verified</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Your company or brand name"
                {...register('organizationName')}
                className={errors.organizationName ? 'border-red-500' : ''}
                autoFocus
              />
              {errors.organizationName ? (
                <p className="text-xs text-red-500">{errors.organizationName.message}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  This will be displayed on your events and tickets
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              You can change your organization name later in settings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
