'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/layouts/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  X, 
  ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  Lock, 
  Percent, 
  Info, 
  MapPin,
  ArrowLeft,
  Calendar,
  Edit3,
  Eye,
  EyeOff,
  QrCode,
  BarChart3,
  Ticket,
  EyeIcon
} from 'lucide-react';
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
  const hasSales = ticketsSold > 0;
  const [allowEditAfterSales, setAllowEditAfterSales] = useState<boolean>(false);
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
  const startDate = watch('startDate');

  // Recommended banner sizes
  const recommendedSizes = [
    { label: 'Standard (16:9)', width: 1920, height: 1080, description: 'Best for most displays' },
    { label: 'Wide (2:1)', width: 1200, height: 600, description: 'Great for social sharing' },
    { label: 'Square (1:1)', width: 1080, height: 1080, description: 'Perfect for mobile' },
  ];

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // Include unpublished events so organizers can edit their drafts
        const response = await api.getEventBySlug(slug as string, true);
        // Handle wrapped response
        const event = response.data || response;
        setEventId(event.id);
        setEventStatus(event.status);
        setTicketsSold(event.totalTicketsSold || 0);
        setAllowEditAfterSales(Boolean(event.allowEditAfterSales));
        
        // Set cover image - ensure it's a valid URL
        if (event.coverImage && event.coverImage.startsWith('http')) {
          setCoverImage(event.coverImage);
        } else {
          setCoverImage(null);
        }
        
        // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
        // We preserve the exact time the organizer entered without timezone conversion
        const formatDateForInput = (dateStr: string | null | undefined) => {
          if (!dateStr) return '';
          try {
            // If it's already in datetime-local format, return as-is
            if (dateStr.length === 16 && dateStr.includes('T')) {
              return dateStr;
            }
            // Parse ISO string and extract local components without UTC conversion
            // ISO format: "2024-02-10T22:00:00.000Z" - we want "2024-02-10T22:00"
            // But we need to use local timezone, not UTC
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // Format as local time: YYYY-MM-DDTHH:MM
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          } catch {
            return '';
          }
        };

        // Map tiers to include isFree flag based on price
        const tiersWithFreeFlag = (event.tiers || []).map((tier: any) => ({
          ...tier,
          __existing: true, // mark tiers loaded from backend as existing
          isFree: Number(tier.price) === 0,
          saleEndDate: formatDateForInput(tier.saleEndDate),
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
          hideTicketSalesProgress: event.hideTicketSalesProgress || false,
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

  // Helper function to convert datetime-local string to ISO string
  // datetime-local gives us "2024-02-10T22:00" without timezone
  // We interpret this as the local time the user intended and convert to ISO
  // Convert datetime-local input to ISO string WITHOUT timezone conversion
  // This preserves the exact time the organizer entered
  const toISOString = (dateTimeLocal: string | undefined | null): string | undefined => {
    if (!dateTimeLocal || dateTimeLocal.trim() === '') return undefined;
    // The datetime-local input returns a string like "2024-02-10T22:00"
    // We append seconds and Z to make it a valid ISO string, but treat it as the literal time
    // This means "22:00" stays "22:00" regardless of timezone
    if (dateTimeLocal.length === 16 && dateTimeLocal.includes('T')) {
      return `${dateTimeLocal}:00.000Z`;
    }
    // If it's already an ISO string, return as-is
    if (dateTimeLocal.includes('Z') || dateTimeLocal.includes('+')) {
      return dateTimeLocal;
    }
    // Fallback: append Z to treat as UTC literal
    return `${dateTimeLocal}:00.000Z`;
  };

  const onSubmit = async (data: any, publish = false) => {
    try {
      // Sanitize tiers - strip isFree field (frontend only) and ensure free tickets have price 0
      const sanitizedTiers = data.tiers?.map((tier: any) => ({
        id: tier.id, // include id so backend can enforce tier update rules
        name: tier.name,
        description: tier.description,
        price: tier.isFree ? 0 : tier.price,
        capacity: tier.capacity,
        refundEnabled: tier.refundEnabled,
        // Convert tier sale end date to ISO string
        saleEndDate: toISOString(tier.saleEndDate),
      })) || [];

      // Build payload. If there are sales, only send allowed fields to avoid backend rejection.
      // Convert dates to ISO strings for consistent timezone handling
      const basePayload: any = {
        tiers: sanitizedTiers,
        coverImage: coverImage || undefined,
        // Convert endDate to ISO string
        endDate: toISOString(data.endDate) || null,
      };

      const eventData = hasSales
        ? {
            ...basePayload,
            description: data.description,
            // Convert startDate to ISO string
            startDate: toISOString(data.startDate) || data.startDate,
            // hideTicketSalesProgress is safe to change after sales (display-only setting)
            // Convert to boolean in case checkbox returns string "on" 
            hideTicketSalesProgress: data.hideTicketSalesProgress === true || data.hideTicketSalesProgress === 'on',
          }
        : {
            ...data,
            ...basePayload,
            // Convert startDate to ISO string
            startDate: toISOString(data.startDate) || data.startDate,
            // Only include location fields if not online and has value
            location: !data.isOnline && data.location ? data.location : undefined,
            latitude: !data.isOnline && data.latitude ? data.latitude : undefined,
            longitude: !data.isOnline && data.longitude ? data.longitude : undefined,
            // Only include onlineLink if online and has value
            onlineLink: data.isOnline && data.onlineLink ? data.onlineLink : undefined,
            // Convert to boolean in case checkbox returns string "on"
            hideTicketSalesProgress: data.hideTicketSalesProgress === true || data.hideTicketSalesProgress === 'on',
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
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="max-w-3xl space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        <div className="max-w-3xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
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
                <Edit3 className="h-6 w-6 text-primary" />
                Edit Event
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant={eventStatus === 'PUBLISHED' ? 'success' : 'secondary'}
                  className="gap-1"
                >
                  {eventStatus === 'PUBLISHED' ? (
                    <><CheckCircle2 className="h-3 w-3" />Published</>
                  ) : (
                    <><Calendar className="h-3 w-3" />Draft</>
                  )}
                </Badge>
                {ticketsSold > 0 && (
                  <Badge variant="default" className="gap-1">
                    <Ticket className="h-3 w-3" />
                    {ticketsSold} sold
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/events/${slug}/analytics`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </Link>
              <Link href={`/events/${slug}/scan`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <QrCode className="h-4 w-4" />
                  Scan
                </Button>
              </Link>
            </div>
          </div>

          {hasSales && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/40 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-200">
              <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Editing is limited after sales begin</p>
                <p className="text-sm mt-1">
                  This event has ticket sales. You can update description and images, adjust event dates, change tier capacity, and add new tiers. Pricing and core logistics are locked.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="space-y-6">
            {/* Banner/Cover Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Event Banner
                </CardTitle>
                <CardDescription>Upload an eye-catching banner image for your event</CardDescription>
              </CardHeader>
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Event Details
                </CardTitle>
                <CardDescription>Basic information about your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Event Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register('title', { required: 'Event title is required' })}
                    placeholder="e.g., Tech Conference 2025"
                    disabled={hasSales}
                  />
                </div>
                <div className="space-y-2"><Label>Description <span className="text-red-500">*</span></Label><Textarea {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description must be at least 10 characters' } })} placeholder="Tell people about your event... (minimum 10 characters)" /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Start Date & Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      {...register('startDate', { required: 'Start date is required' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date & Time (Optional)</Label>
                    <Input type="datetime-local" {...register('endDate')} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register('isOnline')} className="rounded" disabled={hasSales} />
                  <Label>Online event</Label>
                </div>
                {isOnline ? (
                  <div className="space-y-2">
                    <Label>Link</Label>
                    <Input {...register('onlineLink')} disabled={hasSales} />
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
                        disabled={hasSales}
                        value={watch('latitude') && watch('longitude') ? {
                          lat: watch('latitude'),
                          lng: watch('longitude'),
                          address: watch('location')
                        } : undefined}
                        onChange={(location) => {
                          if (hasSales) return;
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
                            disabled={hasSales}
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
                  Checkout Pricing
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
                        disabled={hasSales}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="passFeeTobuyer" className="flex items-center gap-2 cursor-pointer">
                        <span className="font-medium text-sm">
                          Buyers pay extra at checkout
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        If checked, buyers will pay a little extra at checkout.
                        If unchecked, buyers will pay the exact ticket price shown.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hide Ticket Sales Progress Option */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeIcon className="h-5 w-5" />
                  Sales Visibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input 
                        type="checkbox" 
                        id="hideTicketSalesProgress"
                        {...register('hideTicketSalesProgress')} 
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="hideTicketSalesProgress" className="flex items-center gap-2 cursor-pointer">
                        <span className="font-medium text-sm">
                          Hide ticket sales progress from users
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        When enabled, public visitors will not see how many tickets are left, percentage sold, or progress bars. This can help avoid discouraging purchases for events with slow early sales.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs text-amber-700 dark:text-amber-300">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Hidden indicators include: "X left", "X% sold", progress bars, and "selling fast" badges.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    Ticket Tiers <span className="text-red-500">*</span>
                  </CardTitle>
                  <CardDescription className="mt-1">Create different ticket types with varying prices (at least one required)</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', isFree: false, price: 0, capacity: 50, refundEnabled: false, __existing: false })} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Tier
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => {
                  const isFree = watch(`tiers.${index}.isFree`);
                  // Check if this tier exists in the database by looking at the tier's database ID
                  // field.id is react-hook-form's internal ID, not the database ID
                  // We need to check if the tier has a database ID stored in the form data
                  const tierData = watch(`tiers.${index}`);
                  const isExistingTier = tierData?.__existing === true;
                  const lockedExistingTier = hasSales && isExistingTier && !allowEditAfterSales;
                  return (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between">
                        <h4 className="font-medium">Tier {index + 1}</h4>
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" disabled={lockedExistingTier} onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2"><Label>Tier Name <span className="text-red-500">*</span></Label><Input {...register(`tiers.${index}.name`, { required: 'Tier name is required' })} placeholder="e.g., VIP, General" disabled={lockedExistingTier} /></div>
                        <div className="space-y-2">
                          <Label>Price (₦) <span className="text-red-500">*</span></Label>
                          <div className="space-y-2">
                            <Input 
                              type="number" 
                              {...register(`tiers.${index}.price`, { valueAsNumber: true, min: { value: 0, message: 'Price cannot be negative' } })} 
                              min={0}
                              className={isFree ? 'bg-muted text-muted-foreground' : ''}
                              disabled={isFree || lockedExistingTier}
                            />
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`free-${index}`} 
                                {...register(`tiers.${index}.isFree`)}
                                onChange={(e) => {
                                  if (lockedExistingTier) return; // Prevent change for locked existing tiers (unless admin override)
                                  const isChecked = e.target.checked;
                                  setValue(`tiers.${index}.isFree`, isChecked);
                                  if (isChecked) {
                                    setValue(`tiers.${index}.price`, 0);
                                  }
                                }}
                                disabled={hasSales && isExistingTier}
                                className="rounded border-green-500 text-green-600 focus:ring-green-500" 
                              />
                              <Label htmlFor={`free-${index}`} className="text-sm text-green-600 font-medium">Free Ticket</Label>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2"><Label>Capacity <span className="text-red-500">*</span></Label><Input type="number" {...register(`tiers.${index}.capacity`, { valueAsNumber: true, min: { value: 1, message: 'Capacity must be at least 1' } })} min={1} /></div>
                      </div>
                      <div className="space-y-2">
                        <Label>Sale End Date & Time (Optional)</Label>
                        <Input
                          type="datetime-local"
                          {...register(`tiers.${index}.saleEndDate`)}
                          max={startDate || undefined}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty to allow sales until the event starts. You can change this anytime.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`refund-${index}`} {...register(`tiers.${index}.refundEnabled`)} disabled={lockedExistingTier} className="rounded" />
                        <Label htmlFor={`refund-${index}`}>Allow refunds for this tier</Label>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="outline" loading={isSubmitting && !publishing} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </Button>
                  {eventStatus === 'DRAFT' && (
                    <Button 
                      type="button" 
                      className="bg-primary text-white gap-2" 
                      loading={publishing}
                      onClick={handleSubmit((d) => onSubmit(d, true))}
                    >
                      <Eye className="h-4 w-4" />
                      Save & Publish
                    </Button>
                  )}
                  {eventStatus === 'PUBLISHED' && ticketsSold === 0 && (
                    <Button 
                      type="button" 
                      variant="outline"
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10 gap-2"
                      loading={unpublishing}
                      onClick={handleUnpublish}
                    >
                      <EyeOff className="h-4 w-4" />
                      Unpublish Event
                    </Button>
                  )}
                  {eventStatus === 'PUBLISHED' && ticketsSold > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>To unpublish, contact <a href="mailto:support@hdticketdesk.com" className="font-medium underline">support</a></span>
                    </div>
                  )}
                  {eventStatus === 'DRAFT' && (
                    <Button 
                      type="button" 
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-500/10 gap-2 ml-auto"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Event
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

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
