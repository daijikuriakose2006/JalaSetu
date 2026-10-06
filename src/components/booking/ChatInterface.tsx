'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types/database';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  loading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  return (
    <div className="flex flex-col h-[520px] bg-surface rounded-xl border border-default shadow-sm overflow-hidden">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-default bg-surface/90 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-semibold text-sm text-primary">JalaSetu AI Booking Assistant</h3>
            <p className="text-[11px] text-secondary">Powered by Gemini & Kerala Waterways Graph</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-accent-light text-accent text-xs font-medium">
          Multi-Modal
        </span>
      </div>

      {/* Messages view */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <span className="text-4xl mb-2 block">🚢</span>
            <p className="text-sm font-medium text-primary mb-1">
              Where would you like to move cargo today?
            </p>
            <p className="text-xs text-secondary mb-4">
              Describe what you need to ship, the weight, origin, and destination in Kerala.
            </p>
            <div className="space-y-1.5 text-left max-w-sm mx-auto">
              <p className="text-[11px] text-secondary font-medium">Try asking:</p>
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="w-full text-left text-xs p-2 rounded-lg bg-main hover:bg-accent-light text-primary transition-colors border border-default"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-accent text-white rounded-br-xs shadow-xs'
                  : 'bg-main text-primary rounded-bl-xs border border-default'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              <span
                className={`text-[10px] mt-1 block text-right opacity-70`}
              >
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-main text-secondary rounded-2xl rounded-bl-xs px-4 py-3 border border-default flex items-center gap-1.5 text-xs">
              <span className="spinner" style={{ width: 14, height: 14 }} />
              <span>Analyzing waterway graph and extracting details...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-default bg-surface flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Move 8 tonnes building material from Kochi to Alappuzha"
          disabled={loading}
          className="input flex-1 text-sm py-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
