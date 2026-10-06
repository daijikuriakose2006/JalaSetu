'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = await import('leaflet');

      // Fix Leaflet's default icon path issues in webpack/Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current && isMounted) {
        const map = L.map(mapContainerRef.current).setView(center, zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
      }

      if (!layerGroupRef.current || !mapInstanceRef.current || !isMounted) return;
      const layerGroup = layerGroupRef.current;
      const map = mapInstanceRef.current;
      layerGroup.clearLayers();

      const boundsPoints: [number, number][] = [];

      // Custom icon generators
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
          }).bindPopup(`<strong>${leg.from_name} → ${leg.to_name}</strong><br/>Type: ${leg.leg_type.replace('_', ' ')}<br/>Dist: ${leg.distance_km} km | Time: ~${leg.duration_min} min`);

          layerGroup.addLayer(polyline);
        }
      }

      // Fit bounds if we have points
      if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [legs, originCoords, destCoords, jetties, providerLocation]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden shadow-sm border border-default z-0"
    />
  );
}
