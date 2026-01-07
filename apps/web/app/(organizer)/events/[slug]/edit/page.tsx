'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layouts/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm();
  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const isOnline = watch('isOnline');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const event = await api.getEventBySlug(id as string);
        reset({
          title: event.title,
          description: event.description,
          startDate: event.startDate?.slice(0, 16),
          endDate: event.endDate?.slice(0, 16),
          isOnline: event.isOnline,
          location: event.location,
          onlineLink: event.onlineLink,
          tiers: event.tiers,
        });
      } catch (err) {
        error('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, reset, error]);

  const onSubmit = async (data: any) => {
    try {
      await api.updateEvent(id as string, data);
      success('Event updated!');
      router.push('/dashboard');
    } catch (err: any) {
      error(err.message || 'Failed to update');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-8 bg-bg"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-8 bg-bg">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input {...register('title')} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea {...register('description')} /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="datetime-local" {...register('startDate')} /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="datetime-local" {...register('endDate')} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register('isOnline')} className="rounded" />
                  <Label>Online event</Label>
                </div>
                {isOnline ? <div className="space-y-2"><Label>Link</Label><Input {...register('onlineLink')} /></div> : <div className="space-y-2"><Label>Location</Label><Input {...register('location')} /></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ticket Tiers</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, capacity: 50, refundEnabled: false })}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Tier {index + 1}</h4>
                      {fields.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label>Name</Label><Input {...register(`tiers.${index}.name`)} /></div>
                      <div className="space-y-2"><Label>Price</Label><Input type="number" {...register(`tiers.${index}.price`, { valueAsNumber: true })} /></div>
                      <div className="space-y-2"><Label>Capacity</Label><Input type="number" {...register(`tiers.${index}.capacity`, { valueAsNumber: true })} /></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button type="submit" className="bg-primary text-white" loading={isSubmitting}>Save Changes</Button>
          </form>
        </div>
      </main>
    </div>
  );
}
