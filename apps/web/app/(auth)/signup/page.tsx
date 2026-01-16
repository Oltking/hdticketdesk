'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, X, AlertCircle, CheckCircle2, Loader2, User, Building2 } from 'lucide-react';
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

const baseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  organizerTitle: z.string().optional(),
});

// Schema with required organizerTitle for organizers
const organizerSchema = baseSchema.extend({
  organizerTitle: z
    .string()
    .min(1, 'Organization name is required')
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
});

type FormData = z.infer<typeof baseSchema>;

// Error message mapping for user-friendly messages
const getErrorMessage = (error: string): { message: string; action?: string; actionType?: 'login' | 'resend' } => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('already exists') || errorLower.includes('already registered') || errorLower.includes('email in use') || errorLower.includes('duplicate')) {
    return {
      message: 'An account with this email already exists.',
      action: 'Sign in instead',
      actionType: 'login'
    };
  }
  
  if (errorLower.includes('invalid email') || errorLower.includes('email format')) {
    return {
      message: 'Please enter a valid email address.',
    };
  }
  
  if (errorLower.includes('weak password') || errorLower.includes('password too short')) {
    return {
      message: 'Please choose a stronger password (at least 8 characters with uppercase, lowercase, and numbers).',
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    return {
      message: 'Connection failed. Please check your internet and try again.',
    };
  }
  
  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return {
      message: 'Too many attempts. Please try again in a few minutes.',
    };
  }
  
  return { message: error || 'Registration failed. Please try again.' };
};

// Password strength checker
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
};

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOrganizer = searchParams.get('role') === 'organizer';
  const { success, error: showError } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; action?: string; actionType?: string } | null>(null);
  
  // Use different schema based on role
  const schema = isOrganizer ? organizerSchema : baseSchema;
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    mode: 'onChange' // Validate on change for real-time feedback
  });

  const watchedPassword = watch('password') || '';
  const watchedEmail = watch('email');
  const passwordStrength = getPasswordStrength(watchedPassword);

  const handleErrorAction = () => {
    if (errorState?.actionType === 'login') {
      router.push(`/login${watchedEmail ? `?email=${encodeURIComponent(watchedEmail)}` : ''}`);
    }
  };

  const onSubmit = async (data: FormData) => {
    setErrorState(null);
    
    try {
      const result = await api.register({ 
        ...data, 
        role: isOrganizer ? 'ORGANIZER' : 'BUYER' 
      });
      
      success('Account created! Please check your email for verification code.');
      try {
        localStorage.setItem('pendingVerificationUserId', result.userId);
        localStorage.setItem('pendingVerificationEmail', data.email);
        localStorage.setItem('pendingVerificationRole', result.role || (isOrganizer ? 'ORGANIZER' : 'BUYER'));
        console.debug('[Signup] stored pending verification', { userId: result.userId, email: data.email, role: result.role || (isOrganizer ? 'ORGANIZER' : 'BUYER') });
      } catch (e) {
        // ignore localStorage errors
      }
      router.push(`/verify-email?userId=${result.userId}&email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      const errorInfo = getErrorMessage(errorMessage);
      setErrorState(errorInfo);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  // Password requirements checklist
  const passwordRequirements = [
    { met: watchedPassword.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(watchedPassword), text: 'One uppercase letter' },
    { met: /[a-z]/.test(watchedPassword), text: 'One lowercase letter' },
    { met: /[0-9]/.test(watchedPassword), text: 'One number' },
  ];

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
          <div className="flex justify-center mb-2">
            <Logo href="/" size="lg" showText={false} />
          </div>
          
          {/* Role Toggle */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Link 
              href="/signup"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !isOrganizer 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Attendee
            </Link>
            <Link 
              href="/signup?role=organizer"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isOrganizer 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Organizer
            </Link>
          </div>
          
          <CardTitle className="text-xl">
            {isOrganizer ? 'Create Organizer Account' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isOrganizer 
              ? 'Start selling tickets and managing events today' 
              : 'Join hdticketdesk to discover and attend amazing events'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Google Sign Up Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 flex items-center justify-center gap-2 h-11 border-gray-300 hover:bg-gray-50"
            onClick={() => {
              window.location.href = api.getGoogleAuthUrl(isOrganizer ? 'organizer' : undefined);
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
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-medium"
                    >
                      {errorState.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')} 
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')} 
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                placeholder="you@example.com"
                {...register('email')} 
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password"
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Create a strong password"
                  {...register('password')} 
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
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
              
              {/* Password Strength Indicator */}
              {watchedPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.label === 'Weak' ? 'text-red-500' :
                      passwordStrength.label === 'Medium' ? 'text-yellow-600' : 'text-green-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  
                  {/* Password Requirements */}
                  <div className="grid grid-cols-2 gap-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-xs">
                        {req.met ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-gray-300" />
                        )}
                        <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.password && !watchedPassword && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            {isOrganizer && (
              <div className="space-y-1.5">
                <Label htmlFor="organizerTitle">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="organizerTitle"
                  placeholder="Your company or brand name"
                  {...register('organizerTitle')} 
                  className={errors.organizerTitle ? 'border-red-500' : ''}
                />
                {errors.organizerTitle ? (
                  <p className="text-xs text-red-500">{errors.organizerTitle.message}</p>
                ) : (
                  <p className="text-xs text-gray-500">This will be displayed on your events and tickets</p>
                )}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}