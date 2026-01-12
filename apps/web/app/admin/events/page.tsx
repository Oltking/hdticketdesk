'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { EyeOff, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminEventsPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const { success, error } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<{ id: string; title: string; ticketsSold: number } | null>(null);

  const fetchEvents = async (pageNum: number) => {
    try {
      setLoading(true);
      const data = await api.getAdminEvents(pageNum, 20);
      setEvents(data.events || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Events</h1>
          <span className="text-sm text-muted-foreground">{total} total events</span>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg">
                  <tr>
                    <th className="text-left p-4 font-medium">Event</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Tickets</th>
                    <th className="text-left p-4 font-medium">Revenue</th>
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
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="relative w-16 h-16 mb-4 opacity-20">
                            <Image src="/icon.svg" alt="hdticketdesk" fill className="object-contain" />
                          </div>
                          <p className="text-text-muted">No events found</p>
                        </div>
                      </td>
                    </tr>
                  ) : events.map((event) => (
                    <tr key={event.id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-text-muted">{event.organizer?.title}</p>
                      </td>
                      <td className="p-4"><Badge variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>{event.status}</Badge></td>
                      <td className="p-4">{event._count?.tickets || 0}</td>
                      <td className="p-4">{formatCurrency(event.totalRevenue || 0)}</td>
                      <td className="p-4 text-text-muted">{formatDate(event.startDate)}</td>
                      <td className="p-4">
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
                            <EyeOff className="w-4 h-4 mr-1" />
                            Unpublish
                          </Button>
                        )}
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
                  Page {page} of {totalPages}
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
      </main>
    </div>
  );
}
