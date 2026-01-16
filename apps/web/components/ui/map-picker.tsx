'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, X, Locate } from 'lucide-react';

interface MapPickerProps {
  value?: { lat: number; lng: number; address?: string };
  onChange: (location: { lat: number; lng: number; address: string } | null) => void;
  disabled?: boolean;
}

// Default to Lagos, Nigeria
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };

export function MapPicker({ value, onChange, disabled }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(value?.address || '');

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    const center = value ? [value.lat, value.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
    
    const map = L.map(mapRef.current).setView(center, value ? 15 : 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add marker if value exists
    if (value) {
      markerRef.current = L.marker([value.lat, value.lng], { draggable: !disabled }).addTo(map);
      if (!disabled) {
        markerRef.current.on('dragend', handleMarkerDrag);
      }
    }

    // Click to place marker
    if (!disabled) {
      map.on('click', handleMapClick);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Update marker when value changes externally
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    
    const L = (window as any).L;
    
    if (value) {
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else {
        markerRef.current = L.marker([value.lat, value.lng], { draggable: !disabled }).addTo(mapInstanceRef.current);
        if (!disabled) {
          markerRef.current.on('dragend', handleMarkerDrag);
        }
      }
      mapInstanceRef.current.setView([value.lat, value.lng], 15);
      setSelectedAddress(value.address || '');
    } else if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
      setSelectedAddress('');
    }
  }, [value, mapLoaded]);

  const handleMapClick = async (e: any) => {
    if (disabled) return;
    
    const { lat, lng } = e.latlng;
    const L = (window as any).L;
    
    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on('dragend', handleMarkerDrag);
    }
    
    // Reverse geocode to get address
    const address = await reverseGeocode(lat, lng);
    setSelectedAddress(address);
    onChange({ lat, lng, address });
  };

  const handleMarkerDrag = async (e: any) => {
    const { lat, lng } = e.target.getLatLng();
    const address = await reverseGeocode(lat, lng);
    setSelectedAddress(address);
    onChange({ lat, lng, address });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);
        
        const L = (window as any).L;
        
        // Update or create marker
        if (markerRef.current) {
          markerRef.current.setLatLng([latNum, lngNum]);
        } else {
          markerRef.current = L.marker([latNum, lngNum], { draggable: !disabled }).addTo(mapInstanceRef.current);
          if (!disabled) {
            markerRef.current.on('dragend', handleMarkerDrag);
          }
        }
        
        mapInstanceRef.current.setView([latNum, lngNum], 15);
        setSelectedAddress(display_name);
        onChange({ lat: latNum, lng: lngNum, address: display_name });
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const L = (window as any).L;
        
        // Update or create marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: !disabled }).addTo(mapInstanceRef.current);
          if (!disabled) {
            markerRef.current.on('dragend', handleMarkerDrag);
          }
        }
        
        mapInstanceRef.current.setView([lat, lng], 15);
        const address = await reverseGeocode(lat, lng);
        setSelectedAddress(address);
        onChange({ lat, lng, address });
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  };

  const clearLocation = () => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    setSelectedAddress('');
    onChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
            className="pl-10"
            disabled={disabled}
          />
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={searchLocation} 
          disabled={disabled || searching}
        >
          {searching ? 'Searching...' : 'Search'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          onClick={getCurrentLocation}
          disabled={disabled}
          title="Use my location"
        >
          <Locate className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border">
        <div 
          ref={mapRef} 
          className="w-full h-[300px] bg-muted"
          style={{ zIndex: 0 }}
        />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedAddress && (
        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Selected Location</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{selectedAddress}</p>
          </div>
          {!disabled && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 flex-shrink-0"
              onClick={clearLocation}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {!selectedAddress && !disabled && (
        <p className="text-xs text-muted-foreground">
          Click on the map to select a location, or search for an address above.
        </p>
      )}
    </div>
  );
}
