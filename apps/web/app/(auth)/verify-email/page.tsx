'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const type = searchParams.get('type') || 'EMAIL_VERIFICATION';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();
  const { setUser } = useAuthStore();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await api.verifyOtp({ userId, code: otp, type });
      if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        setUser(result.user);
        router.push('/dashboard');
      } else {
        success('Verified! You can now login.');
        router.push('/login');
      }
    } catch (err: any) {
      error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-primary mb-2 block">hdticketdesk</Link>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>Enter the 6-digit code sent to your email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" maxLength={6} className="text-center text-2xl tracking-widest" />
          <Button onClick={handleVerify} className="w-full bg-primary text-white" loading={loading}>Verify</Button>
        </CardContent>
      </Card>
    </div>
  );
}
