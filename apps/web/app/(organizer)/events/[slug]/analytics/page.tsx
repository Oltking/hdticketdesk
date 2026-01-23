'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';
import { 
  Ticket, 
  DollarSign, 
  UserCheck, 
  Percent, 
  BarChart3, 
  ArrowLeft, 
  TrendingUp, 
  RefreshCw,
  Users,
  Calendar,
  QrCode,
  ChevronRight
} from 'lucide-react';

export default function AnalyticsPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const [analytics, setAnalytics] = useState<any>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      // First get event by slug to get the ID
      const event = await api.getEventBySlug(slug as string);
      const eventId = event.id || event.data?.id;
      setEventTitle(event.title || event.data?.title || '');
      const data = await api.getEventAnalytics(eventId);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [slug]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-64" />
        </main>
      </div>
    );
  }

  const totalCapacity = analytics?.tierBreakdown?.reduce((sum: number, tier: any) => sum + tier.capacity, 0) || 0;
  const soldPercentage = totalCapacity > 0 ? ((analytics?.totalSold || 0) / totalCapacity * 100).toFixed(1) : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-2 -ml-2 gap-1 text-muted-foreground"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Event Analytics
            </h1>
            {eventTitle && (
              <p className="text-muted-foreground mt-1">{eventTitle}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href={`/events/${slug}/scan`}>
              <Button className="gap-2">
                <QrCode className="h-4 w-4" />
                Scan Tickets
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-5">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tickets Sold</p>
                  <p className="text-2xl font-bold">{analytics?.totalSold || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Ticket className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {soldPercentage}% of total capacity
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                </div>
                <div className="p-2 rounded-full bg-green-500/10">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Checked In</p>
                  <p className="text-2xl font-bold">{analytics?.checkedIn || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-purple-500/10">
                  <UserCheck className="h-4 w-4 text-purple-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                of {analytics?.totalSold || 0} tickets sold
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in Rate</p>
                  <p className="text-2xl font-bold">{analytics?.checkInRate || 0}%</p>
                </div>
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Percent className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics?.checkInRate || 0}%` }} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales by Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sales by Tier
            </CardTitle>
            <CardDescription>Breakdown of ticket sales across different tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {!analytics?.tierBreakdown || analytics.tierBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-primary/10 rounded-full" />
                  <div className="absolute inset-3 bg-primary/20 rounded-full flex items-center justify-center">
                    <Ticket className="h-6 w-6 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">No tiers available</h3>
                <p className="text-muted-foreground text-sm text-center">
                  Add ticket tiers to your event to see sales breakdown
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.tierBreakdown.map((tier: any, index: number) => {
                  const soldPercent = tier.capacity > 0 ? (tier.sold / tier.capacity * 100) : 0;
                  const isSoldOut = tier.sold >= tier.capacity;
                  
                  return (
                    <div 
                      key={tier.name} 
                      className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            isSoldOut 
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{tier.name}</h3>
                              {isSoldOut && (
                                <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                              )}
                              {tier.price === 0 && (
                                <Badge variant="secondary" className="text-xs">Free</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {tier.sold} / {tier.capacity} tickets sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">{formatCurrency(tier.revenue)}</p>
                          <p className="text-xs text-muted-foreground">
                            {tier.price > 0 ? `${formatCurrency(tier.price)} each` : 'Free'}
                          </p>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="relative">
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isSoldOut 
                                ? 'bg-red-500' 
                                : soldPercent > 75 
                                  ? 'bg-yellow-500' 
                                  : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(soldPercent, 100)}%` }} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {soldPercent.toFixed(1)}% sold
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <Link href={`/events/${slug}/scan`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <QrCode className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Scan Tickets</p>
                    <p className="text-sm text-muted-foreground">Check in attendees at your event</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/events/${slug}/edit`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Edit Event</p>
                    <p className="text-sm text-muted-foreground">Update event details and settings</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
