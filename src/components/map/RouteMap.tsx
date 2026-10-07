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
  center = [9.9312, 76.2673],
  zoom = 10,
  height = '420px',
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const isInitializingRef = useRef<boolean>(false);

  const hasRoute = legs.length > 0 && (originCoords || destCoords);

  // Helper to draw/update layers without destroying the map
  const updateLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const L = leafletRef.current;

    if (!map || !layerGroup || !L || !isMountedRef.current) return;

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // ── Icon generators ──────────────────────────────────────────────────
    const createPinIcon = (
      label: string,
      bg: string,
      border: string,
      size = 36
    ) =>
      L.divIcon({
        className: '',
        html: `
          <div style="
            position:relative;
            width:${size}px; height:${size + 10}px;
            display:flex; flex-direction:column; align-items:center;
          ">
            <div style="
              background:${bg};
              color:white;
              border-radius:50%;
              width:${size}px; height:${size}px;
              display:flex; align-items:center; justify-content:center;
              font-size:${size * 0.45}px;
              box-shadow: 0 3px 10px rgba(0,0,0,0.4), 0 0 0 3px ${border};
              border: 2.5px solid white;
              font-weight:bold;
            ">${label}</div>
            <div style="
              width:0; height:0;
              border-left:7px solid transparent;
              border-right:7px solid transparent;
              border-top:10px solid ${bg};
              margin-top:-1px;
            "></div>
          </div>`,
        iconSize: [size, size + 10],
        iconAnchor: [size / 2, size + 10],
        popupAnchor: [0, -(size + 10)],
      });

    const createEmojiIcon = (emoji: string, bg = '#3F7F83') =>
      L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">${emoji}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

    // ── 1. Jetties (show only when no route is active) ───────────────────
    if (!hasRoute) {
      for (const j of jetties) {
        if (j.lat && j.lng) {
          const marker = L.marker([j.lat, j.lng], {
            icon: createEmojiIcon('⚓', '#1f5f63'),
          }).bindPopup(`<strong>${j.name}</strong><br/><span style="color:#666">Kerala Jetty</span>`);
          layerGroup.addLayer(marker);
        }
      }
    }

    // ── 2. Route legs — draw road legs first, water leg on top ───────────
    if (legs && legs.length > 0) {
      // Sort legs so road legs are drawn first and water leg sits prominently on top
      const sortedLegs = [...legs].sort((a, b) => {
        if (a.leg_type === 'water') return 1;
        if (b.leg_type === 'water') return -1;
        return 0;
      });

      for (const leg of sortedLegs) {
        if (!leg.geometry?.coordinates) continue;

        const latLngs: [number, number][] = leg.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );
        latLngs.forEach((pt) => boundsPoints.push(pt));

        // Leg style
        let color = '#3F7F83';
        let dashArray: string | undefined;
        let weight = 6;
        let glowColor = 'rgba(63,127,131,0.25)';
        let label = '';

        if (leg.leg_type === 'water') {
          color = '#0284c7'; // Vivid oceanic water blue
          weight = 8;
          glowColor = 'rgba(2,132,199,0.4)';
          label = `🚢 Waterway Barge: ${leg.from_name} → ${leg.to_name}`;
        } else if (leg.leg_type === 'road_origin') {
          color = '#3b82f6';
          dashArray = '8, 6';
          weight = 5;
          glowColor = 'rgba(59,130,246,0.25)';
          label = `🚛 First-Mile Road Pickup: ${leg.from_name} → ${leg.to_name}`;
        } else if (leg.leg_type === 'road_destination') {
          color = '#f97316';
          dashArray = '8, 6';
          weight = 5;
          glowColor = 'rgba(249,115,22,0.25)';
          label = `🚛 Last-Mile Road Delivery: ${leg.from_name} → ${leg.to_name}`;
        }

        // Glow shadow layer (drawn first, wider, semi-transparent)
        L.polyline(latLngs, {
          color: glowColor,
          weight: weight + 8,
          opacity: 1,
          dashArray: undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);

        // Main route line
        const polyline = L.polyline(latLngs, {
          color,
          weight,
          opacity: 0.95,
          dashArray,
          lineCap: 'round',
          lineJoin: 'round',
        }).bindPopup(
          `<div style="min-width:180px">
            <strong>${label}</strong><br/>
            <span style="color:#555">Distance: <strong>${leg.distance_km} km</strong></span><br/>
            <span style="color:#555">Duration: ~${leg.duration_min} min</span>
          </div>`
        );
        layerGroup.addLayer(polyline);

        // For water leg, add prominent midpoint badge
        if (leg.leg_type === 'water' && latLngs.length > 1) {
          const midIdx = Math.floor(latLngs.length / 2);
          const midPt = latLngs[midIdx];

          const badgeIcon = L.divIcon({
            className: '',
            html: `<div style="
              background: #0284c7;
              color: white;
              padding: 3px 8px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              border: 1.5px solid white;
              display: flex;
              align-items: center;
              gap: 4px;
            ">🚢 Waterway (${leg.distance_km} km)</div>`,
            iconSize: [140, 24],
            iconAnchor: [70, 12],
          });
          L.marker(midPt, { icon: badgeIcon, interactive: false }).addTo(layerGroup);

          // Add jetty anchor pins at boarding and landing points
          if (latLngs.length > 0) {
            const boardingPt = latLngs[0];
            const landingPt = latLngs[latLngs.length - 1];

            const boardingIcon = createEmojiIcon('⚓', '#0369a1');
            L.marker(boardingPt, { icon: boardingIcon })
              .bindPopup(`<strong>⚓ Boarding Jetty:</strong> ${leg.from_name}`)
              .addTo(layerGroup);

            const landingIcon = createEmojiIcon('⚓', '#0369a1');
            L.marker(landingPt, { icon: landingIcon })
              .bindPopup(`<strong>⚓ Landing Jetty:</strong> ${leg.to_name}`)
              .addTo(layerGroup);
          }
        } else if (latLngs.length > 1) {
          // Direction arrow on road legs
          const midIdx = Math.floor(latLngs.length / 2);
          const midPt = latLngs[midIdx];
          const prevPt = latLngs[Math.max(0, midIdx - 1)];
          const angle = Math.atan2(
            midPt[1] - prevPt[1],
            midPt[0] - prevPt[0]
          ) * (180 / Math.PI);

          const arrowIcon = L.divIcon({
            className: '',
            html: `<div style="
              color:${color};
              font-size:16px;
              font-weight:bold;
              transform:rotate(${angle}deg);
              text-shadow:0 0 3px white, 0 0 3px white;
              line-height:1;
            ">›</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          L.marker(midPt, { icon: arrowIcon, interactive: false }).addTo(layerGroup);
        }
      }
    }

    // ── 3. Origin marker (pulsing green pin) ─────────────────────────────
    if (originCoords && originCoords[0] && originCoords[1]) {
      boundsPoints.push(originCoords);

      // Pulsing ring behind the pin
      const pulseIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:50px; height:50px; border-radius:50%;
          background:rgba(39,174,96,0.15);
          border:2px solid rgba(39,174,96,0.4);
          animation:pulse 1.8s infinite;
          position:absolute; top:-10px; left:-10px;
        "></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      layerGroup.addLayer(L.marker(originCoords, { icon: pulseIcon, interactive: false }));

      const originMarker = L.marker(originCoords, {
        icon: createPinIcon('A', '#16a34a', '#dcfce7'),
      }).bindPopup(`
        <div style="min-width:140px">
          <strong style="color:#16a34a">📍 Starting Point</strong>
        </div>`);
      layerGroup.addLayer(originMarker);
      originMarker.openPopup();
    }

    // ── 4. Destination marker (red pin) ──────────────────────────────────
    if (destCoords && destCoords[0] && destCoords[1]) {
      boundsPoints.push(destCoords);
      const destMarker = L.marker(destCoords, {
        icon: createPinIcon('B', '#dc2626', '#fee2e2'),
      }).bindPopup(`
        <div style="min-width:140px">
          <strong style="color:#dc2626">🏁 Destination</strong>
        </div>`);
      layerGroup.addLayer(destMarker);
    }

    // ── 5. Provider live location ─────────────────────────────────────────
    if (providerLocation?.lat && providerLocation?.lng) {
      boundsPoints.push([providerLocation.lat, providerLocation.lng]);
      const provMarker = L.marker([providerLocation.lat, providerLocation.lng], {
        icon: createEmojiIcon('🚢', '#E67E22'),
      }).bindPopup('<strong>Current Provider GPS Location</strong>');
      layerGroup.addLayer(provMarker);
    }

    // ── 6. Jetties alongside an active route ─────────────────────────────
    if (hasRoute) {
      for (const j of jetties) {
        if (j.lat && j.lng) {
          layerGroup.addLayer(
            L.marker([j.lat, j.lng], {
              icon: createEmojiIcon('⚓', '#1f5f63'),
            }).bindPopup(`<strong>${j.name}</strong><br/><span style="color:#666">Kerala Jetty</span>`)
          );
        }
      }
    }

    // ── 7. Fit map to show the full route ─────────────────────────────────
    try {
      if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [48, 48], animate: false });
      } else if (providerLocation?.lat && providerLocation?.lng) {
        map.setView([providerLocation.lat, providerLocation.lng], map.getZoom(), { animate: false });
      }
    } catch {
      // Safe no-op if container hidden during fitBounds
    }
  }, [legs, originCoords, destCoords, jetties, providerLocation, hasRoute]);

  // 1. Initialize Map once on mount
  useEffect(() => {
    isMountedRef.current = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current || isInitializingRef.current) return;

      const container = mapContainerRef.current;
      if ((container as any)._leaflet_id) return;

      isInitializingRef.current = true;

      try {
        const L = await import('leaflet');
        if (!isMountedRef.current || !mapContainerRef.current) return;
        if (mapInstanceRef.current || (container as any)._leaflet_id) return;

        leafletRef.current = L;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if ((container as any)._leaflet_id) return;

        const map = L.map(container, {
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView(center, zoom);

        // Free OpenStreetMap tiles — no API key needed
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;

        // Inject pulse CSS once
        if (!document.getElementById('jalasetu-map-styles')) {
          const style = document.createElement('style');
          style.id = 'jalasetu-map-styles';
          style.textContent = `
            @keyframes pulse {
              0%   { transform: scale(1);   opacity: 0.8; }
              70%  { transform: scale(2.2); opacity: 0; }
              100% { transform: scale(1);   opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }

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
          layerGroupRef.current?.clearLayers();
          mapInstanceRef.current.remove();
        } catch {
          // Suppress Leaflet DOM teardown quirks
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Update layers when data changes
  useEffect(() => {
    updateLayers();
  }, [updateLayers]);

  // 3. Handle container resize / tab visibility changes
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current && isMountedRef.current) {
        try { mapInstanceRef.current.invalidateSize(); } catch { /* safe */ }
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden shadow-sm border border-default z-0"
    />
  );
}
