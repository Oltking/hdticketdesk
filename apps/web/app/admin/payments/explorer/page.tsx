'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layouts/sidebar';
import { formatCurrency } from '@/lib/utils';
import { PLATFORM_FEE_PERCENTAGE } from '@/lib/constants';
import { Search, RefreshCw, DollarSign, ArrowDownRight, Wallet, TrendingUp, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AdminPaymentsExplorerPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'ALL' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'>('ALL');
  const [search, setSearch] = useState('');
  const [organizerId, setOrganizerId] = useState<string>('ALL');
  const [eventId, setEventId] = useState<string>('ALL');

  const [organizers, setOrganizers] = useState<Array<{ id: string; title: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; organizerId: string }>>([]);

  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminPaymentsExplorer({
        page,
        limit: 50,
        status: status === 'ALL' ? undefined : (status as any),
        search: search || undefined,
        organizerId: organizerId === 'ALL' ? undefined : organizerId,
        eventId: eventId === 'ALL' ? undefined : eventId,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load filter dropdown data once
    (async () => {
      const [orgRes, evRes] = await Promise.all([
        api.getAdminFilterOrganizers(),
        api.getAdminFilterEvents(),
      ]);
      setOrganizers(orgRes.organizers || []);
      setEvents(evRes.events || []);
    })();
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, organizerId, eventId]);

  const payments = data?.payments || [];
  const summary = data?.summary;

  const getStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'SUCCESS':
        return <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-0">Success</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-0">Failed</Badge>;
      case 'REFUNDED':
        return <Badge className="bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 border-0">Refunded</Badge>;
      case 'PENDING':
      default:
        return <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-0">Pending</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-background">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-6" />
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-20 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-background overflow-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments Explorer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View all transactions with gross revenue, platform fees, and organizer earnings
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gross Revenue</p>
                  <p className="text-2xl font-bold mt-0.5">{formatCurrency(summary?.grossRevenue || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.successfulTickets || 0} successful transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform Fees</p>
                  <p className="text-2xl font-bold mt-0.5">{formatCurrency(summary?.platformFees || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{PLATFORM_FEE_PERCENTAGE}% of gross revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-purple-500/10">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organizer Earnings</p>
                  <p className="text-2xl font-bold mt-0.5">{formatCurrency(summary?.organizerNet || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Net after platform fees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference, email..."
                  className="h-9"
                />
              </div>
              <div>
                <Select value={status} onValueChange={(v: any) => { setPage(1); setStatus(v); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={organizerId}
                  onValueChange={async (v: any) => {
                    setPage(1);
                    setOrganizerId(v);
                    setEventId('ALL');
                    const evRes = await api.getAdminFilterEvents(v === 'ALL' ? undefined : v);
                    setEvents(evRes.events || []);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Organizer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Organizers</SelectItem>
                    {organizers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={eventId} onValueChange={(v: any) => { setPage(1); setEventId(v); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Events</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button
                  onClick={() => { setPage(1); fetchData(); }}
                  disabled={loading}
                  className="w-full h-9"
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Reference</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Buyer</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Event</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tier</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fee</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Net</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-14 ml-auto" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        <td className="p-3"><Skeleton className="h-5 w-16 mx-auto" /></td>
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                        No payments found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' 
                          })}
                        </td>
                        <td className="p-3 text-sm font-mono text-xs whitespace-nowrap">{p.reference}</td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[180px] truncate">{p.buyerEmail}</td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate" title={p.event?.title}>
                          {p.event?.title || '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{p.tier?.name || '-'}</td>
                        <td className="p-3 text-sm text-right font-medium tabular-nums">
                          {formatCurrency(p.amount || 0)}
                        </td>
                        <td className="p-3 text-sm text-right text-amber-600 tabular-nums">
                          {formatCurrency(p.platformFee ?? ((p.amount || 0) * (PLATFORM_FEE_PERCENTAGE / 100)))}
                        </td>
                        <td className="p-3 text-sm text-right text-emerald-600 font-medium tabular-nums">
                          {formatCurrency(p.organizerNet ?? ((p.amount || 0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)))}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(p.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {data?.page || 1} of {data?.totalPages || 1} • {data?.total || 0} total records
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={page <= 1 || loading} 
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page >= (data?.totalPages || 1) || loading} 
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
