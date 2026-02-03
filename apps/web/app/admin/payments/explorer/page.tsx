'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Search, RefreshCw, DollarSign, ArrowDownRight, AlertTriangle } from 'lucide-react';

export default function AdminPaymentsExplorerPage() {
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

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payments Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full payments pipeline + ticket-truth summary (gross/fees/net)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.grossRevenue || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">SUCCESS tickets: {summary?.successfulTickets || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees (5%)</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.platformFees || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-700">
                <ArrowDownRight className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organizer Net</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.organizerNet || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search: reference, email, event title..."
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={status} onValueChange={(v: any) => { setPage(1); setStatus(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="FAILED">FAILED</SelectItem>
                <SelectItem value="REFUNDED">REFUNDED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-64">
            <Select
              value={organizerId}
              onValueChange={async (v: any) => {
                setPage(1);
                setOrganizerId(v);
                setEventId('ALL');

                // Reload events based on organizer filter
                const evRes = await api.getAdminFilterEvents(v === 'ALL' ? undefined : v);
                setEvents(evRes.events || []);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Organizer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All organizers</SelectItem>
                {organizers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-64">
            <Select value={eventId} onValueChange={(v: any) => { setPage(1); setEventId(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All events</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            disabled={loading}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Date</th>
                  <th className="text-left p-4 text-sm font-medium">Reference</th>
                  <th className="text-left p-4 text-sm font-medium">Buyer</th>
                  <th className="text-left p-4 text-sm font-medium">Event</th>
                  <th className="text-left p-4 text-sm font-medium">Tier</th>
                  <th className="text-right p-4 text-sm font-medium">Amount</th>
                  <th className="text-right p-4 text-sm font-medium">Fee (5%)</th>
                  <th className="text-right p-4 text-sm font-medium">Net</th>
                  <th className="text-left p-4 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">Loading…</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">No payments found.</td></tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="p-4 text-sm font-medium whitespace-nowrap">{p.reference}</td>
                      <td className="p-4 text-sm text-muted-foreground">{p.buyerEmail}</td>
                      <td className="p-4 text-sm text-muted-foreground max-w-[260px] truncate">{p.event?.title || '-'}</td>
                      <td className="p-4 text-sm text-muted-foreground">{p.tier?.name || '-'}</td>
                      <td className="p-4 text-sm text-right font-medium">{formatCurrency(p.amount || 0)}</td>
                      <td className="p-4 text-sm text-right text-yellow-700">
                        {formatCurrency(((p.tier?.price || 0) * 0.05) || 0)}
                      </td>
                      <td className="p-4 text-sm text-right text-purple-700 font-medium">
                        {formatCurrency(((p.tier?.price || 0) * 0.95) || 0)}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-700' :
                          p.status === 'FAILED' ? 'bg-red-500/10 text-red-700' :
                          p.status === 'REFUNDED' ? 'bg-slate-500/10 text-slate-700' :
                          'bg-amber-500/10 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-muted-foreground">
          Page {data?.page || 1} of {data?.totalPages || 1} • Total {data?.total || 0}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>
            Prev
          </Button>
          <Button variant="outline" disabled={page >= (data?.totalPages || 1) || loading} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
