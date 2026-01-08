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

const schema = z.object({
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

type FormData = z.infer<typeof schema>;

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
      router.push(`/verify-email?userId=${result.userId}&email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      const errorInfo = getErrorMessage(err.message);
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
          <Link href="/" className="text-2xl font-bold text-primary mb-2 block hover:opacity-80 transition-opacity">
            hdticketdesk
          </Link>
          
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
                <Label htmlFor="organizerTitle">Organization Name</Label>
                <Input 
                  id="organizerTitle"
                  placeholder="Your company or brand name"
                  {...register('organizerTitle')} 
                />
                <p className="text-xs text-gray-500">This will be displayed on your events</p>
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