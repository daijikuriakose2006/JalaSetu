'use client';

import Link from 'next/link';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Lazy-load animated boat only on the landing hero
const HeroBoatCanvas = dynamic(() => import('@/components/landing/HeroBoatCanvas'), {
  ssr: false,
  loading: () => <div className="h-28 flex items-center justify-center text-xs text-secondary">Loading vessel animation...</div>,
});

export default function HomePage() {
  const [demoWeight, setDemoWeight] = useState(8);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactError, setContactError] = useState('');

  // Interactive Live Road vs Water calculations for Kochi -> Alappuzha
  // Road: 65 km via NH66 @ ₹6/tonne-km
  const roadCost = Math.round(6.0 * 65 * demoWeight);
  const roadDurationHours = 2.5;
  const roadCo2Kg = Number((0.062 * 65 * demoWeight).toFixed(1));

  // Waterway: 80 km backwaters @ ₹3.5/tonne-km + loading ₹150/t * 2
  const waterFreight = 3.5 * 80 * demoWeight;
  const waterLoading = 150 * demoWeight * 2;
  const waterCost = Math.round(waterFreight + waterLoading);
  const waterDurationHours = 4.5;
  const waterCo2Kg = Number((0.016 * 80 * demoWeight).toFixed(1));

  const costSaved = Math.max(0, roadCost - waterCost);
  const costSavedPercent = roadCost > 0 ? Math.round((costSaved / roadCost) * 100) : 0;
  const co2SavedKg = Number(Math.max(0, roadCo2Kg - waterCo2Kg).toFixed(1));
  const co2SavedPercent = roadCo2Kg > 0 ? Math.round((co2SavedKg / roadCo2Kg) * 100) : 0;

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setContactError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });

      if (res.ok) {
        setSent(true);
        setContactForm({ name: '', email: '', subject: '', message: '' });
      } else {
        const data = await res.json();
        setContactError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setContactError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-main flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-default">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-accent flex items-center gap-2">
            <span>🚢</span> JalaSetu
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-secondary">
            <a href="#how-it-works" className="hover:text-accent transition-colors">How It Works</a>
            <a href="#comparison" className="hover:text-accent transition-colors">Road vs Water</a>
            <a href="#features" className="hover:text-accent transition-colors">Stakeholders</a>
            <a href="#faq" className="hover:text-accent transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-accent transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="btn btn-secondary text-xs">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary text-xs hidden sm:inline-flex">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-light text-accent text-xs font-bold tracking-wide uppercase">
            🌊 Kerala&apos;s Inland Waterway Freight Marketplace
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-primary leading-tight">
            Connect Cargo with Kerala&apos;s
            <span className="text-accent"> Backwaters</span>
          </h1>

          <p className="text-base text-secondary max-w-2xl mx-auto leading-relaxed">
            Move heavy commercial freight through National Waterway 3. Compare direct road trucks vs multi-modal barges on
            <strong> cost, time, and CO₂</strong>, with automatic dispatch for boats, taxis, and loading crews.
          </p>

          {/* Lazy loaded animated boat simulation */}
          <HeroBoatCanvas />

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/signup" className="btn btn-primary text-sm px-8 py-3 font-bold shadow-md">
              Book Cargo Shipment →
            </Link>
            <a href="#comparison" className="btn btn-secondary text-sm px-6 py-3 font-semibold">
              Live Route Comparison
            </a>
          </div>
        </div>
      </section>

      {/* Key Metrics Section */}
      <section className="bg-surface border-y border-default py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-extrabold text-accent">1,687 km</p>
            <p className="text-xs text-secondary mt-1 font-medium">Navigable Kerala Waterways</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-accent">~40%</p>
            <p className="text-xs text-secondary mt-1 font-medium">Average Cost Reduction</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">74%</p>
            <p className="text-xs text-secondary mt-1 font-medium">CO₂ Emission Abatement</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-accent">15+ Jetties</p>
            <p className="text-xs text-secondary mt-1 font-medium">Terminal Graph Network</p>
          </div>
        </div>
      </section>

      {/* Interactive Mini Demo: Road vs Waterway */}
      <section id="comparison" className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-block text-xs font-bold uppercase text-accent mb-1 tracking-wider">
            Target Demo Scenario
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">
            Moving Building Material: Kochi ➔ Alappuzha
          </h2>
          <p className="text-xs text-secondary mt-1">
            Adjust the cargo weight below to see real-time cost, duration, and carbon comparisons.
          </p>
        </div>

        {/* Weight Selector */}
        <div className="card p-4 bg-surface border border-default max-w-md mx-auto mb-8 text-center space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-secondary">Cargo Payload Weight:</span>
            <span className="font-extrabold text-base text-accent">{demoWeight} Tonnes ({demoWeight * 1000} kg)</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={demoWeight}
            onChange={(e) => setDemoWeight(parseInt(e.target.value) || 1)}
            className="w-full accent-[#3F7F83] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-secondary">
            <span>1 Tonne (Auto/Pickup)</span>
            <span>8 Tonnes (Standard Demo)</span>
            <span>30 Tonnes (Bulk Barge)</span>
          </div>
        </div>

        {/* Side by side cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Road */}
          <div className="card p-6 border border-default bg-main/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚛</span>
                <h3 className="font-bold text-base text-primary">By Highway Road</h3>
              </div>
              <span className="text-xs text-secondary">NH66 Corridor</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-default">
                <span className="text-secondary">Route Distance</span>
                <span className="font-semibold text-primary">65 km</span>
              </div>
              <div className="flex justify-between py-2 border-b border-default">
                <span className="text-secondary">Transit Time</span>
                <span className="font-semibold text-primary">~{roadDurationHours} Hours</span>
              </div>
              <div className="flex justify-between py-2 border-b border-default">
                <span className="text-secondary">Estimated Freight Cost</span>
                <span className="font-bold text-primary text-sm">₹{roadCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary">CO₂ Emissions</span>
                <span className="font-bold text-red-500">{roadCo2Kg} kg CO₂</span>
              </div>
            </div>
          </div>

          {/* Waterway */}
          <div className="card p-6 border-2 border-accent bg-accent-light/20 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              ✨ RECOMMENDED ROUTE
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚢</span>
                <h3 className="font-bold text-base text-accent">By Inland Waterway</h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-accent/20">
                <span className="text-secondary">Waterway Distance</span>
                <span className="font-semibold text-primary">80 km (Vembanad Lake)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-accent/20">
                <span className="text-secondary">Transit Time (Barge)</span>
                <span className="font-semibold text-primary">~{waterDurationHours} Hours</span>
              </div>
              <div className="flex justify-between py-2 border-b border-accent/20">
                <span className="text-secondary">Total Multi-modal Cost</span>
                <span className="font-extrabold text-accent text-base">₹{waterCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary">CO₂ Emissions</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {waterCo2Kg} kg CO₂
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Savings banner */}
        <div className="mt-6 card p-4 bg-accent text-white rounded-xl text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-black">₹{costSaved.toLocaleString()}</p>
              <p className="text-xs text-white/80">Direct Cost Saved</p>
            </div>
            <div>
              <p className="text-2xl font-black">{costSavedPercent}%</p>
              <p className="text-xs text-white/80">Cheaper than Trucks</p>
            </div>
            <div>
              <p className="text-2xl font-black">{co2SavedKg} kg</p>
              <p className="text-xs text-white/80">Net CO₂ Reduction</p>
            </div>
            <div>
              <p className="text-2xl font-black">{co2SavedPercent}%</p>
              <p className="text-xs text-white/80">Emissions Slashed</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="bg-surface border-y border-default py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-2">
            How JalaSetu Operates
          </h2>
          <p className="text-xs text-secondary text-center mb-10 max-w-xl mx-auto">
            From smart chat booking to live vessel navigation in 4 frictionless steps.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Conversational Booking',
                desc: 'Describe cargo details to our Gemini agent. It plans the route through the waterway graph.',
              },
              {
                step: '02',
                title: 'Multi-Modal Route Plan',
                desc: 'Road taxi picks up goods to nearest jetty, water barge completes the long transit, delivery taxi drops at destination.',
              },
              {
                step: '03',
                title: 'Atomic Job Dispatch',
                desc: 'Vessels and taxis receive offers and claim them atomically with zero double-booking conflicts.',
              },
              {
                step: '04',
                title: 'Realtime GPS & Delivery',
                desc: 'Shippers follow live boat coordinates, get automated status milestones, and rate operators.',
              },
            ].map((item) => (
              <div key={item.step} className="card p-5 bg-main border border-default rounded-xl space-y-2">
                <span className="text-2xl font-black text-accent">{item.step}</span>
                <h3 className="font-bold text-sm text-primary">{item.title}</h3>
                <p className="text-xs text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-2">
          Tailored Workspaces for Every Role
        </h2>
        <p className="text-xs text-secondary text-center mb-10">
          Designed mobile-first for boat operators on water, truckers on road, and cargo shippers.
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              role: 'Cargo Owners',
              icon: '📦',
              bullets: ['AI natural language booking', 'Side-by-side cost & CO₂ comparison', 'Live boat GPS tracking', 'Post-delivery reviews'],
            },
            {
              role: 'Boat Operators',
              icon: '🚢',
              bullets: ['Vessel capacity registration (in kg)', 'Live backwater navigation map', '1-tap atomic job claiming', 'Guaranteed high-tonnage payouts'],
            },
            {
              role: 'Taxi / Truck Drivers',
              icon: '🚛',
              bullets: ['First & last mile cargo jobs', 'Vehicle payload matching', 'Direct jetty routing', 'Synchronized boat ETA arrival alerts'],
            },
            {
              role: 'Loading Crew',
              icon: '💪',
              bullets: ['Terminal stevedore tasks', '5-hour advance notification buffer', 'Jetty-based matching', 'Per-tonne labor earnings'],
            },
          ].map((item) => (
            <div key={item.role} className="card p-5 bg-surface border border-default rounded-xl space-y-3">
              <span className="text-3xl block">{item.icon}</span>
              <h3 className="font-bold text-sm text-primary">{item.role}</h3>
              <ul className="space-y-1.5 text-xs text-secondary">
                {item.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-accent">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-surface border-y border-default py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-2">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3 text-xs">
            {[
              {
                q: 'How are road and water routes computed?',
                a: 'Road legs use OSRM routing over OpenStreetMap roads. Water routes use Dijkstra algorithm on our hand-built graph of 15 Kerala jetties across Vembanad Lake and National Waterway 3.',
              },
              {
                q: 'How does atomic job claiming work?',
                a: 'Job offers use an atomic PostgreSQL function (claim_job) that assigns the job in a single row-level update. If two providers tap Accept simultaneously, only one succeeds and the other gets an instant already-taken notification.',
              },
              {
                q: 'What cargo is suitable for Kerala waterways?',
                a: 'Construction materials (aggregates, sand, cement, steel, bricks), timber, agricultural produce, and heavy industrial machinery benefit most from barge freight.',
              },
              {
                q: 'How does JalaSetu handle scheduling and cron jobs?',
                a: 'Background jobs run through pg_cron calling a secured /api/cron/tick route every minute. It handles 1-minute timeout radius expansions and scheduled notify_at alerts.',
              },
            ].map((faq, idx) => (
              <details key={idx} className="card p-4 bg-main border border-default rounded-xl group cursor-pointer">
                <summary className="font-bold text-primary flex justify-between items-center">
                  <span>{faq.q}</span>
                  <span className="text-accent group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-2 text-secondary leading-relaxed pt-2 border-t border-default">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="max-w-2xl mx-auto px-4 py-16 w-full">
        <div className="card p-6 bg-surface border border-default rounded-xl space-y-4">
          <div>
            <h2 className="text-xl font-bold text-primary">Contact JalaSetu Operations</h2>
            <p className="text-xs text-secondary">
              Inquire about bulk shipping, partner fleets, or port terminal integrations in Kerala
            </p>
          </div>

          {sent ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold text-center space-y-2">
              <p>✓ Thank you! Your message has been logged in our operations queue.</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="btn btn-secondary text-xs py-1"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-3 text-xs">
              {contactError && (
                <div className="p-2.5 bg-red-50 text-red-600 rounded text-xs">{contactError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label text-[11px]">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Anand Menon"
                  />
                </div>
                <div className="space-y-1">
                  <label className="label text-[11px]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="input text-xs"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="label text-[11px]">Subject</label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  className="input text-xs"
                  placeholder="Bulk freight agreement / Jetty partnership"
                />
              </div>

              <div className="space-y-1">
                <label className="label text-[11px]">Message</label>
                <textarea
                  rows={3}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="input text-xs resize-none"
                  placeholder="Describe your freight specifications or vessel capacity..."
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="btn btn-primary w-full py-2.5 text-xs font-bold"
              >
                {sending ? 'Submitting Message...' : 'Submit Inquiry'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-default py-8 text-center text-xs text-secondary mt-auto">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-bold text-accent">🚢 JalaSetu — Kerala Inland Waterway Marketplace</p>
          <p className="text-[11px]">
            Hackathon Edition • National Waterways 3 (Kottappuram to Kollam) • Built with Next.js, Supabase, PostGIS, Leaflet, and Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
