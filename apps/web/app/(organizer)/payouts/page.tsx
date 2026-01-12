'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PayoutsPage() {
  const { user, isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [balance, setBalance] = useState({ pending: 0, available: 0, withdrawn: 0, withdrawable: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [withdrawalId, setWithdrawalId] = useState('');
  const [otp, setOtp] = useState('');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceData, historyData] = await Promise.all([api.getWithdrawableAmount(), api.getWithdrawalHistory()]);
        setBalance(balanceData);
        setHistory(historyData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

  const onWithdraw = async (data: any) => {
    try {
      const result = await api.requestWithdrawal(Number(data.amount));
      setWithdrawalId(result.withdrawalId);
      setShowWithdraw(false);
      setShowOtp(true);
      success('OTP sent to your email');
    } catch (err: any) {
      error(err.message || 'Failed to request withdrawal');
    }
  };

  const onVerifyOtp = async () => {
    try {
      await api.verifyWithdrawalOtp(withdrawalId, otp);
      success('Withdrawal processing!');
      setShowOtp(false);
      setOtp('');
      const [balanceData, historyData] = await Promise.all([api.getWithdrawableAmount(), api.getWithdrawalHistory()]);
      setBalance(balanceData);
      setHistory(historyData);
    } catch (err: any) {
      error(err.message || 'Verification failed');
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <h1 className="text-2xl font-bold mb-6">Payouts</h1>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10 text-warning">💰</div>
                <div><p className="text-sm text-text-muted">Pending</p><p className="text-2xl font-bold">{formatCurrency(balance.pending)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success/10 text-success">✓</div>
                <div><p className="text-sm text-text-muted">Available</p><p className="text-2xl font-bold">{formatCurrency(balance.available)}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">📤</div>
                <div><p className="text-sm text-text-muted">Withdrawn</p><p className="text-2xl font-bold">{formatCurrency(balance.withdrawn)}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-text-muted">Withdrawable Amount</p>
            <p className="text-3xl font-bold">{formatCurrency(balance.withdrawable)}</p>
          </div>
          <Button onClick={() => setShowWithdraw(true)} disabled={balance.withdrawable <= 0} className="bg-primary text-white">Request Withdrawal</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Withdrawal History</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-20 h-20 mb-6 opacity-20">
                  <Image
                    src="/icon.svg"
                    alt="hdticketdesk"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6 rounded-full" />
                <h3 className="text-lg font-semibold mb-2">No withdrawals yet</h3>
                <p className="text-text-muted text-center max-w-sm">
                  Your withdrawal history will appear here once you make your first payout request
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(w.amount)}</p>
                      <p className="text-sm text-text-muted">{formatDate(w.createdAt)}</p>
                    </div>
                    <Badge variant={w.status === 'COMPLETED' ? 'success' : w.status === 'FAILED' ? 'danger' : 'warning'}>{w.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle><DialogDescription>Enter the amount you want to withdraw</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit(onWithdraw)} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (₦)</Label>
                <Input type="number" {...register('amount')} max={balance.withdrawable} min={100} />
                <p className="text-sm text-text-muted">Max: {formatCurrency(balance.withdrawable)}</p>
              </div>
              <Button type="submit" className="w-full bg-primary text-white" loading={isSubmitting}>Request Withdrawal</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showOtp} onOpenChange={setShowOtp}>
          <DialogContent>
            <DialogHeader><DialogTitle>Verify OTP</DialogTitle><DialogDescription>Enter the code sent to your email</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" maxLength={6} className="text-center text-2xl tracking-widest" />
              <Button onClick={onVerifyOtp} className="w-full bg-primary text-white">Verify & Withdraw</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
