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
import { formatCurrency } from '@/lib/utils';
import { Users, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';

interface Organizer {
  id: string;
  title: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  balances: {
    pending: number;
    available: number;
    withdrawn: number;
  };
  earnings: {
    totalSales: number;
    totalRefunded: number;
    netEarnings: number;
  };
}

export default function AdminOrganizersPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        setLoading(true);
        const data = await api.getAllOrganizersEarnings(page, 20);
        setOrganizers(data.organizers);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error('Failed to fetch organizers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchOrganizers();
    }
  }, [authLoading, page]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="admin" />
        <main className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-6" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Organizer Earnings
              </h1>
              <p className="text-muted-foreground">
                View and manage organizer earnings across the platform
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Organizers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
              ) : organizers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No organizers yet</h3>
                  <p className="text-muted-foreground">
                    No organizers have been registered on the platform
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {organizers.map((organizer) => (
                      <div
                        key={organizer.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{organizer.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {organizer.user.firstName} {organizer.user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {organizer.user.email}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                            <div className="text-center lg:text-left">
                              <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(organizer.earnings.totalSales)}
                              </p>
                            </div>
                            <div className="text-center lg:text-left">
                              <p className="text-xs text-muted-foreground mb-1">Refunded</p>
                              <p className="font-semibold text-red-600">
                                {formatCurrency(organizer.earnings.totalRefunded)}
                              </p>
                            </div>
                            <div className="text-center lg:text-left">
                              <p className="text-xs text-muted-foreground mb-1">Available</p>
                              <p className="font-semibold">
                                {formatCurrency(organizer.balances.available)}
                              </p>
                            </div>
                            <div className="text-center lg:text-left">
                              <p className="text-xs text-muted-foreground mb-1">Withdrawn</p>
                              <p className="font-semibold">
                                {formatCurrency(organizer.balances.withdrawn)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link href={`/admin/organizers/${organizer.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </Link>
                          </div>
                        </div>

                        {organizer.balances.pending > 0 && (
                          <div className="mt-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                            <p className="text-sm">
                              <span className="font-medium text-warning">Pending Balance:</span>{' '}
                              {formatCurrency(organizer.balances.pending)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2 px-4">
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {totalPages}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
