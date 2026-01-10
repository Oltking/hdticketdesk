'use client';
import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { X, Loader2, Mail, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawUserId = searchParams.get('userId');
  const initialUserId = rawUserId && rawUserId !== 'null' ? rawUserId : undefined;
  const initialEmail = searchParams.get('email') || undefined;
  const type = searchParams.get('type') || 'EMAIL_VERIFICATION';
  
  // Keep userId/email in state so we can update them (e.g., after resend) and persist to localStorage
  const [userId, setUserId] = useState<string | undefined>(initialUserId);
  const [emailState, setEmailState] = useState<string | undefined>(initialEmail);

  // Load persisted pending verification info if query params are missing
  useEffect(() => {
    if ((!userId || userId === 'null') && !emailState) {
      try {
        const storedUid = localStorage.getItem('pendingVerificationUserId');
        const storedEmail = localStorage.getItem('pendingVerificationEmail');
        if (storedUid && storedUid !== 'null') setUserId(storedUid);
        if (storedEmail) setEmailState(storedEmail);
      } catch (e) {
        // ignore localStorage errors
      }
    } else {
      try {
        if (userId) localStorage.setItem('pendingVerificationUserId', userId);
        if (emailState) localStorage.setItem('pendingVerificationEmail', emailState);
      } catch (e) {
        // ignore localStorage errors
      }
    }
  }, [userId, emailState]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  
  const { success, error: showError } = useToast();
  const { setUser, setAuthenticated } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;
    
    const newOtp = [...otp];
    
    // Handle paste
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split('');
      pastedCode.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pastedCode.length, 5)]?.focus();
      
      // Auto-submit if complete
      if (pastedCode.length === 6) {
        setTimeout(() => handleVerify(newOtp.join('')), 100);
      }
      return;
    }
    
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);
    
    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (value && index === 5) {
      const code = newOtp.join('');
      if (code.length === 6) {
        setTimeout(() => handleVerify(code), 100);
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (!userId && !emailState) {
        setError('Missing verification context. Please re-open the verification link or request a new code.');
        setLoading(false);
        return;
      }

      console.debug('[Verify] payload', { userId, email: emailState });
      const result = await api.verifyOtp({ userId, email: emailState, code: otpCode, type });

      setVerified(true);

      if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        api.setToken(result.accessToken);
        setUser(result.user);
        setAuthenticated(true);
        success('Email verified successfully!');
        
        // Delay redirect to show success state
        setTimeout(() => {
          if (result.user?.role === 'ADMIN') {
            router.push('/admin/overview');
          } else if (result.user?.role === 'ORGANIZER') {
            router.push('/dashboard');
          } else {
            router.push('/tickets');
          }
        }, 1500);
      } else {
        success('Email verified! You can now sign in.');
        setTimeout(() => router.push('/login'), 1500);
      }
    } catch (err: any) {
      var errorMessage = getErrorMessage(err.message);
      setError(errorMessage);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setResending(true);
    setError(null);
    
    try {
      console.debug('[Resend] payload', { userId, email: emailState, type });
      const res: any = await api.resendOtp({ userId, email: emailState, type });
      console.debug('[Resend] response', res);

      // Persist userId/email returned by server if present
      if (res?.userId) {
        setUserId(res.userId);
        try { localStorage.setItem('pendingVerificationUserId', res.userId); } catch (e) { console.debug('[Verify] failed to persist pendingVerificationUserId', e); }
      }
      if (emailState) {
        try { localStorage.setItem('pendingVerificationEmail', emailState); } catch (e) { console.debug('[Verify] failed to persist pendingVerificationEmail', e); }
      }

      success('Verification code sent! Please check your email.');
      setResendCooldown(60); // 60 second cooldown
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      showError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  // Mask email for privacy
  const maskedEmail = emailState ? emailState.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'your email';

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
          <Link href="/" className="text-2xl font-bold text-primary mb-4 block hover:opacity-80 transition-opacity">
            hdticketdesk
          </Link>
          
          {/* Email Icon */}
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
            verified ? 'bg-green-100' : 'bg-primary/10'
          }`}>
            {verified ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          
          <CardTitle className="text-xl">
            {verified ? 'Email Verified!' : 'Check Your Email'}
          </CardTitle>
          <CardDescription className="mt-2">
            {verified ? (
              'Your email has been verified. Redirecting...'
            ) : type === 'NEW_DEVICE_LOGIN' ? (
              <>We detected a new device. Enter the code sent to <strong>{maskedEmail}</strong></>
            ) : (
              <>Enter the 6-digit code sent to <strong>{maskedEmail}</strong></>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!verified && (
            <>
              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={(e) => e.target.select()}
                    disabled={loading}
                    className={`
                      w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 
                      transition-all duration-200 outline-none
                      ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                      ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary'}
                      focus:ring-2 focus:ring-primary/20
                    `}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <Button 
                onClick={() => handleVerify()}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              {/* Resend Section */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">Didn't receive the code?</p>
                <button
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  className={`
                    inline-flex items-center gap-1.5 text-sm font-medium
                    ${resendCooldown > 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-primary hover:text-primary/80 hover:underline'
                    }
                  `}
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend Code
                    </>
                  )}
                </button>
              </div>

              {/* Help Text */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-xs text-gray-600 font-medium">Tips:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Check your spam or junk folder</li>
                  <li>• Make sure you entered the correct email</li>
                  <li>• The code expires in 10 minutes</li>
                </ul>
              </div>

              {/* Back to Login */}
              <p className="text-center text-sm text-gray-500">
                Wrong email?{' '}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Sign up again
                </Link>
              </p>
            </>
          )}

          {verified && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Error message helper
const getErrorMessage = (error: string): string => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('expired')) {
    return 'This code has expired. Please request a new one.';
  }
  
  if (errorLower.includes('invalid') || errorLower.includes('incorrect') || errorLower.includes('wrong')) {
    return 'Invalid code. Please check and try again.';
  }
  
  if (errorLower.includes('too many') || errorLower.includes('attempts')) {
    return 'Too many failed attempts. Please request a new code.';
  }
  
  if (errorLower.includes('not found') || errorLower.includes('no user')) {
    return 'Account not found. Please sign up again.';
  }
  
  if (errorLower.includes('already verified')) {
    return 'This email is already verified. Please sign in.';
  }
  
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return 'Connection failed. Please check your internet.';
  }
  
  return error || 'Verification failed. Please try again.';
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}