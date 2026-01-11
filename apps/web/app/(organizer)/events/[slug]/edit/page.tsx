'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import Image from 'next/image';
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
import { Plus, Trash2, X, ImageIcon, AlertCircle, CheckCircle2, Globe, Lock } from 'lucide-react';

export default function EditEventPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm();
  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const isOnline = watch('isOnline');
  const isLocationPublic = watch('isLocationPublic');

  // Recommended banner sizes
  const recommendedSizes = [
    { label: 'Standard (16:9)', width: 1920, height: 1080, description: 'Best for most displays' },
    { label: 'Wide (2:1)', width: 1200, height: 600, description: 'Great for social sharing' },
    { label: 'Square (1:1)', width: 1080, height: 1080, description: 'Perfect for mobile' },
  ];

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.getEventBySlug(slug as string);
        // Handle wrapped response
        const event = response.data || response;
        setEventId(event.id);
        setCoverImage(event.coverImage || null);
        reset({
          title: event.title,
          description: event.description,
          startDate: event.startDate?.slice(0, 16),
          endDate: event.endDate?.slice(0, 16),
          isOnline: event.isOnline,
          location: event.location,
          isLocationPublic: event.isLocationPublic ?? true,
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
  }, [slug, reset, error]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous status
    setUploadStatus(null);

    if (!file.type.startsWith('image/')) {
      setUploadStatus({ type: 'error', message: 'Please select a valid image file (PNG, JPG, GIF, WebP)' });
      error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: 'Image size exceeds 5MB limit. Please choose a smaller file.' });
      error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const response = await api.uploadImage(file, 'events');
      // Handle wrapped response { data: { url } } or direct { url }
      const result = response.data || response;
      const imageUrl = result.url || result.secure_url;
      setCoverImage(imageUrl);
      setUploadStatus({ type: 'success', message: 'Banner image uploaded successfully!' });
      success('Banner image uploaded successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload image. Please try again.';
      setUploadStatus({ type: 'error', message: errorMessage });
      error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setUploadStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const eventData = {
        ...data,
        coverImage: coverImage || undefined,
      };
      await api.updateEvent(eventId as string, eventData);
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
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Banner/Cover Image Upload */}
            <Card>
              <CardHeader><CardTitle>Event Banner</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coverImage ? (
                    <div className="relative">
                      <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={coverImage}
                          alt="Event banner"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeCoverImage}
                        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => !uploadingImage && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        uploadingImage 
                          ? 'border-primary/50 bg-primary/5 cursor-wait' 
                          : 'border-border cursor-pointer hover:border-primary hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {uploadingImage ? (
                          <>
                            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Uploading your banner...</p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">Click to upload banner image</p>
                              <p className="text-sm text-muted-foreground">PNG, JPG, GIF, WebP up to 5MB</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload Status Message */}
                  {uploadStatus && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                      uploadStatus.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {uploadStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{uploadStatus.message}</span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Recommended Sizes */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Recommended Sizes:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {recommendedSizes.map((size) => (
                        <div 
                          key={size.label}
                          className="p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <p className="font-medium text-sm">{size.label}</p>
                          <p className="text-xs text-muted-foreground">{size.width} × {size.height}px</p>
                          <p className="text-xs text-muted-foreground">{size.description}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Tip: A high-quality banner helps your event stand out and attracts more attendees.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                {isOnline ? (
                  <div className="space-y-2">
                    <Label>Link</Label>
                    <Input {...register('onlineLink')} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input {...register('location')} />
                    </div>
                    
                    {/* Location Visibility Toggle */}
                    <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center h-5 mt-0.5">
                          <input 
                            type="checkbox" 
                            id="isLocationPublic"
                            {...register('isLocationPublic')} 
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div className="flex-1">
                          <label htmlFor="isLocationPublic" className="flex items-center gap-2 cursor-pointer">
                            {isLocationPublic ? (
                              <Globe className="w-4 h-4 text-primary" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm">
                              {isLocationPublic ? 'Location is Public' : 'Location is Private'}
                            </span>
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isLocationPublic 
                              ? '📍 The event location will be displayed publicly on the event page.'
                              : '🔒 Uncheck to keep location private - it will only be shared via email after ticket purchase.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
