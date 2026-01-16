'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Users, 
  Calendar, 
  Ticket, 
  DollarSign, 
  TrendingUp, 
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw
} from 'lucide-react';

export default function AdminOverviewPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await api.getAdminDashboard();
      setStats(data);
    } catch (err) {
      // Silent fail - stats will show 0
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Platform overview and statistics</p>
          </div>
          <button 
            onClick={() => fetchData(true)} 
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          <StatCard 
            icon={<Users className="h-5 w-5" />} 
            label="Total Users" 
            value={stats?.totalUsers || 0} 
            loading={loading}
            color="blue"
          />
          <StatCard 
            icon={<Building2 className="h-5 w-5" />} 
            label="Organizers" 
            value={stats?.totalOrganizers || 0} 
            loading={loading}
            color="purple"
          />
          <StatCard 
            icon={<Calendar className="h-5 w-5" />} 
            label="Total Events" 
            value={stats?.totalEvents || 0} 
            loading={loading}
            color="green"
          />
          <StatCard 
            icon={<Ticket className="h-5 w-5" />} 
            label="Tickets Sold" 
            value={stats?.totalTickets || 0} 
            loading={loading}
            color="orange"
          />
          <StatCard 
            icon={<TrendingUp className="h-5 w-5" />} 
            label="Total Revenue" 
            value={formatCurrency(stats?.totalRevenue || 0)} 
            loading={loading}
            color="emerald"
          />
          <StatCard 
            icon={<DollarSign className="h-5 w-5" />} 
            label="Platform Fees" 
            value={formatCurrency(stats?.platformFees || 0)} 
            loading={loading}
            color="yellow"
            highlight
          />
        </div>

        {/* Recent Payments Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Recent Payments
                </h2>
                <Link href="/admin/ledger" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : stats?.recentPayments?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentPayments.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-500/10">
                          <ArrowDownRight className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{payment.reference}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                        <Badge variant="success" className="text-xs">{payment.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No recent payments</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid gap-3">
                <Link 
                  href="/admin/users" 
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Manage Users</p>
                      <p className="text-sm text-muted-foreground">View and manage all users</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link 
                  href="/admin/events" 
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Calendar className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Manage Events</p>
                      <p className="text-sm text-muted-foreground">View, unpublish, or delete events</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </Link>
                <Link 
                  href="/admin/ledger" 
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <DollarSign className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium">View Ledger</p>
                      <p className="text-sm text-muted-foreground">Audit all financial transactions</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  loading, 
  color = 'primary',
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  loading: boolean;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'emerald' | 'yellow' | 'primary';
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    yellow: 'bg-yellow-500/10 text-yellow-600',
    primary: 'bg-primary/10 text-primary',
  };

  return (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-bold truncate">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
