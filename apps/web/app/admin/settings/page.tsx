'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layouts/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';

export default function AdminOverridesPage() {
  const { isLoading: authLoading } = useAuth(true, ['ADMIN']);
  const { success, error } = useToast();
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState<'enabled' | 'disabled' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (allow: boolean) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await api.adminToggleAllowEditAfterSales(eventId, allow);
      success(res.message || 'Updated');
      setStatus(allow ? 'enabled' : 'disabled');
    } catch (e: any) {
      error(e.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar type="admin" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">Admin Overrides</h1>
        <p className="text-sm text-muted-foreground mb-6">Toggle platform-level overrides for specific events.</p>

        <Card>
          <CardHeader>
            <CardTitle>Allow Edit After Sales</CardTitle>
            <CardDescription>Enable organizers to edit existing tiers (name/price/refund) even after sales have started.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="text-sm">Event ID</label>
              <Input placeholder="Enter event ID" value={eventId} onChange={(e) => setEventId(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleToggle(true)} loading={loading}>Enable</Button>
                <Button variant="outline" onClick={() => handleToggle(false)} loading={loading}>Disable</Button>
              </div>
              {status && (
                <p className="text-xs text-muted-foreground">Current status for this session: <span className={status==='enabled'? 'text-emerald-600' : 'text-muted-foreground'}>{status}</span></p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
