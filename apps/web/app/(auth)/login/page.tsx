'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

import {
  Eye,
  EyeOff,
  X,
  Mail,
  Loader2,
  Info,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Separator } from '@/components/ui/separator';

// Google Icon SVG component
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/* =======================
   Validation
======================= */
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

/* =======================
   Error Handling Types
======================= */
interface ErrorInfo {
  message: string;
  action?: string;
  actionType?: 'resend' | 'signup' | 'reset' | 'verify';
  userId?: string;
  email?: string;
}

/* =======================
   Error Mapping
======================= */
const getErrorInfo = (error: string, responseData?: any): ErrorInfo => {
  const errorLower = error.toLowerCase();

  if (
    errorLower.includes('not verified') || 
    errorLower.includes('verify your email') || 
    errorLower.includes('email not verified') ||
    errorLower.includes('verification required') ||
    errorLower.includes('please verify')
  ) {
    return {
      message: 'Your email is not verified yet. Please verify to continue.',
      action: 'Verify Email Now',
      actionType: 'verify',
      userId: responseData?.userId,
    };
  }

  if (
    errorLower.includes('not found') ||
    errorLower.includes('no user') ||
    errorLower.includes('does not exist')
  ) {
    return {
      message: 'No account found with this email.',
      action: 'Create an account',
      actionType: 'signup',
    };
  }

  if (
    errorLower.includes('incorrect password') ||
    errorLower.includes('invalid password')
  ) {
    return {
      message: 'Incorrect password. Please try again.',
      action: 'Reset password',
      actionType: 'reset',
    };
  }

  return { message: error || 'Login failed. Please try again.' };
};

/* =======================
   Component
======================= */
export default function LoginPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { setUser, setAuthenticated } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [errorState, setErrorState] = useState<ErrorInfo | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedEmail = watch('email');

  /* =======================
     Resend Verification
  ======================= */
  const handleResendVerification = async () => {
    const email = userEmail || watchedEmail;

    if (!email) {
      showError('Please enter your email address first');
      return;
    }

    setResendingEmail(true);
    try {
      console.debug('[ResendVerification] payload', { email });
      const res = await api.resendVerification(email);
      console.debug('[ResendVerification] response', res);
      success('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      showError(err.message || 'Failed to resend verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  /* =======================
     Error Action Handler
  ======================= */
  const handleErrorAction = () => {
    if (!errorState?.actionType) return;

    switch (errorState.actionType) {
      case 'verify': {
        const params = new URLSearchParams();
        const uid = unverifiedUserId || errorState.userId;
        if (uid) params.set('userId', uid);
        const e = userEmail || watchedEmail;
        if (e) params.set('email', e);
        params.set('type', 'EMAIL_VERIFICATION');
        try {
          if (uid) localStorage.setItem('pendingVerificationUserId', uid);
          if (e) localStorage.setItem('pendingVerificationEmail', e);
        } catch (err) {
          console.debug('[Login] failed to persist pending verification info', err);
        }
        router.push(`/verify-email?${params.toString()}`);
        break;
      }

      case 'signup':
        router.push('/signup');
        break;

      case 'reset':
        router.push(
          `/forgot-password${
            watchedEmail ? `?email=${encodeURIComponent(watchedEmail)}` : ''
          }`
        );
        break;

      case 'resend':
        handleResendVerification();
        break;
    }
  };

  /* =======================
     Submit
  ======================= */
  const onSubmit = async (data: FormData) => {
    setErrorState(null);
    setUserEmail(data.email);
    setUnverifiedUserId(null);

    try {
      const result = await api.login(data);

      // Handle new device OTP required
      if (result.requiresOtp && result.userId) {
        // Redirect to OTP verification page
        const params = new URLSearchParams();
        params.set('userId', result.userId);
        params.set('email', data.email);
        params.set('type', 'NEW_DEVICE_LOGIN');
        router.push(`/verify-email?${params.toString()}`);
        return;
      }

      // Email exists but not verified (success response case)
      if (result.user?.emailVerified === false) {
        const uid = result.userId || result.user?.id;

        setUnverifiedUserId(uid);
        setErrorState({
          message: 'Your email is not verified yet. Please verify to continue.',
          action: 'Verify Email Now',
          actionType: 'verify',
          userId: uid,
          email: data.email,
        });

        return;
      }

      // Normal login success - check if tokens exist
      if (!result.accessToken || !result.refreshToken) {
        console.error('[Login] Missing tokens in response:', { 
          hasAccessToken: !!result.accessToken, 
          hasRefreshToken: !!result.refreshToken 
        });
        setErrorState({
          message: 'Login failed. Please try again.',
        });
        return;
      }

      // Set tokens
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      api.setToken(result.accessToken);
      
      console.log('[Login] Tokens set successfully');
      
      // Use the user from login response if available, otherwise fetch fresh
      let user = result.user;
      
      if (!user || !user.role) {
        console.log('[Login] Fetching fresh user profile...');
        try {
          user = await api.getMe();
          console.log('[Login] Fresh user fetched:', user);
        } catch (meError: any) {
          console.error('[Login] Failed to fetch user profile:', meError);
          // Still proceed with login using the user from result if available
          if (result.user) {
            user = result.user;
            console.log('[Login] Using user from login response instead');
          } else {
            setErrorState({
              message: 'Login succeeded but failed to load profile. Please refresh.',
            });
            return;
          }
        }
      }
      
      setUser(user);
      setAuthenticated(true);

      success(`Welcome back, ${user?.firstName || 'User'}!`);

      if (user?.role === 'ADMIN') {
        router.replace('/admin/overview');
      } else if (user?.role === 'ORGANIZER') {
        router.replace('/dashboard');
      } else {
        router.replace('/tickets');
      }
    } catch (err: any) {
      const backendCode = err?.response?.data?.code;
      const userId = err?.response?.data?.userId ?? null;

      // 🔐 SINGLE unverified-email handler
      if (backendCode === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedUserId(userId);
        setErrorState({
          message: 'Your email is not verified yet. Please verify to continue.',
          action: 'Verify Email Now',
          actionType: 'verify',
          userId,
          email: data.email,
        });
        return;
      }

      const errorInfo = getErrorInfo(err.message, { userId });
      setErrorState(errorInfo);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  /* =======================
     Render
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <Card className="w-full max-w-md relative shadow-xl">
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border"
        >
          <X className="h-4 w-4" />
        </button>

        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Logo href="/" size="lg" showText={false} />
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 flex items-center justify-center gap-2 h-11 border-gray-300 hover:bg-gray-50"
            onClick={() => {
              window.location.href = api.getGoogleAuthUrl();
            }}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {errorState && (
            <div className="mb-4 p-4 rounded-lg border bg-amber-50 border-amber-200">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    {errorState.message}
                  </p>
                  {errorState.action && (
                    <button
                      onClick={handleErrorAction}
                      className="mt-2 underline text-sm text-amber-700 flex items-center gap-1"
                    >
                      {resendingEmail ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Mail className="h-3 w-3" />
                      )}
                      {errorState.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input {...register('email')} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href={`/forgot-password${watchedEmail ? `?email=${encodeURIComponent(watchedEmail)}` : ''}`}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
