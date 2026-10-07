'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatInterface from '@/components/booking/ChatInterface';
import ComparisonCard from '@/components/booking/ComparisonCard';
import type { ChatMessage, VehicleType } from '@/lib/types/database';
import type { RoutePlanResponse } from '@/lib/routing/planner';
import { recommendVehicleType } from '@/lib/routing/costs';

// Dynamically import Leaflet map without SSR
const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] bg-main rounded-xl border border-default flex items-center justify-center text-xs text-secondary">
      <div className="flex items-center gap-2">
        <span className="spinner" style={{ width: 18, height: 18 }} />
        <span>Loading Kerala Waterway Map...</span>
      </div>
    </div>
  ),
});

export interface BookingDetailsState {
  cargo_name: string;
  cargo_description?: string;
  weight_tonnes: number;
  needs_loading_unloading: boolean;
  pickup_time_preset: 'now' | 'today' | 'custom';
  custom_datetime?: string;
  origin_address: string;
  destination_address: string;
  selected_vehicle: VehicleType;
  selected_ship_type: string;
}

export default function UserDashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [jetties, setJetties] = useState<any[]>([]);

  /**
   * Only fields EXPLICITLY confirmed through conversation.
   * Starts fully empty — no default values — so that greetings / short
   * messages can never accidentally trigger route planning.
   */
  const [gatheredFields, setGatheredFields] = useState<{
    cargo_name?: string;
    cargo_description?: string;
    weight_tonnes?: number;
    origin_address?: string;
    destination_address?: string;
    needs_loading_unloading?: boolean;
    pickup_time_preset?: 'now' | 'today' | 'custom';
  }>({});

  // Full BookingDetailsState built from gatheredFields + smart defaults (only used at order-confirm time)
  const buildBookingDetails = (): BookingDetailsState => {
    const w = gatheredFields.weight_tonnes || 8;
    return {
      cargo_name: gatheredFields.cargo_name || 'Building Material',
      cargo_description: gatheredFields.cargo_description,
      weight_tonnes: w,
      origin_address: gatheredFields.origin_address || 'Kochi, Kerala',
      destination_address: gatheredFields.destination_address || 'Alappuzha, Kerala',
      needs_loading_unloading: gatheredFields.needs_loading_unloading ?? false,
      pickup_time_preset: gatheredFields.pickup_time_preset || 'now',
      selected_vehicle: recommendVehicleType(w),
      selected_ship_type: w <= 5 ? 'country_craft' : w <= 15 ? 'bulk_cargo_barge' : 'deck_barge',
    };
  };

  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  const [comparisonExplanation, setComparisonExplanation] = useState<string>('');
  const [orderConfirming, setOrderConfirming] = useState(false);

  // Load active Kerala jetties for map
  useEffect(() => {
    async function fetchJetties() {
      try {
        const res = await fetch('/api/jetties');
        if (res.ok) {
          const data = await res.json();
          setJetties(data.jetties || []);
        }
      } catch (err) {
        console.warn('Failed to load jetties:', err);
      }
    }
    fetchJetties();
  }, []);

  const handlePlanRoute = async (details: BookingDetailsState) => {
    try {
      const res = await fetch('/api/route-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: details.origin_address,
          destination: details.destination_address,
          weight_tonnes: details.weight_tonnes,
          needs_loading_unloading: details.needs_loading_unloading,
          cargo_name: details.cargo_name,
        }),
      });

      if (!res.ok) throw new Error('Failed to plan route');
      const data = await res.json();
      setRoutePlan(data.plan);

      // Fetch comparison explanation
      fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: details.origin_address,
          destination: details.destination_address,
          weightTonnes: details.weight_tonnes,
          roadCost: data.plan.road_direct.cost,
          waterCost: data.plan.water_totals.cost,
          roadDurationMin: data.plan.road_direct.duration_min,
          waterDurationMin: data.plan.water_totals.duration_min,
          roadCo2Kg: data.plan.road_direct.co2_kg,
          waterCo2Kg: data.plan.water_totals.co2_kg,
          costSavedPercent: data.plan.savings.cost_saved_percent,
          co2SavedPercent: data.plan.savings.co2_saved_percent,
        }),
      })
        .then((r) => r.ok && r.json())
        .then((compData) => {
          if (compData?.explanation) {
            setComparisonExplanation(compData.explanation);
          }
        })
        .catch(() => {});
    } catch (err) {
      console.warn('Error planning route:', err);
    }
  };

  const handleSendMessage = async (userText: string) => {
    const lower = userText.toLowerCase().trim();

    // If plan is ready and user types a confirm phrase, dispatch immediately
    if (
      routePlan &&
      (lower === 'confirm' ||
        lower === 'confirm order' ||
        lower === 'book' ||
        lower === 'book it' ||
        lower === 'dispatch' ||
        lower === 'dispatch order' ||
        lower === 'yes confirm' ||
        lower.includes('🚀'))
    ) {
      handleConfirmOrder('water');
      return;
    }

    const newMsg: ChatMessage = {
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          // Send only the text history (no timestamps / chips) to keep context clean
          chat_history: updatedHistory.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();

      // ONLY merge fields that were actually extracted this turn (non-empty)
      const ext = data.extracted_data || {};
      const newFields: typeof gatheredFields = { ...gatheredFields };

      if (ext.cargo_name) newFields.cargo_name = ext.cargo_name;
      if (ext.cargo_description) newFields.cargo_description = ext.cargo_description;
      if (ext.weight_tonnes) newFields.weight_tonnes = Number(ext.weight_tonnes);
      if (ext.origin) newFields.origin_address = ext.origin;
      if (ext.destination) newFields.destination_address = ext.destination;
      if (ext.needs_loading_unloading !== undefined && ext.needs_loading_unloading !== null) {
        newFields.needs_loading_unloading = Boolean(ext.needs_loading_unloading);
      }
      if (ext.pickup_time) {
        newFields.pickup_time_preset =
          ext.pickup_time === 'Today' ? 'today' : ext.pickup_time === 'Now' ? 'now' : 'custom';
      }

      setGatheredFields(newFields);

      // Only auto-plan if the server explicitly says all 4 essentials are confirmed
      const isComplete = Boolean(data.is_complete);
      if (isComplete) {
        const details = {
          cargo_name: newFields.cargo_name || 'Building Material',
          cargo_description: newFields.cargo_description,
          weight_tonnes: newFields.weight_tonnes || 8,
          origin_address: newFields.origin_address || 'Kochi',
          destination_address: newFields.destination_address || 'Alappuzha',
          needs_loading_unloading: newFields.needs_loading_unloading ?? false,
          pickup_time_preset: newFields.pickup_time_preset || 'now',
          selected_vehicle: recommendVehicleType(newFields.weight_tonnes || 8),
          selected_ship_type:
            (newFields.weight_tonnes || 8) <= 5
              ? 'country_craft'
              : (newFields.weight_tonnes || 8) <= 15
              ? 'bulk_cargo_barge'
              : 'deck_barge',
        } as BookingDetailsState;
        await handlePlanRoute(details);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Tell me more about your shipment.',
        timestamp: new Date().toISOString(),
        suggested_chips: data.suggested_chips || [],
        is_booking_summary: isComplete,
      };
      setMessages([...updatedHistory, assistantMsg]);
    } catch {
      // Graceful fallback — no dummy plan, just a helpful prompt
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content:
          'Namaskaram! I\'m JalaSetu\'s booking assistant. Tell me what cargo you need to move, the approximate weight in tonnes, and the pickup and delivery locations in Kerala.',
        timestamp: new Date().toISOString(),
        suggested_chips: [
          'Move 8 tonnes building material from Kochi to Alappuzha',
          'Transport 5t cement bags from Fort Kochi to Vaikom',
          'Send 12 tonnes river sand from Ernakulam to Muhamma',
        ],
      };
      setMessages([...updatedHistory, assistantMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setGatheredFields({});
    setRoutePlan(null);
    setComparisonExplanation('');
  };

  const handleConfirmOrder = async (mode: 'water' | 'road') => {
    if (!routePlan) return;
    setOrderConfirming(true);
    const bd = buildBookingDetails();

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargo_name: bd.cargo_name,
          cargo_description: bd.cargo_description,
          weight_tonnes: bd.weight_tonnes,
          needs_loading_unloading: bd.needs_loading_unloading,
          pickup_time:
            bd.pickup_time_preset === 'custom' && bd.custom_datetime
              ? new Date(bd.custom_datetime).toISOString()
              : new Date().toISOString(),
          is_immediate: bd.pickup_time_preset === 'now',
          origin_address: bd.origin_address,
          origin_coords: routePlan.legs[0]?.from_coords || [9.9312, 76.2673],
          origin_jetty_id: routePlan.origin_jetty.id,
          destination_address: bd.destination_address,
          dest_coords: routePlan.legs[routePlan.legs.length - 1]?.to_coords || [9.4981, 76.3388],
          destination_jetty_id: routePlan.dest_jetty.id,
          road_comparison: routePlan.road_direct,
          water_totals: routePlan.water_totals,
          comparison_explanation: comparisonExplanation,
          recommended_origin_vehicle: routePlan.recommended_origin_vehicle,
          recommended_dest_vehicle: routePlan.recommended_dest_vehicle,
          recommended_boat_type: routePlan.recommended_boat_type,
          legs: routePlan.legs,
          chat_history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Order creation failed');
      const data = await res.json();
      router.push(`/dashboard/user/orders/${data.order.id}`);
    } catch (err: any) {
      alert(err.message || 'Error confirming order');
      setOrderConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="card p-5 bg-surface border border-default flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💬</span>
            <h2 className="text-lg font-bold text-primary">Inland Waterway AI Booking</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-light text-accent">
              Conversational Engine
            </span>
          </div>
          <p className="text-xs text-secondary">
            Chat naturally with JalaSetu AI to plan freight journeys, compare road vs backwater costs, and dispatch vessels
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/dashboard/user/orders')}
            className="btn btn-secondary text-xs"
          >
            My Orders 📋
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left side: Pure Conversational Chat Interface (No extra boxes below) */}
        <div className="lg:col-span-6 space-y-4">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onResetChat={handleResetChat}
            loading={chatLoading}
            routePlan={routePlan}
            bookingDetails={buildBookingDetails()}
            onConfirmOrder={handleConfirmOrder}
            orderConfirming={orderConfirming}
          />
        </div>

        {/* Right side: Live Leaflet Map & Comparison */}
        <div className="lg:col-span-6 space-y-4">
          <div className="card p-4 bg-surface border border-default space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary">Kerala Waterway & Road Routing</h3>
              <span className="text-[11px] text-secondary">
                {routePlan ? `${routePlan.legs.length} Multi-Modal Legs` : `${jetties.length || 15} Active Jetties`}
              </span>
            </div>

            <RouteMap
              legs={routePlan?.legs || []}
              originCoords={routePlan?.legs[0]?.from_coords}
              destCoords={routePlan?.legs[routePlan.legs.length - 1]?.to_coords}
              jetties={jetties}
              height="380px"
            />

            {/* Map Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 bg-[#0284c7] rounded-sm shadow-sm"></span>
                <span className="font-semibold text-primary">🚢 Waterway Barge Leg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#3b82f6]"></span>
                <span>First-Mile Taxi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f97316]"></span>
                <span>Last-Mile Taxi</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⚓</span>
                <span>Boarding / Landing Jetty</span>
              </div>
            </div>
          </div>

          {/* Road vs Waterway Comparison Card */}
          {routePlan && (
            <ComparisonCard
              plan={routePlan}
              explanation={comparisonExplanation}
              onConfirmOrder={handleConfirmOrder}
              loading={orderConfirming}
            />
          )}
        </div>
      </div>
    </div>
  );
}
