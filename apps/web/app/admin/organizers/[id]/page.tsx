'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, User, DollarSign, TrendingUp, TrendingDown, RotateCcw, Building2, CreditCard, Copy, CheckCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VirtualAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  accountReference: string;
  isActive: boolean;
  createdAt: string;
}

interface OrganizerEarnings {
  organizer: {
    id: string;
    title: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    virtualAccount: VirtualAccount | null;
  };
  balances: {
    pending: number;
    available: number;
    withdrawn: number;
  };
  stats: {
    totalSales: number;
    totalWithdrawn: number;
    totalRefunded: number;
    netEarnings: number;
  };
  recentSales: Array<{
    id: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
  recentWithdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    processedAt: string | null;
  }>;
  recentRefunds: Array<{
    id: string;
    amount: number;
    ticketNumber: string;
    eventTitle: string;
    processedAt: string | null;
  }>;
}

export default function OrganizerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [data, setData] = useState<OrganizerEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [creatingVA, setCreatingVA] = useState(false);
  const { success, error } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateVirtualAccount = async () => {
    try {
      setCreatingVA(true);
      await api.createVirtualAccountForOrganizer(params.id as string);
      success('Virtual account created successfully!');

      // Refresh data to show the new virtual account
      const result = await api.getOrganizerEarnings(params.id as string);
      setData(result);
    } catch (err: any) {
      error(err.message || 'Failed to create virtual account');
      console.error('Failed to create virtual account:', err);
    } finally {
      setCreatingVA(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await api.getOrganizerEarnings(params.id as string);
        setData(result);
      } catch (err) {
        console.error('Failed to fetch organizer earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, params.id]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-6" />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-8">
          <p>Organizer not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {data.organizer.title}
            </h1>
            <p className="text-muted-foreground">
              {data.organizer.user.firstName} {data.organizer.user.lastName} • {data.organizer.user.email}
            </p>
          </div>

          {/* Virtual Account Card - Admin Only */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Virtual Account (Admin View)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.organizer.virtualAccount ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-mono font-bold">{data.organizer.virtualAccount.accountNumber}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(data.organizer.virtualAccount!.accountNumber)}
                          className="h-8 w-8 p-0"
                        >
                          {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Bank Name</p>
                      <p className="text-lg font-semibold">{data.organizer.virtualAccount.bankName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="text-lg">{data.organizer.virtualAccount.accountName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={data.organizer.virtualAccount.isActive ? 'success' : 'destructive'}>
                        {data.organizer.virtualAccount.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Reference: {data.organizer.virtualAccount.accountReference}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {formatDate(data.organizer.virtualAccount.createdAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-2">No virtual account assigned</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create a virtual account now to enable this organizer to receive payments
                  </p>
                  <Button
                    onClick={handleCreateVirtualAccount}
                    disabled={creatingVA}
                    className="gap-2"
                  >
                    {creatingVA ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Virtual Account
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Balance Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-warning/10 text-warning">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.balances.pending)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10 text-success">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.balances.available)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.balances.withdrawn)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(data.stats.totalSales)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Refunded</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(data.stats.totalRefunded)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Total Withdrawn</p>
                <p className="text-xl font-bold">{formatCurrency(data.stats.totalWithdrawn)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">Net Earnings</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(data.stats.netEarnings)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Recent Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No sales yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentSales.map((sale) => (
                      <div key={sale.id} className="flex justify-between items-start p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{sale.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(sale.createdAt)}</p>
                        </div>
                        <p className="font-semibold text-green-600">{formatCurrency(sale.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Withdrawals */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentWithdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No withdrawals yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentWithdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex justify-between items-start p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{formatCurrency(withdrawal.amount)}</p>
                            <Badge variant={withdrawal.status === 'COMPLETED' ? 'success' : withdrawal.status === 'FAILED' ? 'destructive' : 'secondary'}>
                              {withdrawal.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : formatDate(withdrawal.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Refunds */}
          {data.recentRefunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Recent Refunds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentRefunds.map((refund) => (
                    <div key={refund.id} className="flex justify-between items-start p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{refund.eventTitle}</p>
                        <p className="text-xs text-muted-foreground">Ticket #{refund.ticketNumber}</p>
                        {refund.processedAt && (
                          <p className="text-xs text-muted-foreground">{formatDate(refund.processedAt)}</p>
                        )}
                      </div>
                      <p className="font-semibold text-red-600">-{formatCurrency(refund.amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
