import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format dates WITHOUT timezone conversion
// We store dates as literal times (what the organizer entered), so we display them as-is
export function formatDate(date: string | Date | null | undefined, style: 'full' | 'short' | 'time' = 'full'): string {
  // Handle null, undefined, or empty string
  if (!date) {
    return '-';
  }
  
  // Parse the date - for ISO strings ending in Z, we extract the literal time
  let d: Date;
  if (typeof date === 'string' && date.endsWith('Z')) {
    // Extract the date/time parts directly from the ISO string without timezone conversion
    // "2024-02-10T22:00:00.000Z" -> we want to show "22:00" not converted to local time
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      // Create date using UTC methods to avoid timezone shift
      d = new Date(Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      ));
      
      // Format using UTC to preserve the literal time
      if (style === 'short') {
        return d.toLocaleDateString('en-NG', {
          timeZone: 'UTC',
          month: 'short',
          day: 'numeric',
        });
      }
      
      if (style === 'time') {
        return d.toLocaleTimeString('en-NG', {
          timeZone: 'UTC',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
      
      return d.toLocaleDateString('en-NG', {
        timeZone: 'UTC',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }
  
  // Fallback for non-ISO strings or Date objects
  d = new Date(date);
  
  // Check if the date is invalid
  if (isNaN(d.getTime())) {
    return '-';
  }
  
  if (style === 'short') {
    return d.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  if (style === 'time') {
    return d.toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  
  return d.toLocaleDateString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeUntil(date: string | Date | null | undefined): string {
  // Handle null, undefined, or empty string
  if (!date) {
    return '-';
  }
  
  const target = new Date(date);
  
  // Check if the date is invalid
  if (isNaN(target.getTime())) {
    return '-';
  }
  
  // Get current time - both times are compared in their absolute UTC values
  // so timezone doesn't affect the difference calculation
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff < 0) {
    // Event has passed
    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just ended';
  }
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  
  if (weeks > 0) return `in ${weeks}w`;
  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'Starting now';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateEventStructuredData(event: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: event.isOnline
      ? {
          '@type': 'VirtualLocation',
          url: event.onlineLink || 'https://hdticketdesk.com',
        }
      : {
          '@type': 'Place',
          name: event.location,
          address: event.location,
        },
    image: event.coverImage || 'https://hdticketdesk.com/og-image.png',
    organizer: {
      '@type': 'Organization',
      name: event.organizer?.title || 'HDTicketDesk',
      url: 'https://hdticketdesk.com',
    },
    offers: event.tiers?.map((tier: any) => ({
      '@type': 'Offer',
      name: tier.name,
      price: tier.price,
      priceCurrency: 'NGN',
      availability: tier.sold >= tier.capacity
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      url: `https://hdticketdesk.com/events/${event.slug}`,
      validFrom: new Date().toISOString(),
    })),
  };
}
