'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  EyeOff, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Search, 
  Calendar, 
  ExternalLink,
  TrendingUp,
  Ticket,
  RefreshCw,
  Filter
} from 'lucide-react';

export default function AdminEventsPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const { success, error } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<{ id: string; title: string; ticketsSold: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; title: string; ticketsSold: number } | null>(null);

  const fetchEvents = async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await api.getAdminEvents(pageNum, 50); // Fetch more for client-side filtering
      setEvents(data.events || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter events based on search and status
  useEffect(() => {
    let filtered = events;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(query) ||
        event.organizer?.title?.toLowerCase().includes(query) ||
        event.organizer?.user?.email?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }
    
    setFilteredEvents(filtered);
  }, [events, searchQuery, statusFilter]);

  useEffect(() => {
    if (!authLoading) fetchEvents(page);
  }, [authLoading, page]);

  const handleUnpublish = async (eventId: string) => {
    try {
      setUnpublishingId(eventId);
      const result = await api.adminUnpublishEvent(eventId);
      success(result.message || 'Event unpublished successfully');
      setShowUnpublishConfirm(null);
      // Refresh events list
      await fetchEvents(page);
    } catch (err: any) {
      error(err.message || 'Failed to unpublish event');
    } finally {
      setUnpublishingId(null);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      setDeletingId(eventId);
      const result = await api.adminDeleteEvent(eventId);
      success(result.message || 'Event deleted successfully');
      setShowDeleteConfirm(null);
      // Refresh events list
      await fetchEvents(page);
    } catch (err: any) {
      error(err.message || 'Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

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
  const totalGrossRevenue = filteredEvents.reduce((sum, e: any) => sum + (e.grossRevenue || 0), 0);
  const totalPlatformFees = filteredEvents.reduce((sum, e: any) => sum + (e.platformFees || 0), 0);
  const totalOrganizerNet = filteredEvents.reduce((sum, e: any) => sum + (e.organizerEarnings || 0), 0);
  const totalTicketsSold = filteredEvents.reduce((sum, e) => sum + (e._count?.tickets || 0), 0);
  const publishedCount = events.filter(e => e.status === 'PUBLISHED').length;
  const draftCount = events.filter(e => e.status === 'DRAFT').length;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Events Management</h1>
            <p className="text-sm text-muted-foreground">{total} total events on the platform</p>
          </div>
          <button 
            onClick={() => fetchEvents(page, true)} 
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
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Published</p>
                  <p className="text-xl font-bold">{publishedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <EyeOff className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                  <p className="text-xl font-bold">{draftCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Ticket className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tickets Sold</p>
                  <p className="text-xl font-bold">{totalTicketsSold}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gross Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(totalGrossRevenue)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Fees: {formatCurrency(totalPlatformFees)} • Net: {formatCurrency(totalOrganizerNet)}
                  </p>
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
              placeholder="Search events, organizers, or emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Event</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Tickets</th>
                    <th className="text-left p-4 font-medium">Gross</th>
                    <th className="text-left p-4 font-medium">Fees</th>
                    <th className="text-left p-4 font-medium">Net</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-4"><Skeleton className="h-10 w-40" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-12" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                        <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                      </tr>
                    ))
                  ) : filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="relative w-16 h-16 mb-4 opacity-20">
                            <Image src="/icon.svg" alt="HDTicketDesk" fill className="object-contain" />
                          </div>
                          <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== 'all' ? 'No events match your filters' : 'No events found'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEvents.map((event) => (
                    <tr key={event.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">{event.organizer?.title}</p>
                            <p className="text-xs text-muted-foreground">{event.organizer?.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={
                          event.status === 'PUBLISHED' ? 'success' : 
                          event.status === 'CANCELLED' ? 'destructive' : 'secondary'
                        }>
                          {event.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{event._count?.tickets || 0}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-emerald-600">{formatCurrency(event.grossRevenue || 0)}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-yellow-600">{formatCurrency(event.platformFees || 0)}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-purple-600">{formatCurrency(event.organizerEarnings || 0)}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">{formatDate(event.startDate)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Link 
                            href={`/events/${event.slug}`} 
                            target="_blank"
                            className="p-2 rounded-lg border hover:bg-accent transition-colors"
                            title="View Event"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {event.status === 'PUBLISHED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-warning text-warning hover:bg-warning/10"
                              onClick={() => setShowUnpublishConfirm({ 
                                id: event.id, 
                                title: event.title, 
                                ticketsSold: event._count?.tickets || 0 
                              })}
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteConfirm({ 
                              id: event.id, 
                              title: event.title, 
                              ticketsSold: event._count?.tickets || 0 
                            })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                  Showing {filteredEvents.length} of {total} events • Page {page} of {totalPages}
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

        {/* Unpublish Confirmation Dialog */}
        {showUnpublishConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-warning/10">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <h3 className="text-lg font-semibold">Unpublish Event?</h3>
              </div>
              <p className="text-muted-foreground mb-2">
                Are you sure you want to unpublish <strong>{showUnpublishConfirm.title}</strong>?
              </p>
              {showUnpublishConfirm.ticketsSold > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg mb-4">
                  <p className="text-sm text-warning font-medium">
                    ⚠️ This event has {showUnpublishConfirm.ticketsSold} ticket(s) sold. 
                    Unpublishing will hide it from public view but existing tickets remain valid.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                The event will be moved to draft status and will no longer be visible to the public.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUnpublishConfirm(null)}
                  disabled={unpublishingId === showUnpublishConfirm.id}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default"
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                  loading={unpublishingId === showUnpublishConfirm.id}
                  onClick={() => handleUnpublish(showUnpublishConfirm.id)}
                >
                  Unpublish Event
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-destructive/10">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold">Delete Event Permanently?</h3>
              </div>
              <p className="text-muted-foreground mb-2">
                Are you sure you want to permanently delete <strong>{showDeleteConfirm.title}</strong>?
              </p>
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ WARNING: This action cannot be undone!
                </p>
                <p className="text-sm text-destructive mt-1">
                  This will permanently delete the event and ALL related records including:
                </p>
                <ul className="text-sm text-destructive mt-1 list-disc list-inside">
                  <li>All ticket tiers</li>
                  {showDeleteConfirm.ticketsSold > 0 && (
                    <>
                      <li>{showDeleteConfirm.ticketsSold} ticket(s)</li>
                      <li>All payment records</li>
                      <li>All refund records</li>
                      <li>Related ledger entries</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingId === showDeleteConfirm.id}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  loading={deletingId === showDeleteConfirm.id}
                  onClick={() => handleDelete(showDeleteConfirm.id)}
                >
                  Delete Permanently
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
