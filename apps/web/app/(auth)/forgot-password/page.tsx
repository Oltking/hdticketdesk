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
import { X, Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const { success, error: showError } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailParam
    }
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    
    try {
      await api.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } catch (err: any) {
      // Don't reveal if email exists or not for security
      // Still show success to prevent email enumeration
      setSubmittedEmail(data.email);
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  // Mask email for privacy
  const maskedEmail = submittedEmail ? submittedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <Card className="w-full max-w-md relative shadow-xl">
          <button
            onClick={handleClose}
            className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200 z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>

          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <Logo href="/" size="lg" showText={false} />
            </div>
            
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription className="mt-2">
              If an account exists for <strong>{maskedEmail}</strong>, you'll receive a password reset link shortly.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs text-gray-600 font-medium">Tips:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• The link expires in 1 hour</li>
                <li>• Only request one reset at a time</li>
              </ul>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setSubmitted(false)}
            >
              Try a different email
            </Button>
            
            <p className="text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <Card className="w-full max-w-md relative shadow-xl">
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200 z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo href="/" size="lg" showText={false} />
          </div>
          
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          
          <CardTitle className="text-xl">Forgot Password?</CardTitle>
          <CardDescription className="mt-2">
            No worries! Enter your email and we'll send you a reset link.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
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
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}