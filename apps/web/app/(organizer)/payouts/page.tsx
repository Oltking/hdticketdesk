'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Banknote,
  Info
} from 'lucide-react';

export default function PayoutsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [balance, setBalance] = useState({ pending: 0, available: 0, withdrawn: 0, withdrawable: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm();

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const [balanceData, historyData] = await Promise.all([api.getWithdrawableAmount(), api.getWithdrawalHistory()]);
      setBalance(balanceData);
      setHistory(historyData);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const onWithdraw = async (data: any) => {
    try {
      const amount = Number(data.amount);
      const result = await api.requestWithdrawal(amount);
      success('OTP sent to your email');
      setShowWithdraw(false);
      reset();
      // Redirect to verification page
      router.push(`/payouts/verify?id=${result.withdrawalId}&amount=${amount}`);
    } catch (err: any) {
      error(err.message || 'Failed to request withdrawal');
      setShowWithdraw(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', badge: 'success' as const };
      case 'FAILED':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', badge: 'destructive' as const };
      case 'PROCESSING':
        return { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', badge: 'default' as const };
      default:
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', badge: 'warning' as const };
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-40 mb-6" />
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              Payouts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your earnings and withdrawals
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Pending Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(balance.pending)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Available after 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(balance.available)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Ready to withdraw
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Total Withdrawn</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(balance.withdrawn)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                All time withdrawals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Action Card */}
        <Card className="mb-5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Withdrawable Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(balance.withdrawable)}</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowWithdraw(true)} 
                disabled={balance.withdrawable <= 0} 
                className="bg-primary text-white h-12 px-8 text-base gap-2"
                size="lg"
              >
                <Banknote className="h-5 w-5" />
                Request Withdrawal
              </Button>
            </div>
            {balance.withdrawable <= 0 && balance.pending > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your funds are still in the pending period. They will become available for withdrawal after 24 hours from your first sale.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Withdrawal History
            </CardTitle>
            <CardDescription>Track all your withdrawal requests and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 bg-primary/10 rounded-full" />
                  <div className="absolute inset-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <Banknote className="h-8 w-8 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">No withdrawals yet</h3>
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                  Your withdrawal history will appear here once you make your first payout request
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((w) => {
                  const config = getStatusConfig(w.status);
                  const StatusIcon = config.icon;
                  return (
                    <div 
                      key={w.id} 
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className={`p-2.5 rounded-full ${config.bg}`}>
                        <StatusIcon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{formatCurrency(w.amount)}</p>
                          <Badge variant={config.badge}>{w.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {formatDate(w.createdAt)}
                          {w.bankName && ` • ${w.bankName}`}
                          {w.accountNumber && ` (****${w.accountNumber.slice(-4)})`}
                        </p>
                        {w.failureReason && (
                          <p className="text-xs text-red-600 mt-1">{w.failureReason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Request Dialog */}
        <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                Request Withdrawal
              </DialogTitle>
              <DialogDescription>
                Enter the amount you want to withdraw to your bank account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onWithdraw)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input 
                  id="amount"
                  type="number" 
                  {...register('amount', { required: true, min: 100, max: balance.withdrawable })} 
                  placeholder="Enter amount"
                  className="text-lg h-12"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Min: ₦100</span>
                  <span className="text-muted-foreground">Max: {formatCurrency(balance.withdrawable)}</span>
                </div>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  An OTP will be sent to your email for verification. You'll be redirected to a secure page to complete the withdrawal.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-white h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Verification'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
