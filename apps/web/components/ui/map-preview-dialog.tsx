'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Navigation, Copy, Check } from 'lucide-react';

interface MapPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  eventTitle?: string;
}

export function MapPreviewDialog({ 
  open, 
  onOpenChange, 
  location, 
  latitude, 
  longitude,
  eventTitle 
}: MapPreviewDialogProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !open) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setMapLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, [open]);

  // Initialize map when dialog opens
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !open || !latitude || !longitude) return;

    // Small delay to ensure dialog is fully rendered
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = (window as any).L;
      const map = L.map(mapRef.current).setView([latitude, longitude], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add marker
      const marker = L.marker([latitude, longitude]).addTo(map);
      marker.bindPopup(`<b>${eventTitle || 'Event Location'}</b><br>${location}`).openPopup();

      mapInstanceRef.current = map;

      // Fix map sizing issues
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapLoaded, open, latitude, longitude, location, eventTitle]);

  const openInGoogleMaps = () => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      window.open(url, '_blank');
    } else if (location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
      window.open(url, '_blank');
    }
  };

  const getDirections = () => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      window.open(url, '_blank');
    } else if (location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
      window.open(url, '_blank');
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(location);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Generate Google Maps link for sharing
  const getGoogleMapsLink = () => {
    if (latitude && longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Event Location
          </DialogTitle>
          <DialogDescription>
            {eventTitle && <span className="font-medium text-foreground">{eventTitle}</span>}
          </DialogDescription>
        </DialogHeader>

        {/* Map Container */}
        <div className="relative rounded-lg overflow-hidden border">
          {latitude && longitude ? (
            <div 
              ref={mapRef} 
              className="w-full h-[250px] bg-muted"
              style={{ zIndex: 0 }}
            />
          ) : (
            <div className="w-full h-[200px] bg-muted flex items-center justify-center">
              <div className="text-center p-4">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Map coordinates not available</p>
              </div>
            </div>
          )}
          {!mapLoaded && latitude && longitude && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{location}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 flex-shrink-0"
            onClick={copyAddress}
            title="Copy address"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={getDirections}
          >
            <Navigation className="h-4 w-4" />
            Get Directions
          </Button>
          <Button 
            className="flex-1 gap-2"
            onClick={openInGoogleMaps}
          >
            <ExternalLink className="h-4 w-4" />
            Open in Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to generate Google Maps URL (for use in emails, etc.)
export function getGoogleMapsUrl(latitude?: number | null, longitude?: number | null, address?: string): string {
  if (latitude && longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return '';
}

// Helper function to generate directions URL
export function getGoogleMapsDirectionsUrl(latitude?: number | null, longitude?: number | null, address?: string): string {
  if (latitude && longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return '';
}
