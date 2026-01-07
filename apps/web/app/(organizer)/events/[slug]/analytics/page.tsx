'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layouts/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';
import { Ticket, DollarSign, Users, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const { id } = useParams();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.getEventAnalytics(id as string);
        setAnalytics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-8 bg-bg">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-6 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-8 bg-bg">
        <h1 className="text-2xl font-bold mb-6">Event Analytics</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard icon={<Ticket />} label="Tickets Sold" value={analytics?.totalSold || 0} />
          <StatCard icon={<DollarSign />} label="Total Revenue" value={formatCurrency(analytics?.totalRevenue || 0)} />
          <StatCard icon={<Users />} label="Checked In" value={analytics?.checkedIn || 0} />
          <StatCard icon={<TrendingUp />} label="Check-in Rate" value={`${analytics?.checkInRate || 0}%`} />
        </div>

        <Card>
          <CardHeader><CardTitle>Sales by Tier</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.tierBreakdown?.map((tier: any) => (
                <div key={tier.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{tier.name}</h3>
                    <p className="text-sm text-text-muted">{tier.sold} / {tier.capacity} sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(tier.revenue)}</p>
                    <div className="w-32 h-2 bg-bg rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(tier.sold / tier.capacity) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div><p className="text-sm text-text-muted">{label}</p><p className="text-2xl font-bold">{value}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
