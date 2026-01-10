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
  AlertCircle,
  Mail,
  Loader2,
  Info,
} from 'lucide-react';

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
      console.debug('[Login] response', result);

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

      // Normal login success
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      api.setToken(result.accessToken);
      // Fetch latest user profile to ensure correct role
      console.log('Access token being sent:', api.getToken());
      const freshUser = await api.getMe();
      setUser(freshUser);
      setAuthenticated(true);

      success(`Welcome back, ${freshUser?.firstName || 'User'}!`);

      if (freshUser?.role === 'ADMIN') {
        router.replace('/admin/overview');
      } else if (freshUser?.role === 'ORGANIZER') {
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
          <Link href="/" className="text-2xl font-bold text-primary">
            hdticketdesk
          </Link>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>

        <CardContent>
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
