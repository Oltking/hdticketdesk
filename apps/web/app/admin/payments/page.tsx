'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingPayment {
  id: string;
  reference: string;
  monnifyTransactionRef: string | null;
  amount: number;
  buyerEmail: string;
  eventTitle: string;
  tierName: string;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const { success, error } = useToast();
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [stats, setStats] = useState({ total: 0, page: 1, totalPages: 0 });

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const result = await api.getAllPendingPayments();
      setPayments(result.payments);
      setStats({
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch pending payments:', err);
      error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPendingPayments();
    }
  }, [authLoading]);

  const handleVerifyPayment = async (reference: string) => {
    setVerifying(reference);
    try {
      const result = await api.manuallyVerifyPayment(reference);
      success(result.message || 'Payment verified successfully!');
      // Refresh the list
      await fetchPendingPayments();
    } catch (err: any) {
      error(err.message || 'Failed to verify payment');
    } finally {
      setVerifying(null);
    }
  };

  const handleBulkVerify = async () => {
    if (!confirm(`This will verify all ${stats.total} pending payments. Continue?`)) {
      return;
    }

    setBulkVerifying(true);
    try {
      const result = await api.verifyAllPendingPayments();
      success(
        `Verified ${result.verified} payments successfully! ${result.failed} failed.`
      );
      // Refresh the list
      await fetchPendingPayments();
    } catch (err: any) {
      error(err.message || 'Bulk verification failed');
    } finally {
      setBulkVerifying(false);
    }
  };

  const getPaymentAge = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Payment Recovery
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manually verify stuck pending payments
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-warning/10 text-warning">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payments</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Bulk Actions</p>
                  <Button
                    onClick={handleBulkVerify}
                    disabled={bulkVerifying || payments.length === 0}
                    className="gap-2"
                  >
                    {bulkVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Verify All
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchPendingPayments}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payments List */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-medium">All Clear!</p>
                  <p className="text-sm text-muted-foreground">
                    No pending payments found. Everything is processed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <Card key={payment.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Payment Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="warning" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {getPaymentAge(payment.createdAt)}
                              </Badge>
                              <span className="text-sm font-mono text-muted-foreground">
                                {payment.reference}
                              </span>
                            </div>
                            <p className="font-medium mb-1">{payment.eventTitle}</p>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span>Tier: {payment.tierName}</span>
                              <span>•</span>
                              <span>{payment.buyerEmail}</span>
                              <span>•</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                            {payment.monnifyTransactionRef && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Monnify Ref: {payment.monnifyTransactionRef}
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          <Button
                            onClick={() => handleVerifyPayment(payment.reference)}
                            disabled={verifying === payment.reference}
                            className="gap-2"
                          >
                            {verifying === payment.reference ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Verify Now
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Automatic Recovery
                  </p>
                  <p className="text-blue-700 dark:text-blue-200">
                    The system automatically checks for stuck payments every 10 minutes.
                    Payments older than 5 minutes are verified with Monnify and processed if successful.
                    Use manual verification for immediate recovery.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
