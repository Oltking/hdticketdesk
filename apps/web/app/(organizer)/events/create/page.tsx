'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/layouts/sidebar';
import { OrganizationNameDialog, useOrganizationNameCheck } from '@/components/ui/organization-name-dialog';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, X, ImageIcon, AlertCircle, CheckCircle2, MapPin, Lock, Globe, Info, Percent } from 'lucide-react';
import { MapPicker } from '@/components/ui/map-picker';

const tierSchema = z.object({
  name: z.string().min(1, 'Required'),
  isFree: z.boolean().default(false),
  price: z.number().min(0),
  capacity: z.number().min(1),
  description: z.string().optional(),
  refundEnabled: z.boolean().default(false),
  saleEndDate: z.string().optional(), // Date and time when ticket sales end
});

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isOnline: z.boolean().default(false),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isLocationPublic: z.boolean().default(true),
  onlineLink: z.string().optional(),
  tiers: z.array(tierSchema).min(1, 'At least one ticket tier is required'),
  passFeeTobuyer: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOrgNameDialog, setShowOrgNameDialog] = useState(false);
  
  // Check if organization name is needed
  const { needsOrganizationName } = useOrganizationNameCheck(user);
  
  // Show organization name dialog if needed
  useEffect(() => {
    if (!authLoading && needsOrganizationName) {
      setShowOrgNameDialog(true);
    }
  }, [authLoading, needsOrganizationName]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isOnline: false, isLocationPublic: true, passFeeTobuyer: false, tiers: [{ name: 'General', isFree: false, price: 0, capacity: 100, refundEnabled: false }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const isOnline = watch('isOnline');
  const isLocationPublic = watch('isLocationPublic');
  const startDate = watch('startDate');

  // Recommended banner sizes
  const recommendedSizes = [
    { label: 'Standard (16:9)', width: 1920, height: 1080, description: 'Best for most displays' },
    { label: 'Wide (2:1)', width: 1200, height: 600, description: 'Great for social sharing' },
    { label: 'Square (1:1)', width: 1080, height: 1080, description: 'Perfect for mobile' },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous status
    setUploadStatus(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadStatus({ type: 'error', message: 'Please select a valid image file (PNG, JPG, GIF, WebP)' });
      error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
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

  const onSubmit = async (data: FormData, publish = false) => {
    try {
      if (publish) {
        setPublishing(true);
      }
      
      // Sanitize tiers - strip isFree field (frontend only) and ensure free tickets have price 0
      const sanitizedTiers = data.tiers.map((tier) => ({
        name: tier.name,
        description: tier.description,
        price: tier.isFree ? 0 : tier.price,
        capacity: tier.capacity,
        refundEnabled: tier.refundEnabled,
        saleEndDate: tier.saleEndDate && tier.saleEndDate.trim() !== '' ? tier.saleEndDate : undefined,
      }));

      // Include cover image in the event data
      // Filter out empty strings for optional fields
      const eventData = {
        ...data,
        tiers: sanitizedTiers,
        coverImage: coverImage || undefined,
        // Only include endDate if it has a value
        endDate: data.endDate && data.endDate.trim() !== '' ? data.endDate : undefined,
        // Only include location fields if not online and has value
        location: !data.isOnline && data.location ? data.location : undefined,
        latitude: !data.isOnline && data.latitude ? data.latitude : undefined,
        longitude: !data.isOnline && data.longitude ? data.longitude : undefined,
        // Only include onlineLink if online and has value
        onlineLink: data.isOnline && data.onlineLink ? data.onlineLink : undefined,
      };
      
      // API client already unwraps the response, so response is the event directly
      const event = await api.createEvent(eventData);
      
      if (!event || !event.id) {
        throw new Error('Failed to create event - no event ID returned');
      }
      
      if (publish) {
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
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

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
                  <div className="space-y-4">
                    {/* Map Picker for Location */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Event Location
                      </Label>
                      <MapPicker
                        value={watch('latitude') && watch('longitude') ? {
                          lat: watch('latitude')!,
                          lng: watch('longitude')!,
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

            {/* Service Fee Option */}
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
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', isFree: false, price: 0, capacity: 50, refundEnabled: false })}>
                  <Plus className="h-4 w-4 mr-1" />Add Tier
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => {
                  const isFree = watch(`tiers.${index}.isFree`);
                  return (
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
                          <div className="space-y-2">
                            <Input 
                              type="number" 
                              {...register(`tiers.${index}.price`, { valueAsNumber: true })} 
                              min={0} 
                              disabled={isFree}
                              className={isFree ? 'bg-muted text-muted-foreground' : ''}
                              value={isFree ? 0 : undefined}
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
                        <div className="space-y-2">
                          <Label>Capacity</Label>
                          <Input type="number" {...register(`tiers.${index}.capacity`, { valueAsNumber: true })} min={1} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Sale End Date & Time (Optional)</Label>
                        <Input 
                          type="datetime-local" 
                          {...register(`tiers.${index}.saleEndDate`)}
                          min={startDate || undefined}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to allow sales until the event starts
                        </p>
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

            <div className="flex gap-4">
              <Button type="submit" variant="outline" loading={isSubmitting && !publishing}>Save as Draft</Button>
              <Button type="button" className="bg-primary text-white" loading={publishing} onClick={handleSubmit((d) => onSubmit(d, true))}>
                Save & Publish
              </Button>
            </div>
          </form>
        </div>

        {/* Organization Name Dialog */}
        <OrganizationNameDialog
          open={showOrgNameDialog}
          onSuccess={() => {
            setShowOrgNameDialog(false);
            refreshUser?.();
          }}
        />
      </main>
    </div>
  );
}
