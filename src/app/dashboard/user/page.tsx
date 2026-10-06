'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatInterface from '@/components/booking/ChatInterface';
import ConfirmationCard, { type BookingDetails } from '@/components/booking/ConfirmationCard';
import ComparisonCard from '@/components/booking/ComparisonCard';
import type { ChatMessage } from '@/lib/types/database';
import type { RoutePlanResponse } from '@/lib/routing/planner';

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

export default function UserDashboard() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [jetties, setJetties] = useState<any[]>([]);

  // Booking states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<Partial<BookingDetails>>({
    cargo_name: 'Building Material',
    weight_tonnes: 8,
    origin_address: 'Kochi, Kerala',
    destination_address: 'Alappuzha, Kerala',
    needs_loading_unloading: true,
  });

  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  const [comparisonExplanation, setComparisonExplanation] = useState<string>('');
  const [planLoading, setPlanLoading] = useState(false);
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

  const handleSendMessage = async (userText: string) => {
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
          chat_history: updatedHistory.slice(-6),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'I am ready to plan your route.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedHistory, assistantMsg]);

      // If details extracted, update confirmation card data
      if (data.extracted_data) {
        setBookingDetails((prev) => ({
          ...prev,
          cargo_name: data.extracted_data.cargo_name || prev.cargo_name,
          cargo_description: data.extracted_data.cargo_description || prev.cargo_description,
          weight_tonnes: data.extracted_data.weight_tonnes || prev.weight_tonnes,
          origin_address: data.extracted_data.origin || prev.origin_address,
          destination_address: data.extracted_data.destination || prev.destination_address,
          needs_loading_unloading:
            data.extracted_data.needs_loading_unloading !== undefined
              ? data.extracted_data.needs_loading_unloading
              : prev.needs_loading_unloading,
        }));
      }

      if (data.is_complete) {
        setShowConfirmation(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Could not connect to the booking engine. You can also fill the confirmation card directly below.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setShowConfirmation(true);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePlanRoute = async (details: BookingDetails) => {
    setBookingDetails(details);
    setPlanLoading(true);

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

      // Fetch comparison explanation from Gemini
      const compRes = await fetch('/api/comparison', {
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
      });

      if (compRes.ok) {
        const compData = await compRes.json();
        setComparisonExplanation(compData.explanation);
      }
    } catch (err: any) {
      alert(err.message || 'Error planning route');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleConfirmOrder = async (mode: 'water' | 'road') => {
    if (!routePlan) return;
    setOrderConfirming(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargo_name: bookingDetails.cargo_name || 'Building Material',
          cargo_description: bookingDetails.cargo_description,
          weight_tonnes: bookingDetails.weight_tonnes || 8,
          needs_loading_unloading: bookingDetails.needs_loading_unloading,
          pickup_time:
            bookingDetails.pickup_time_preset === 'custom' && bookingDetails.custom_datetime
              ? new Date(bookingDetails.custom_datetime).toISOString()
              : new Date().toISOString(),
          is_immediate: bookingDetails.pickup_time_preset === 'now',
          origin_address: bookingDetails.origin_address || 'Kochi',
          origin_coords: routePlan.legs[0]?.from_coords || [9.9312, 76.2673],
          origin_jetty_id: routePlan.origin_jetty.id,
          destination_address: bookingDetails.destination_address || 'Alappuzha',
          dest_coords: routePlan.legs[routePlan.legs.length - 1]?.to_coords || [9.4981, 76.3388],
          destination_jetty_id: routePlan.dest_jetty.id,
          road_comparison: routePlan.road_direct,
          water_totals: routePlan.water_totals,
          comparison_explanation: comparisonExplanation,
          recommended_origin_vehicle: routePlan.recommended_origin_vehicle,
          recommended_dest_vehicle: routePlan.recommended_dest_vehicle,
          recommended_boat_type: routePlan.recommended_boat_type,
          legs: routePlan.legs,
          chat_history: messages,
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
          <h2 className="text-lg font-bold text-primary">Inland Water Cargo Booking</h2>
          <p className="text-xs text-secondary">
            Chat with AI to plan freight moves, compare road vs waterways, and dispatch vessels
          </p>
        </div>
        <div className="flex gap-2">
          {!showConfirmation && (
            <button
              onClick={() => setShowConfirmation(true)}
              className="btn btn-secondary text-xs"
            >
              Manual Form Mode 📝
            </button>
          )}
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
        {/* Left side: Chat or Confirmation */}
        <div className="lg:col-span-6 space-y-4">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            loading={chatLoading}
          />

          {showConfirmation && (
            <ConfirmationCard
              initialData={bookingDetails}
              onPlanRoute={handlePlanRoute}
              loading={planLoading}
            />
          )}
        </div>

        {/* Right side: Live Leaflet Map & Comparison */}
        <div className="lg:col-span-6 space-y-4">
          <div className="card p-4 bg-surface border border-default space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary">Kerala Waterway & Road Routing</h3>
              <span className="text-[11px] text-secondary">
                {routePlan ? `${routePlan.legs.length} Multi-Modal Legs` : '15 Active Jetties'}
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
                <span className="w-3 h-1 bg-[#3F7F83] rounded"></span>
                <span>Water Barge Leg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 border-t-2 border-dashed border-[#2980B9]"></span>
                <span>First-Mile Taxi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 border-t-2 border-dashed border-[#E67E22]"></span>
                <span>Last-Mile Taxi</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⚓</span>
                <span>Jetty</span>
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
