'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/spinner';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownRight, 
  ArrowUpRight,
  Ticket,
  Wallet,
  RefreshCw,
  Receipt,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';

interface LedgerEntry {
  id: string;
  type: 'TICKET_SALE' | 'WITHDRAWAL' | 'REFUND' | 'CHARGEBACK';
  amount: number;
  description: string;
  createdAt: string;
  pendingBalanceAfter: number;
  availableBalanceAfter: number;
}

export default function PaymentHistoryPage() {
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchPaymentHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await api.getPaymentHistory();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchPaymentHistory();
  }, [authLoading]);

  // Filter entries
  useEffect(() => {
    let filtered = entries;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.description?.toLowerCase().includes(query) ||
        entry.type?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, typeFilter]);

  // Calculate stats
  const totalSales = entries
    .filter(e => e.type === 'TICKET_SALE')
    .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
  
  const totalWithdrawals = entries
    .filter((e: any) => e.type === 'WITHDRAWAL' && (!e.withdrawalStatus || String(e.withdrawalStatus).toUpperCase() === 'COMPLETED'))
    .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
  
  const totalRefunds = entries
    .filter(e => e.type === 'REFUND')
    .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'TICKET_SALE':
        return { 
          icon: Ticket, 
          color: 'bg-green-500/10 text-green-600', 
          badge: 'success' as const,
          label: 'Ticket Sale',
          amountColor: 'text-green-600',
          prefix: '+'
        };
      case 'WITHDRAWAL':
        return { 
          icon: Wallet, 
          color: 'bg-blue-500/10 text-blue-600', 
          badge: 'default' as const,
          label: 'Withdrawal',
          amountColor: 'text-blue-600',
          prefix: '-'
        };
      case 'REFUND':
        return { 
          icon: ArrowUpRight, 
          color: 'bg-red-500/10 text-red-600', 
          badge: 'destructive' as const,
          label: 'Refund',
          amountColor: 'text-red-600',
          prefix: '-'
        };
      case 'CHARGEBACK':
        return { 
          icon: AlertCircle, 
          color: 'bg-orange-500/10 text-orange-600', 
          badge: 'warning' as const,
          label: 'Chargeback',
          amountColor: 'text-orange-600',
          prefix: '-'
        };
      default:
        return { 
          icon: Receipt, 
          color: 'bg-gray-500/10 text-gray-600', 
          badge: 'secondary' as const,
          label: type,
          amountColor: 'text-foreground',
          prefix: ''
        };
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <PageLoader text="Loading payment history..." />
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
              <Receipt className="h-6 w-6 text-primary" />
              Payment History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all your earnings, withdrawals, and refunds
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchPaymentHistory(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10">
                  <Wallet className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Withdrawn</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(totalWithdrawals)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-red-500/10">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Refunds</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(totalRefunds)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          >
            <option value="all">All Types</option>
            <option value="TICKET_SALE">Ticket Sales</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="REFUND">Refunds</option>
            <option value="CHARGEBACK">Chargebacks</option>
          </select>
        </div>

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 bg-primary/10 rounded-full" />
                  <div className="absolute inset-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <Receipt className="h-8 w-8 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">No transactions yet</h3>
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                  {searchQuery || typeFilter !== 'all'
                    ? 'No transactions match your filters'
                    : 'Your payment history will appear here once you start selling tickets'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEntries.map((entry) => {
                  const config = getTypeConfig(entry.type);
                  const Icon = config.icon;
                  const amount = Math.abs(Number(entry.amount) || 0);

                  return (
                    <div 
                      key={entry.id} 
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className={`p-2.5 rounded-full ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{config.label}</p>
                          <Badge variant={config.badge} className="text-xs">
                            {entry.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {entry.description || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${config.amountColor}`}>
                          {config.prefix}{formatCurrency(amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Count */}
        {filteredEntries.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Showing {filteredEntries.length} of {entries.length} transactions
          </p>
        )}
      </main>
    </div>
  );
}
