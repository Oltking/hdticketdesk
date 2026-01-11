'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, TrendingUp, Ticket, Calendar, DollarSign, QrCode, BarChart3 } from 'lucide-react';
import type { Event } from '@/types';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const [events, setEvents] = useState<Event[]>([]);
  const [balance, setBalance] = useState({ pending: 0, available: 0, withdrawn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsData, balanceData] = await Promise.all([api.getMyEvents(), api.getBalance()]);
        setEvents(eventsData);
        setBalance(balanceData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-32" /></div>;

  const totalSold = events.reduce((sum, e) => sum + (e.totalTicketsSold || 0), 0);
const totalRevenue = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-text-muted">Welcome back, {user?.firstName || 'Organizer'}!</p>
          </div>
          <Link href="/events/create"><Button className="bg-primary text-white"><Plus className="h-4 w-4 mr-2" />Create Event</Button></Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon={<Calendar />} label="Total Events" value={events.length} loading={loading} />
          <StatCard icon={<Ticket />} label="Tickets Sold" value={totalSold} loading={loading} />
          <StatCard icon={<TrendingUp />} label="Total Revenue" value={formatCurrency(totalRevenue)} loading={loading} />
          <StatCard icon={<DollarSign />} label="Available Balance" value={formatCurrency(balance.available)} loading={loading} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Events</CardTitle>
            <Link href="/events/create"><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />New</Button></Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted mb-4">No events yet</p>
                <Link href="/events/create"><Button>Create Your First Event</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-bg/50 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge variant={event.status === 'PUBLISHED' ? 'success' : 'secondary'}>{event.status}</Badge>
                      </div>
                      <p className="text-sm text-text-muted">{formatDate(event.startDate)} • {event.totalTicketsSold} sold</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/events/${event.id}/scan`}><Button variant="outline" size="sm"><QrCode className="h-4 w-4" /></Button></Link>
                      <Link href={`/events/${event.id}/analytics`}><Button variant="outline" size="sm"><BarChart3 className="h-4 w-4" /></Button></Link>
                      <Link href={`/events/${event.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: string | number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="text-sm text-text-muted">{label}</p>
            {loading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-bold">{value}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
