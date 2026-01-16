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
import { Plus, Trash2, X, ImageIcon, AlertCircle, CheckCircle2, Globe, Lock, Percent, Info, MapPin } from 'lucide-react';
import { MapPicker } from '@/components/ui/map-picker';

export default function EditEventPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [ticketsSold, setTicketsSold] = useState<number>(0);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, watch, reset, setValue, formState: { isSubmitting } } = useForm();
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
        setEventStatus(event.status);
        setTicketsSold(event.totalTicketsSold || 0);
        
        // Set cover image - ensure it's a valid URL
        if (event.coverImage && event.coverImage.startsWith('http')) {
          setCoverImage(event.coverImage);
        } else {
          setCoverImage(null);
        }
        
        // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
        const formatDateForInput = (dateStr: string | null | undefined) => {
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr);
            return date.toISOString().slice(0, 16);
          } catch {
            return '';
          }
        };
        
        // Map tiers to include isFree flag based on price
        const tiersWithFreeFlag = (event.tiers || []).map((tier: any) => ({
          ...tier,
          isFree: Number(tier.price) === 0,
        }));

        reset({
          title: event.title || '',
          description: event.description || '',
          startDate: formatDateForInput(event.startDate),
          endDate: formatDateForInput(event.endDate),
          isOnline: event.isOnline || false,
          location: event.location || '',
          latitude: event.latitude ?? undefined,
          longitude: event.longitude ?? undefined,
          isLocationPublic: event.isLocationPublic ?? true,
          onlineLink: event.onlineLink || '',
          passFeeTobuyer: event.passFeeTobuyer || false,
          tiers: tiersWithFreeFlag,
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
      const result = await api.uploadImage(file, 'events');
      const imageUrl = result.url;
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

  const onSubmit = async (data: any, publish = false) => {
    try {
      // Sanitize tiers - strip isFree field (frontend only) and ensure free tickets have price 0
      const sanitizedTiers = data.tiers?.map((tier: any) => ({
        name: tier.name,
        description: tier.description,
        price: tier.isFree ? 0 : tier.price,
        capacity: tier.capacity,
        refundEnabled: tier.refundEnabled,
      })) || [];

      // Filter out empty strings for optional fields
      const eventData = {
        ...data,
        tiers: sanitizedTiers,
        coverImage: coverImage || undefined,
        // Only include endDate if it has a value
        endDate: data.endDate && data.endDate.trim() !== '' ? data.endDate : null,
        // Only include location fields if not online and has value
        location: !data.isOnline && data.location ? data.location : undefined,
        latitude: !data.isOnline && data.latitude ? data.latitude : undefined,
        longitude: !data.isOnline && data.longitude ? data.longitude : undefined,
        // Only include onlineLink if online and has value
        onlineLink: data.isOnline && data.onlineLink ? data.onlineLink : undefined,
      };
      
      await api.updateEvent(eventId as string, eventData);
      
      if (publish && eventStatus === 'DRAFT') {
        setPublishing(true);
        await api.publishEvent(eventId as string);
        success('Event updated and published!');
      } else {
        success('Event updated!');
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      error(err.message || 'Failed to update');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!eventId) return;
    
    try {
      setUnpublishing(true);
      await api.unpublishEvent(eventId);
      setEventStatus('DRAFT');
      success('Event unpublished! It is now a draft.');
    } catch (err: any) {
      error(err.message || 'Failed to unpublish event');
    } finally {
      setUnpublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    
    try {
      setDeleting(true);
      await api.deleteEvent(eventId);
      success('Event deleted successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      error(err.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
          <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="space-y-6">
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
                    {/* Map Picker for Location */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Event Location
                      </Label>
                      <MapPicker
                        value={watch('latitude') && watch('longitude') ? {
                          lat: watch('latitude'),
                          lng: watch('longitude'),
                          address: watch('location')
                        } : undefined}
                        onChange={(location) => {
                          if (location) {
                            setValue('location', location.address);
                            setValue('latitude', location.lat);
                            setValue('longitude', location.lng);
                          } else {
                            setValue('location', '');
                            setValue('latitude', undefined);
                            setValue('longitude', undefined);
                          }
                        }}
                      />
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

            {/* Service Fee Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Service Fee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input 
                        type="checkbox" 
                        id="passFeeTobuyer"
                        {...register('passFeeTobuyer')} 
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="passFeeTobuyer" className="flex items-center gap-2 cursor-pointer">
                        <span className="font-medium text-sm">
                          Pass service fee to buyers
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        If checked, the 5% platform service fee will be added to the ticket price during checkout and paid by the buyer. 
                        If unchecked, the fee will be deducted from your earnings.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Example: For a ₦10,000 ticket, if passed to buyer, they pay ₦10,500 (₦10,000 + ₦500 fee). 
                      If not passed, buyer pays ₦10,000 and you receive ₦9,500.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ticket Tiers</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', isFree: false, price: 0, capacity: 50, refundEnabled: false })}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => {
                  const isFree = watch(`tiers.${index}.isFree`);
                  return (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between">
                        <h4 className="font-medium">Tier {index + 1}</h4>
                        {fields.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-danger" /></Button>}
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2"><Label>Name</Label><Input {...register(`tiers.${index}.name`)} /></div>
                        <div className="space-y-2">
                          <Label>Price (₦)</Label>
                          <div className="space-y-2">
                            <Input 
                              type="number" 
                              {...register(`tiers.${index}.price`, { valueAsNumber: true })} 
                              min={0}
                              disabled={isFree}
                              className={isFree ? 'bg-muted text-muted-foreground' : ''}
                            />
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`free-${index}`} 
                                {...register(`tiers.${index}.isFree`)}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setValue(`tiers.${index}.isFree`, isChecked);
                                  if (isChecked) {
                                    setValue(`tiers.${index}.price`, 0);
                                  }
                                }}
                                className="rounded border-green-500 text-green-600 focus:ring-green-500" 
                              />
                              <Label htmlFor={`free-${index}`} className="text-sm text-green-600 font-medium">Free Ticket</Label>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2"><Label>Capacity</Label><Input type="number" {...register(`tiers.${index}.capacity`, { valueAsNumber: true })} min={1} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`refund-${index}`} {...register(`tiers.${index}.refundEnabled`)} className="rounded" />
                        <Label htmlFor={`refund-${index}`}>Allow refunds for this tier</Label>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-4">
              <Button type="submit" variant="outline" loading={isSubmitting && !publishing}>
                Save Changes
              </Button>
              {eventStatus === 'DRAFT' && (
                <Button 
                  type="button" 
                  className="bg-primary text-white" 
                  loading={publishing}
                  onClick={handleSubmit((d) => onSubmit(d, true))}
                >
                  Save & Publish
                </Button>
              )}
              {eventStatus === 'PUBLISHED' && ticketsSold === 0 && (
                <Button 
                  type="button" 
                  variant="outline"
                  className="border-warning text-warning hover:bg-warning/10"
                  loading={unpublishing}
                  onClick={handleUnpublish}
                >
                  Unpublish Event
                </Button>
              )}
              {eventStatus === 'PUBLISHED' && ticketsSold > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>To unpublish, contact <a href="mailto:support@hdticketdesk.com" className="text-primary underline">support</a></span>
                </div>
              )}
              {eventStatus === 'DRAFT' && (
                <Button 
                  type="button" 
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Event
                </Button>
              )}
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-2">Delete Event?</h3>
                  <p className="text-muted-foreground mb-4">
                    Are you sure you want to delete this event? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      loading={deleting}
                      onClick={handleDelete}
                    >
                      Delete Event
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
