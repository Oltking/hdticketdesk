'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

const tierSchema = z.object({
  name: z.string().min(1, 'Required'),
  price: z.number().min(0),
  capacity: z.number().min(1),
  description: z.string().optional(),
  refundEnabled: z.boolean().default(false),
});

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().optional(),
  onlineLink: z.string().optional(),
  tiers: z.array(tierSchema).min(1, 'At least one ticket tier is required'),
});

type FormData = z.infer<typeof schema>;

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [publishing, setPublishing] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isOnline: false, tiers: [{ name: 'General', price: 0, capacity: 100, refundEnabled: false }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const isOnline = watch('isOnline');

  const onSubmit = async (data: FormData, publish = false) => {
    try {
      const event = await api.createEvent(data);
      if (publish) {
        setPublishing(true);
        await api.publishEvent(event.id);
        success('Event created and published!');
      } else {
        success('Event saved as draft!');
      }
      router.push('/dashboard');
    } catch (err: any) {
      error(err.message || 'Failed to create event');
    } finally {
      setPublishing(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-8 bg-bg">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

          <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Title</Label>
                  <Input {...register('title')} error={errors.title?.message} placeholder="e.g., Tech Conference 2025" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea {...register('description')} error={errors.description?.message} placeholder="Tell people about your event..." />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date & Time</Label>
                    <Input type="datetime-local" {...register('startDate')} error={errors.startDate?.message} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date & Time (Optional)</Label>
                    <Input type="datetime-local" {...register('endDate')} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isOnline" {...register('isOnline')} className="rounded" />
                  <Label htmlFor="isOnline">This is an online event</Label>
                </div>
                {isOnline ? (
                  <div className="space-y-2">
                    <Label>Online Event Link</Label>
                    <Input {...register('onlineLink')} placeholder="https://zoom.us/..." />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input {...register('location')} placeholder="Event venue address" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ticket Tiers</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, capacity: 50, refundEnabled: false })}>
                  <Plus className="h-4 w-4 mr-1" />Add Tier
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border border-border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Tier {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Tier Name</Label>
                        <Input {...register(`tiers.${index}.name`)} placeholder="e.g., VIP, General" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₦)</Label>
                        <Input type="number" {...register(`tiers.${index}.price`, { valueAsNumber: true })} min={0} />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input type="number" {...register(`tiers.${index}.capacity`, { valueAsNumber: true })} min={1} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id={`refund-${index}`} {...register(`tiers.${index}.refundEnabled`)} className="rounded" />
                      <Label htmlFor={`refund-${index}`}>Allow refunds for this tier</Label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" variant="outline" loading={isSubmitting && !publishing}>Save as Draft</Button>
              <Button type="button" className="bg-primary text-white" loading={publishing} onClick={handleSubmit((d) => onSubmit(d, true))}>
                Save & Publish
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
