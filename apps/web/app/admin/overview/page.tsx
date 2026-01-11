'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';
import { Users, Calendar, DollarSign, Ticket } from 'lucide-react';

export default function AdminOverviewPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getAdminDashboard();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Users />} label="Total Users" value={stats?.totalUsers || 0} loading={loading} />
          <StatCard icon={<Calendar />} label="Total Events" value={stats?.totalEvents || 0} loading={loading} />
          <StatCard icon={<Ticket />} label="Tickets Sold" value={stats?.totalTicketsSold || 0} loading={loading} />
          <StatCard icon={<DollarSign />} label="Platform Revenue" value={formatCurrency(stats?.platformRevenue || 0)} loading={loading} />
        </div>
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
