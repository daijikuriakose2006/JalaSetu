'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types/database';
import type { RoutePlanResponse } from '@/lib/routing/planner';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onResetChat?: () => void;
  loading: boolean;
  routePlan?: RoutePlanResponse | null;
  bookingDetails?: {
    cargo_name?: string;
    weight_tonnes?: number;
    origin_address?: string;
    destination_address?: string;
    needs_loading_unloading?: boolean;
    pickup_time_preset?: string;
  };
  onConfirmOrder?: (mode: 'water' | 'road') => Promise<void>;
  orderConfirming?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onResetChat,
  loading,
  routePlan,
  bookingDetails,
  onConfirmOrder,
  orderConfirming,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, routePlan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    onSendMessage(msg);
  };

  const samplePrompts = [
    'Move 8 tonnes of building material from Kochi to Alappuzha',
    'Transport 5t cement bags from Fort Kochi to Vaikom',
    'Send 12 tonnes of river sand from Ernakulam to Muhamma',
  ];

  // Latest suggested chips from the most recent assistant message
  const latestAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const activeChips = latestAssistantMsg?.suggested_chips || [];

  return (
    <div className="flex flex-col h-[600px] bg-surface rounded-xl border border-default shadow-sm overflow-hidden">
      {/* WhatsApp / ChatGPT style Chat Header */}
      <div className="px-4 py-3 border-b border-default bg-surface/90 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-lg">
              🚢
            </span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-surface"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-primary">JalaSetu Logistics AI</h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-accent-light text-accent">
                Online
              </span>
            </div>
            <p className="text-[11px] text-secondary">
              Kerala Waterway & Road Freight Booking Assistant
            </p>
          </div>
        </div>

        {messages.length > 0 && onResetChat && (
          <button
            type="button"
            onClick={onResetChat}
            className="text-xs text-secondary hover:text-primary px-2.5 py-1 rounded-lg border border-default hover:bg-main transition-colors"
            title="Start new conversation"
          >
            🔄 New Booking
          </button>
        )}
      </div>

      {/* Messages stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center text-3xl">
              🌊
            </div>
            <div>
              <h4 className="text-base font-bold text-primary">
                Where would you like to move cargo today?
              </h4>
              <p className="text-xs text-secondary max-w-md mx-auto mt-1">
                Tell me what cargo you have, estimated weight, and destination in Kerala. I will calculate the cheapest multi-modal water route and dispatch boats & trucks for you!
              </p>
            </div>

            <div className="pt-2 space-y-2 text-left max-w-md mx-auto">
              <p className="text-[11px] text-secondary font-medium uppercase tracking-wider">
                💡 Tap to try sample trip:
              </p>
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="w-full text-left text-xs p-2.5 rounded-xl bg-main hover:bg-accent-light hover:border-accent text-primary transition-all border border-default flex items-center justify-between group"
                >
                  <span>&ldquo;{prompt}&rdquo;</span>
                  <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isLatest = idx === messages.length - 1;
          const isAssistant = m.role === 'assistant';

          return (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-accent text-white rounded-br-xs shadow-xs'
                    : 'bg-main text-primary rounded-bl-xs border border-default shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                {/* Inline Multi-modal Route & Dispatch Card inside Assistant Bubble */}
                {isAssistant && (m.is_booking_summary || (isLatest && routePlan)) && routePlan && (
                  <div className="mt-3.5 pt-3 border-t border-default/70 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-default/40">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🚢</span>
                        <span className="font-bold text-xs uppercase tracking-wide text-accent">
                          Multi-Modal Waterway Plan
                        </span>
                      </div>
                      <span className="text-[10px] bg-accent-light text-accent px-2 py-0.5 rounded-full font-semibold">
                        {routePlan.legs.length} Legs Planned
                      </span>
                    </div>

                    {/* Cargo & Route Details */}
                    <div className="p-2.5 rounded-lg bg-surface border border-default text-xs space-y-1.5">
                      <div className="flex justify-between font-semibold">
                        <span className="text-primary">
                          📦 {bookingDetails?.cargo_name || 'Cargo'}
                        </span>
                        <span className="text-accent">
                          ⚖️ {bookingDetails?.weight_tonnes || 8} Tonnes
                        </span>
                      </div>
                      <div className="text-[11px] text-secondary truncate">
                        📍 <strong>Pickup:</strong> {bookingDetails?.origin_address || 'Kochi'}
                      </div>
                      <div className="text-[11px] text-secondary truncate">
                        🏁 <strong>Delivery:</strong> {bookingDetails?.destination_address || 'Alappuzha'}
                      </div>
                      <div className="flex justify-between text-[11px] text-secondary pt-1 border-t border-default/50">
                        <span>
                          {bookingDetails?.needs_loading_unloading
                            ? '👷 Helpers: Yes (Stevedores)'
                            : '🚫 Helpers: Self-loading'}
                        </span>
                        <span className="capitalize">
                          ⏰ {bookingDetails?.pickup_time_preset === 'now' ? 'Dispatch: Immediate' : 'Dispatch: Today'}
                        </span>
                      </div>
                    </div>

                    {/* Pricing & Environmental Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300">
                        <p className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400">
                          Waterway Payout
                        </p>
                        <p className="text-base font-extrabold">₹{routePlan.water_totals?.cost || 0}</p>
                        <p className="text-[10px] text-green-600 dark:text-green-400">
                          📉 {routePlan.savings?.cost_saved_percent}% Cheaper vs Road
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300">
                        <p className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400">
                          CO₂ Reduction
                        </p>
                        <p className="text-base font-extrabold">{routePlan.savings?.co2_saved_kg || 0} kg</p>
                        <p className="text-[10px] text-teal-600 dark:text-teal-400">
                          🌿 {routePlan.savings?.co2_saved_percent}% Cleaner Footprint
                        </p>
                      </div>
                    </div>

                    {/* Recommended Transport Fleet */}
                    <div className="p-2 bg-surface rounded-lg border border-default text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-secondary">
                        <span>🚢 Water Barge:</span>
                        <strong className="text-primary capitalize">
                          {routePlan.recommended_boat_type?.replace(/_/g, ' ') || 'Bulk Cargo Barge'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-secondary">
                        <span>🚛 Road Taxi:</span>
                        <strong className="text-primary capitalize">
                          {routePlan.recommended_origin_vehicle || 'Truck'}
                        </strong>
                      </div>
                    </div>

                    {/* Instant Confirmation & Dispatch Button */}
                    {onConfirmOrder && (
                      <button
                        type="button"
                        disabled={orderConfirming}
                        onClick={() => onConfirmOrder('water')}
                        className="w-full py-2.5 px-3 rounded-xl bg-accent text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      >
                        {orderConfirming ? (
                          <>
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                            <span>Dispatching Dispatches to Vessels & Drivers...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀 Confirm & Dispatch Order (₹{routePlan.water_totals?.cost})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <span
                  className={`text-[10px] mt-1.5 block text-right opacity-60`}
                >
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Clickable Quick Reply Chips for this message */}
              {isAssistant && m.suggested_chips && m.suggested_chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1 max-w-[88%]">
                  {m.suggested_chips.map((chip, chipIdx) => (
                    <button
                      key={chipIdx}
                      type="button"
                      disabled={loading || orderConfirming}
                      onClick={() => onSendMessage(chip)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-surface border border-accent/40 text-accent hover:bg-accent hover:text-white transition-all shadow-xs active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-main text-secondary rounded-2xl rounded-bl-xs px-4 py-3 border border-default flex items-center gap-2 text-xs shadow-xs">
              <span className="spinner" style={{ width: 14, height: 14 }} />
              <span>Analyzing Kerala waterway graph & calculating best multi-modal route...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips Bar (above input) */}
      {activeChips.length > 0 && (
        <div className="px-3 py-1.5 bg-main/50 border-t border-default/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[10px] font-bold text-secondary uppercase shrink-0">Quick Options:</span>
          {activeChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading || orderConfirming}
              onClick={() => onSendMessage(chip)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface border border-default text-primary hover:border-accent hover:text-accent transition-all shrink-0 active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-default bg-surface flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Move 8 tonnes building material from Kochi to Alappuzha"
          disabled={loading || orderConfirming}
          className="input flex-1 text-sm py-2 px-3.5"
        />
        <button
          type="submit"
          disabled={loading || orderConfirming || !input.trim()}
          className="btn btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-1.5"
        >
          <span>Send</span>
          <span>➔</span>
        </button>
      </form>
    </div>
  );
}
