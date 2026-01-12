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
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminUsersPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = async (pageNum: number) => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers(pageNum, 20);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchUsers(page);
  }, [authLoading, page]);

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
          <h1 className="text-2xl font-bold">Users</h1>
          <span className="text-sm text-muted-foreground">{total} total users</span>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg">
                  <tr>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Verified</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-4"><Skeleton className="h-10 w-40" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="relative w-16 h-16 mb-4 opacity-20">
                            <Image src="/icon.svg" alt="hdticketdesk" fill className="object-contain" />
                          </div>
                          <p className="text-text-muted">No users found</p>
                        </div>
                      </td>
                    </tr>
                  ) : users.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-text-muted">{user.email}</p>
                      </td>
                      <td className="p-4"><Badge>{user.role}</Badge></td>
                      <td className="p-4"><Badge variant={user.emailVerified ? 'success' : 'warning'}>{user.emailVerified ? 'Yes' : 'No'}</Badge></td>
                      <td className="p-4 text-text-muted">{formatDate(user.createdAt)}</td>
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
      </main>
    </div>
  );
}
