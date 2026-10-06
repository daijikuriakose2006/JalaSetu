'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function HomePage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setContactError('');

    try {
      const formData = new FormData();
      formData.append('access_key', '95c467f9-9a1c-42d2-b0f9-ad073b20a45b');
      formData.append('name', contactForm.name);
      formData.append('email', contactForm.email);
      formData.append('message', contactForm.message);
      formData.append('subject', 'New Contact from JalaSetu');

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        setContactForm({ name: '', email: '', message: '' });
      } else {
        setContactError(data.message || 'Failed to send. Please try again.');
      }
    } catch {
      setContactError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-main">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-sm border-b border-default">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-accent flex items-center gap-2">
            🚢 JalaSetu
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
            <a href="#how-it-works" className="hover:text-accent transition-colors">How it Works</a>
            <a href="#features" className="hover:text-accent transition-colors">Features</a>
            <a href="#comparison" className="hover:text-accent transition-colors">Compare</a>
            <a href="#contact" className="hover:text-accent transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="btn btn-secondary text-sm">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary text-sm hidden sm:inline-flex">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-light text-accent text-sm font-medium mb-6">
            🌊 Kerala&apos;s First Inland Water Transport Marketplace
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-primary leading-tight mb-6">
            Move Cargo Through
            <span className="text-accent"> Kerala&apos;s Backwaters</span>
          </h1>
          <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
            Connect with boat operators, compare road vs waterway transport, and
            save up to 40% on costs while cutting CO₂ emissions by 74%.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn btn-primary text-base px-8 py-3">
              Start Shipping →
            </Link>
            <a href="#how-it-works" className="btn btn-secondary text-base px-8 py-3">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-surface border-y border-default py-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-accent">1,687 km</p>
            <p className="text-sm text-secondary mt-1">Navigable Waterways</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-accent">~40%</p>
            <p className="text-sm text-secondary mt-1">Cost Savings</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-accent">74%</p>
            <p className="text-sm text-secondary mt-1">Less CO₂</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-accent">15+</p>
            <p className="text-sm text-secondary mt-1">Active Jetties</p>
          </div>
        </div>
      </section>

      {/* Problem & Impact */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6">
              The Problem We&apos;re Solving
            </h2>
            <div className="space-y-4 text-secondary">
              <p>
                Kerala has <strong className="text-primary">1,687 km of navigable waterways</strong> — the longest network in India. Yet,
                over 95% of cargo still moves by road, causing congestion, pollution, and higher costs.
              </p>
              <p>
                Construction companies, sand traders, and agricultural producers spend thousands on
                truck transport when boats can carry the same load for 40% less, with a fraction of the carbon footprint.
              </p>
              <p>
                The problem? <strong className="text-primary">There&apos;s no easy way to find and book water transport.</strong> Cargo owners
                don&apos;t know which boats are available, and boat operators lack visibility into demand.
              </p>
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-primary text-lg">Our Impact Vision</h3>
            <div className="space-y-3">
              {[
                { icon: '🌿', label: 'Reduce CO₂ emissions', desc: '74% lower per tonne-km vs trucks' },
                { icon: '💰', label: 'Cut transport costs', desc: '30-40% savings for cargo owners' },
                { icon: '🚢', label: 'Revive waterways', desc: 'Create livelihood for boat operators' },
                { icon: '🛣️', label: 'Decongest roads', desc: 'Shift heavy cargo off highways' },
                { icon: '📱', label: 'Digital platform', desc: 'Uber-like booking for water transport' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-primary text-sm">{item.label}</p>
                    <p className="text-xs text-secondary">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-surface border-y border-default py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-4">
            How JalaSetu Works
          </h2>
          <p className="text-secondary text-center mb-12 max-w-2xl mx-auto">
            From booking to delivery in 4 simple steps — all managed through our platform.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                icon: '💬',
                title: 'Chat & Book',
                desc: 'Tell our AI assistant what you need to ship — origin, destination, weight, and date. It builds the best multi-modal route.',
              },
              {
                step: '2',
                icon: '⚖️',
                title: 'Compare Routes',
                desc: 'See a side-by-side comparison of road vs waterway on cost, time, and CO₂ emissions before confirming.',
              },
              {
                step: '3',
                icon: '🤝',
                title: 'Auto-Match',
                desc: 'We match your cargo with nearby boats and taxis. Providers accept jobs instantly through the app.',
              },
              {
                step: '4',
                icon: '📍',
                title: 'Track & Deliver',
                desc: 'Track your cargo in real-time on a live map. Rate providers after delivery.',
              },
            ].map((item) => (
              <div key={item.step} className="card p-6 text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div className="text-3xl mb-3 mt-2">{item.icon}</div>
                <h3 className="font-semibold text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features per role */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-4">
          Built for Everyone
        </h2>
        <p className="text-secondary text-center mb-12 max-w-2xl mx-auto">
          Whether you&apos;re shipping cargo or providing transport, JalaSetu has you covered.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              role: 'Cargo Owners',
              icon: '📦',
              color: 'text-blue-600',
              features: [
                'AI-powered chat booking',
                'Road vs Water comparison',
                'Real-time cargo tracking',
                'Cost & CO₂ estimates',
              ],
            },
            {
              role: 'Boat Operators',
              icon: '⚓',
              color: 'text-accent',
              features: [
                'Job offers pushed to you',
                'One-tap accept',
                'GPS-tracked routes',
                'Fleet management',
              ],
            },
            {
              role: 'Taxi / Truck Drivers',
              icon: '🚛',
              color: 'text-orange-600',
              features: [
                'First/last mile pickups',
                'Route to nearest jetty',
                'Fair, transparent pricing',
                'Flexible schedule',
              ],
            },
            {
              role: 'Loading Workers',
              icon: '💪',
              color: 'text-green-600',
              features: [
                'Loading/unloading jobs',
                'Advanced notifications',
                'Jetty-based matching',
                'Ratings & reputation',
              ],
            },
          ].map((role) => (
            <div key={role.role} className="card p-6">
              <div className="text-3xl mb-3">{role.icon}</div>
              <h3 className="font-semibold text-primary mb-3">{role.role}</h3>
              <ul className="space-y-2">
                {role.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                    <span className="text-accent mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo — Road vs Water comparison */}
      <section id="comparison" className="bg-surface border-y border-default py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-4">
            Road vs Water: See the Difference
          </h2>
          <p className="text-secondary text-center mb-8">
            Example: Moving 8 tonnes of building material from <strong className="text-primary">Kochi → Alappuzha</strong>
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Road */}
            <div className="card p-6 border-2 border-default">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🚛</span>
                <h3 className="font-semibold text-primary text-lg">By Road</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-default">
                  <span className="text-sm text-secondary">Distance</span>
                  <span className="font-medium text-primary">~65 km (NH66)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-default">
                  <span className="text-sm text-secondary">Duration</span>
                  <span className="font-medium text-primary">~2.5 hours</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-default">
                  <span className="text-sm text-secondary">Estimated Cost</span>
                  <span className="font-medium text-primary">₹3,120</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-secondary">CO₂ Emissions</span>
                  <span className="font-medium" style={{ color: 'var(--color-error)' }}>32.2 kg</span>
                </div>
              </div>
            </div>

            {/* Water */}
            <div className="card p-6 border-2" style={{ borderColor: 'var(--color-accent)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🚢</span>
                <h3 className="font-semibold text-accent text-lg">By Waterway ✨</h3>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-accent-light text-accent text-xs font-medium">
                  Recommended
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-default">
                  <span className="text-sm text-secondary">Water Route</span>
                  <span className="font-medium text-primary">~80 km (backwaters)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-default">
                  <span className="text-sm text-secondary">Duration</span>
                  <span className="font-medium text-primary">~4-5 hours</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-default">
                  <span className="text-sm text-secondary">Estimated Cost</span>
                  <span className="font-medium text-accent">₹1,880</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-secondary">CO₂ Emissions</span>
                  <span className="font-medium" style={{ color: 'var(--color-success)' }}>10.2 kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings summary */}
          <div className="mt-6 card p-4 bg-accent-light">
            <div className="flex flex-wrap gap-6 justify-center text-center">
              <div>
                <p className="text-2xl font-bold text-accent">₹1,240</p>
                <p className="text-xs text-secondary">Cost Saved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">40%</p>
                <p className="text-xs text-secondary">Cheaper</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">22 kg</p>
                <p className="text-xs text-secondary">CO₂ Reduced</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">68%</p>
                <p className="text-xs text-secondary">Less Emissions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'What kind of cargo can I ship through waterways?',
              a: 'Building materials (sand, cement, bricks), agricultural products, timber, and general goods under 15 tonnes. Hazardous materials are not supported.',
            },
            {
              q: 'How is the waterway route determined?',
              a: 'We use a graph of Kerala\'s jetties and waterway connections. Our algorithm finds the shortest path through the backwaters, then adds road legs from your location to the nearest jetty and from the destination jetty to your delivery point.',
            },
            {
              q: 'Is my cargo insured during water transport?',
              a: 'Basic coverage is included. We recommend discussing additional insurance with your boat operator for high-value cargo.',
            },
            {
              q: 'How does pricing work?',
              a: 'Pricing is based on weight (per tonne), distance (per km), and vehicle type. Water transport costs about ₹3.50/tonne-km vs ₹6.00/tonne-km by road. Loading charges are separate at ₹150/tonne.',
            },
            {
              q: 'Can I track my cargo in real-time?',
              a: 'Yes! Once your cargo is picked up, you can see the live location of the boat and taxi on a map, along with estimated arrival time.',
            },
            {
              q: 'How do I become a boat operator or taxi driver on JalaSetu?',
              a: 'Sign up with the "Ship Owner" or "Taxi" role, add your boat or vehicle details, and go online to start receiving job offers.',
            },
          ].map((faq, i) => (
            <details key={i} className="card group">
              <summary className="p-4 cursor-pointer font-medium text-primary flex items-center justify-between">
                <span>{faq.q}</span>
                <span className="text-accent text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-secondary">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="bg-surface border-y border-default py-16">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-4">
            Contact Us
          </h2>
          <p className="text-secondary text-center mb-8">
            Have questions, feedback, or partnership inquiries? We&apos;d love to hear from you.
          </p>

          {sent ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="font-semibold text-primary text-lg mb-2">Message Sent!</h3>
              <p className="text-secondary text-sm mb-4">
                Thank you for reaching out. We&apos;ll get back to you soon.
              </p>
              <button
                onClick={() => setSent(false)}
                className="btn btn-secondary text-sm"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleContact} className="card p-6 space-y-4">
              <div>
                <label htmlFor="contact-name" className="label">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  className="input"
                  placeholder="Your name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="label">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  className="input"
                  placeholder="your@email.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="label">Message</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  className="input resize-none"
                  placeholder="How can we help you?"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                />
              </div>
              {contactError && (
                <p className="error-text">{contactError}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="btn btn-primary w-full"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16" style={{ backgroundColor: 'var(--color-accent)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Ship Smarter?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Join Kerala&apos;s inland water transport revolution. Save money, save time, save the planet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-accent font-semibold rounded-lg hover:bg-white/90 transition-colors"
            >
              Create Free Account →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-default py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-accent text-lg mb-3">🚢 JalaSetu</h3>
              <p className="text-sm text-secondary">
                Kerala&apos;s first inland water transport marketplace. 
                Connecting cargo owners with boat operators across 1,687 km of backwaters.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-3 text-sm">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/signup" className="block text-sm text-secondary hover:text-accent transition-colors">Sign Up</Link>
                <Link href="/login" className="block text-sm text-secondary hover:text-accent transition-colors">Sign In</Link>
                <a href="#how-it-works" className="block text-sm text-secondary hover:text-accent transition-colors">How it Works</a>
                <a href="#features" className="block text-sm text-secondary hover:text-accent transition-colors">Features</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-3 text-sm">For Providers</h4>
              <div className="space-y-2">
                <Link href="/signup" className="block text-sm text-secondary hover:text-accent transition-colors">Register as Boat Operator</Link>
                <Link href="/signup" className="block text-sm text-secondary hover:text-accent transition-colors">Register as Taxi Driver</Link>
                <Link href="/signup" className="block text-sm text-secondary hover:text-accent transition-colors">Register as Worker</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-default pt-6 text-center">
            <p className="text-xs text-secondary">
              © 2026 JalaSetu. Built with ❤️ for Kerala&apos;s waterways. Hackathon Project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
