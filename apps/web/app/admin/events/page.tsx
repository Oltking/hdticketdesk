'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { EyeOff, AlertTriangle } from 'lucide-react';

export default function AdminEventsPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const { success, error } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<{ id: string; title: string; ticketsSold: number } | null>(null);

  const fetchEvents = async () => {
    try {
      const data = await api.getAdminEvents();
      setEvents(data.events || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchEvents();
  }, [authLoading]);

  const handleUnpublish = async (eventId: string) => {
    try {
      setUnpublishingId(eventId);
      const result = await api.adminUnpublishEvent(eventId);
      success(result.message || 'Event unpublished successfully');
      setShowUnpublishConfirm(null);
      // Refresh events list
      await fetchEvents();
    } catch (err: any) {
      error(err.message || 'Failed to unpublish event');
    } finally {
      setUnpublishingId(null);
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <h1 className="text-2xl font-bold mb-6">Events</h1>
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
                  {events.length === 0 ? (
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
