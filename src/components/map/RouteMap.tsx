'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { PlannedLeg } from '@/lib/routing/planner';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  legs?: PlannedLeg[];
  originCoords?: [number, number]; // [lat, lng]
  destCoords?: [number, number];
  jetties?: { id: string; name: string; lat: number; lng: number }[];
  providerLocation?: { lat: number; lng: number; heading?: number };
  zoom?: number;
  center?: [number, number];
  height?: string;
}

export default function RouteMap({
  legs = [],
  originCoords,
  destCoords,
  jetties = [],
  providerLocation,
  center = [9.9312, 76.2673], // Kochi default
  zoom = 10,
  height = '420px',
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const isInitializingRef = useRef<boolean>(false);

  // Helper to draw/update layers without destroying the map
  const updateLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const L = leafletRef.current;

    if (!map || !layerGroup || !L || !isMountedRef.current) return;

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // Custom icon generator
    const createEmojiIcon = (emoji: string, bg: string = '#3F7F83') =>
      L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: ${bg}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

    // 1. Draw jetties
    for (const j of jetties) {
      if (j.lat && j.lng) {
        const marker = L.marker([j.lat, j.lng], {
          icon: createEmojiIcon('⚓', '#1f5f63'),
        }).bindPopup(`<strong>${j.name}</strong><br/><span style="color:#666">Kerala Jetty</span>`);
        layerGroup.addLayer(marker);
      }
    }

    // 2. Draw origin marker
    if (originCoords && originCoords[0] && originCoords[1]) {
      boundsPoints.push(originCoords);
      const originMarker = L.marker(originCoords, {
        icon: createEmojiIcon('📍', '#27AE60'),
      }).bindPopup('<strong>Origin / Pickup Point</strong>');
      layerGroup.addLayer(originMarker);
    }

    // 3. Draw destination marker
    if (destCoords && destCoords[0] && destCoords[1]) {
      boundsPoints.push(destCoords);
      const destMarker = L.marker(destCoords, {
        icon: createEmojiIcon('🏁', '#C0392B'),
      }).bindPopup('<strong>Destination Point</strong>');
      layerGroup.addLayer(destMarker);
    }

    // 4. Draw Provider Live Location
    if (providerLocation && providerLocation.lat && providerLocation.lng) {
      boundsPoints.push([providerLocation.lat, providerLocation.lng]);
      const provMarker = L.marker([providerLocation.lat, providerLocation.lng], {
        icon: createEmojiIcon('🚢', '#E67E22'),
      }).bindPopup('<strong>Current Provider GPS Location</strong>');
      layerGroup.addLayer(provMarker);
    }

    // 5. Draw Legs
    if (legs && legs.length > 0) {
      for (const leg of legs) {
        if (!leg.geometry?.coordinates) continue;

        // GeoJSON is [lng, lat] -> convert to Leaflet [lat, lng]
        const latLngs: [number, number][] = leg.geometry.coordinates.map((coord: [number, number]) => [
          coord[1],
          coord[0],
        ]);

        latLngs.forEach((pt) => boundsPoints.push(pt));

        let color = '#3F7F83';
        let dashArray: string | undefined = undefined;
        let weight = 5;

        if (leg.leg_type === 'water') {
          color = '#3F7F83'; // Teal solid line
          weight = 6;
        } else if (leg.leg_type === 'road_origin') {
          color = '#2980B9'; // Blue dashed
          dashArray = '6, 8';
          weight = 4;
        } else if (leg.leg_type === 'road_destination') {
          color = '#E67E22'; // Orange dashed
          dashArray = '6, 8';
          weight = 4;
        }

        const polyline = L.polyline(latLngs, {
          color,
          weight,
          opacity: 0.85,
          dashArray,
        }).bindPopup(
          `<strong>${leg.from_name} → ${leg.to_name}</strong><br/>Type: ${leg.leg_type.replace('_', ' ')}<br/>Dist: ${leg.distance_km} km | Time: ~${leg.duration_min} min`
        );

        layerGroup.addLayer(polyline);
      }
    }

    // Fit bounds if multiple points exist, without animation to prevent detached DOM crashes
    try {
      if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], animate: false });
      } else if (providerLocation && providerLocation.lat && providerLocation.lng) {
        map.setView([providerLocation.lat, providerLocation.lng], map.getZoom(), { animate: false });
      }
    } catch {
      // Safe no-op if container is hidden during fitBounds
    }
  }, [legs, originCoords, destCoords, jetties, providerLocation]);

  // 1. Initialize Map once on mount
  useEffect(() => {
    isMountedRef.current = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current || isInitializingRef.current) return;

      const container = mapContainerRef.current;
      if ((container as any)._leaflet_id) {
        // Container already has a Leaflet instance attached
        return;
      }

      isInitializingRef.current = true;

      try {
        const L = await import('leaflet');
        if (!isMountedRef.current || !mapContainerRef.current) return;
        if (mapInstanceRef.current || (container as any)._leaflet_id) return;

        leafletRef.current = L;

        // Fix Leaflet's default icon path issues in webpack/Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Double check container before creating map
        if ((container as any)._leaflet_id) return;

        // Disable zoom and fade animations to prevent _leaflet_pos error on unmount/re-render
        const map = L.map(container, {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView(center, zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;

        updateLayers();
      } catch (err: any) {
        if (err?.message?.includes('already initialized')) {
          console.warn('Map container already initialized (harmless dev re-render)');
        } else {
          console.error('Leaflet initialization error:', err);
        }
      } finally {
        isInitializingRef.current = false;
      }
    }

    initMap();

    return () => {
      isMountedRef.current = false;
      isInitializingRef.current = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          if (layerGroupRef.current) {
            layerGroupRef.current.clearLayers();
          }
          mapInstanceRef.current.remove();
        } catch {
          // Suppress any Leaflet DOM teardown quirks during unmount
        }
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
        leafletRef.current = null;
      }
      if (mapContainerRef.current) {
        delete (mapContainerRef.current as any)._leaflet_id;
        mapContainerRef.current.innerHTML = '';
      }
    };
  }, []); // Run once on mount

  // 2. Update layers when coordinates or legs change
  useEffect(() => {
    updateLayers();
  }, [updateLayers]);

  // 3. Handle resize & visibility changes (e.g. when toggling tabs)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current && isMountedRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // Safe no-op
        }
      }
    });

    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden shadow-sm border border-default z-0"
    />
  );
}
