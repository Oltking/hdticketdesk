'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getAdminUsers();
        setUsers(data.users || data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchUsers();
  }, [authLoading]);

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-8 bg-bg">
        <h1 className="text-2xl font-bold mb-6">Users</h1>
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
                  {users.map((user) => (
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
