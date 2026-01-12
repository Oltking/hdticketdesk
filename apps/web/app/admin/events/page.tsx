'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function AdminEventsPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    if (!authLoading) fetchEvents();
  }, [authLoading]);

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
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
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
                      <td className="p-4">{event.totalTicketsSold}</td>
                      <td className="p-4">{formatCurrency(event.totalRevenue)}</td>
                      <td className="p-4 text-text-muted">{formatDate(event.startDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
