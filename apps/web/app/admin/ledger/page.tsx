'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft,
  Ticket,
  Wallet,
  RefreshCw,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

export default function AdminLedgerPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchLedger = async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await api.getAdminLedger(pageNum, 100);
      setEntries(data.entries || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter entries based on search and type
  useEffect(() => {
    let filtered = entries;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.description?.toLowerCase().includes(query) ||
        entry.organizer?.title?.toLowerCase().includes(query) ||
        entry.type?.toLowerCase().includes(query)
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }
    
    setFilteredEntries(filtered);
  }, [entries, searchQuery, typeFilter]);

  useEffect(() => {
    if (!authLoading) fetchLedger(page);
  }, [authLoading, page]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  // Calculate summary stats
  const ticketSales = entries.filter(e => e.type === 'TICKET_SALE');
  const withdrawals = entries.filter(e => e.type === 'WITHDRAWAL');
  const refunds = entries.filter(e => e.type === 'REFUND');
  
  const totalSales = ticketSales.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalWithdrawals = withdrawals.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalRefunds = refunds.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Get unique entry types for filter
  const entryTypes = [...new Set(entries.map(e => e.type))];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TICKET_SALE': return <Ticket className="h-4 w-4" />;
      case 'WITHDRAWAL': return <Wallet className="h-4 w-4" />;
      case 'REFUND': return <ArrowUpRight className="h-4 w-4" />;
      default: return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TICKET_SALE': return 'bg-green-500/10 text-green-600';
      case 'WITHDRAWAL': return 'bg-blue-500/10 text-blue-600';
      case 'REFUND': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'TICKET_SALE': return 'text-green-600';
      case 'WITHDRAWAL': return 'text-blue-600';
      case 'REFUND': return 'text-red-600';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Financial Ledger</h1>
            <p className="text-sm text-muted-foreground">Complete audit trail of all transactions</p>
          </div>
          <button 
            onClick={() => fetchLedger(page, true)} 
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border hover:bg-accent transition-colors disabled:opacity-50 w-fit"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                  <p className="text-xl font-bold">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Sales</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wallet className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Withdrawals</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(totalWithdrawals)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Refunds</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalRefunds)}</p>
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
              placeholder="Search by description or organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background text-sm"
            >
              <option value="all">All Types</option>
              {entryTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Type</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Organizer</th>
                    <th className="text-left p-4 font-medium">Description</th>
                    <th className="text-left p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-40" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      </tr>
                    ))
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="relative w-16 h-16 mb-4 opacity-20">
                            <Image src="/icon.svg" alt="hdticketdesk" fill className="object-contain" />
                          </div>
                          <p className="text-muted-foreground">
                            {searchQuery || typeFilter !== 'all' 
                              ? 'No entries match your filters' 
                              : 'No ledger entries found'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(entry.type)}`}>
                          {getTypeIcon(entry.type)}
                          {entry.type.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {entry.type === 'TICKET_SALE' ? (
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          ) : entry.type === 'REFUND' ? (
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-blue-500" />
                          )}
                          <span className={`font-semibold ${getAmountColor(entry.type)}`}>
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {entry.organizer ? (
                          <span className="font-medium text-sm">{entry.organizer.title}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm max-w-xs truncate">
                        {entry.description || '-'}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredEntries.length} of {total} entries • Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
