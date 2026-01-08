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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { Eye, EyeOff, X, AlertCircle, Mail, Loader2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

// Error message mapping for user-friendly messages
const getErrorMessage = (error: string): { message: string; action?: string; actionType?: 'resend' | 'signup' | 'reset' } => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('not verified') || errorLower.includes('verify your email') || errorLower.includes('email not verified')) {
    return {
      message: 'Your email is not verified yet.',
      action: 'Resend verification email',
      actionType: 'resend'
    };
  }
  
  if (errorLower.includes('not found') || errorLower.includes('no user') || errorLower.includes('user not found') || errorLower.includes('does not exist')) {
    return {
      message: 'No account found with this email.',
      action: 'Create an account',
      actionType: 'signup'
    };
  }
  
  if (errorLower.includes('incorrect password') || errorLower.includes('invalid password') || errorLower.includes('wrong password') || errorLower.includes('invalid credentials')) {
    return {
      message: 'Incorrect password. Please try again.',
      action: 'Reset password',
      actionType: 'reset'
    };
  }
  
  if (errorLower.includes('too many') || errorLower.includes('rate limit') || errorLower.includes('locked')) {
    return {
      message: 'Too many login attempts. Please try again in a few minutes.',
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    return {
      message: 'Connection failed. Please check your internet and try again.',
    };
  }
  
  if (errorLower.includes('disabled') || errorLower.includes('suspended') || errorLower.includes('banned')) {
    return {
      message: 'Your account has been suspended. Please contact support.',
    };
  }
  
  return { message: error || 'Login failed. Please try again.' };
};

export default function LoginPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; action?: string; actionType?: string } | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({ 
    resolver: zodResolver(schema) 
  });

  const watchedEmail = watch('email');

  const handleResendVerification = async () => {
    if (!userEmail && !watchedEmail) {
      showError('Please enter your email address first');
      return;
    }
    
    setResendingEmail(true);
    try {
      await api.resendVerification(userEmail || watchedEmail);
      success('Verification email sent! Please check your inbox.');
      setErrorState(null);
    } catch (err: any) {
      showError(err.message || 'Failed to resend verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleErrorAction = () => {
    if (!errorState?.actionType) return;
    
    switch (errorState.actionType) {
      case 'resend':
        handleResendVerification();
        break;
      case 'signup':
        router.push('/signup');
        break;
      case 'reset':
        router.push(`/forgot-password${watchedEmail ? `?email=${encodeURIComponent(watchedEmail)}` : ''}`);
        break;
    }
  };

  const onSubmit = async (data: FormData) => {
    setErrorState(null);
    setUserEmail(data.email);
    
    try {
      const result = await api.login(data);
      
      if (result.requiresOtp) {
        success('Verification code sent to your email');
        router.push(`/verify-email?userId=${result.userId}&type=NEW_DEVICE_LOGIN`);
        return;
      }
      
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      api.setToken(result.accessToken);
      setUser(result.user);
      success(`Welcome back, ${result.user?.firstName || 'User'}!`);
      
      // Redirect based on role
      if (result.user?.role === 'ADMIN') {
        router.push('/admin/overview');
      } else if (result.user?.role === 'ORGANIZER') {
        router.push('/dashboard');
      } else {
        router.push('/tickets');
      }
    } catch (err: any) {
      const errorInfo = getErrorMessage(err.message);
      setErrorState(errorInfo);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <Card className="w-full max-w-md relative shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200 z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        <CardHeader className="text-center pb-2">
          <Link href="/" className="text-2xl font-bold text-primary mb-2 block hover:opacity-80 transition-opacity">
            hdticketdesk
          </Link>
          <CardTitle className="text-xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Error Alert */}
          {errorState && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">{errorState.message}</p>
                  {errorState.action && (
                    <button
                      type="button"
                      onClick={handleErrorAction}
                      disabled={resendingEmail}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-medium flex items-center gap-1"
                    >
                      {resendingEmail && <Loader2 className="h-3 w-3 animate-spin" />}
                      {errorState.actionType === 'resend' && resendingEmail ? 'Sending...' : errorState.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input 
                  id="email"
                  type="email" 
                  placeholder="you@example.com"
                  {...register('email')} 
                  className={errors.email ? 'border-red-500 pr-10' : ''}
                />
                {errors.email && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href={`/forgot-password${watchedEmail ? `?email=${encodeURIComponent(watchedEmail)}` : ''}`}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input 
                  id="password"
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Enter your password"
                  {...register('password')} 
                  className={errors.password ? 'border-red-500 pr-20' : 'pr-10'}
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to hdticketdesk?</span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Sign up
                </Button>
              </Link>
              <Link href="/signup?role=organizer">
                <Button variant="outline" className="w-full">
                  Become Organizer
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}