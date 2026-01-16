'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Shield, ArrowLeft, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function VerifyWithdrawalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState<'input' | 'success' | 'failed'>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const withdrawalId = searchParams.get('id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!withdrawalId) {
      router.push('/payouts');
    }
  }, [withdrawalId, router]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus last filled input or last input
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      error('Please enter the complete 6-digit OTP');
      return;
    }

    if (!withdrawalId) {
      error('Invalid withdrawal request');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      await api.verifyWithdrawalOtp(withdrawalId, otpCode);
      setStatus('success');
      success('Withdrawal is being processed!');
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err.message || 'Verification failed. Please try again.');
      error(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      // Note: Need to re-request withdrawal to get new OTP
      // For now, instruct user to go back and request again
      error('Please go back and request a new withdrawal to get a fresh OTP');
    } catch (err: any) {
      error(err.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleRetry = () => {
    setStatus('input');
    setOtp(['', '', '', '', '', '']);
    setErrorMessage('');
    inputRefs.current[0]?.focus();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 flex items-center justify-center bg-bg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-md mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mb-6 gap-2"
            onClick={() => router.push('/payouts')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payouts
          </Button>

          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                status === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                'bg-primary/10'
              }`}>
                {status === 'success' ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : status === 'failed' ? (
                  <XCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <Shield className="h-8 w-8 text-primary" />
                )}
              </div>
              <CardTitle className="text-xl">
                {status === 'success' ? 'Withdrawal Processing!' :
                 status === 'failed' ? 'Verification Failed' :
                 'Verify Your Withdrawal'}
              </CardTitle>
              <CardDescription className="mt-2">
                {status === 'success' ? (
                  'Your withdrawal request has been verified and is now being processed.'
                ) : status === 'failed' ? (
                  errorMessage || 'The OTP verification failed. Please try again.'
                ) : (
                  <>
                    Enter the 6-digit code sent to your email to confirm your withdrawal
                    {amount && (
                      <span className="block mt-2 text-lg font-semibold text-foreground">
                        {formatCurrency(Number(amount))}
                      </span>
                    )}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {status === 'input' && (
                <>
                  {/* OTP Input */}
                  <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-bold"
                        disabled={isVerifying}
                      />
                    ))}
                  </div>

                  {/* Verify Button */}
                  <Button 
                    onClick={handleVerify} 
                    className="w-full bg-primary text-white h-12 text-base"
                    disabled={isVerifying || otp.join('').length !== 6}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Process Withdrawal'
                    )}
                  </Button>

                  {/* Resend Link */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Didn't receive the code?
                    </p>
                    <Button
                      variant="link"
                      onClick={handleResendOtp}
                      disabled={isResending}
                      className="text-primary"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        'Request new OTP'
                      )}
                    </Button>
                  </div>

                  {/* Security Notice */}
                  <div className="mt-6 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground text-center">
                      🔒 For your security, this code expires in 10 minutes. Do not share this code with anyone.
                    </p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 text-center">
                      Your funds will be transferred to your bank account shortly. You'll receive an email confirmation once the transfer is complete.
                    </p>
                  </div>
                  <Button 
                    onClick={() => router.push('/payouts')} 
                    className="w-full"
                  >
                    Return to Payouts
                  </Button>
                </div>
              )}

              {status === 'failed' && (
                <div className="space-y-4">
                  <Button 
                    onClick={handleRetry} 
                    className="w-full gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/payouts')} 
                    className="w-full"
                  >
                    Cancel & Return to Payouts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
