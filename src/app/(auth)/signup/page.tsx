'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signupSchema } from '@/lib/validations';
import { z } from 'zod';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    vehicle_type: '',
    capacity_t: '',
    ship_type: 'bulk_cargo_barge',
    capacity_kg: '15000',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'taxi') {
        payload.vehicle_type = formData.vehicle_type;
        payload.capacity_t = formData.capacity_t ? Number(formData.capacity_t) : undefined;
      } else if (formData.role === 'ship_owner') {
        payload.ship_type = formData.ship_type;
        payload.capacity_kg = formData.capacity_kg ? Number(formData.capacity_kg) : undefined;
      }

      const parsed = signupSchema.parse(payload);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      // Auto login
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });

      if (signInError) throw signInError;

      router.push('/dashboard');
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message ?? 'Validation error');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-surface p-6 rounded-xl shadow-sm border border-default max-w-md mx-auto my-8">
      <h2 className="text-xl font-semibold mb-2 text-center text-primary">Create an account</h2>
      <p className="text-xs text-secondary text-center mb-6">
        Join Kerala&apos;s Inland Water Transport Network
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-sm error-text">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1">
          <label className="label text-sm font-medium">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input w-full"
            placeholder="e.g. Ramesh Varma"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="label text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input w-full"
            placeholder="name@example.com"
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="label text-sm font-medium">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input w-full pr-10"
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-secondary hover:text-accent focus:outline-none"
              disabled={loading}
            >
              {showPassword ? '👁️' : '🔒'}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="label text-sm font-medium">I am signing up as</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="input select w-full"
            disabled={loading}
          >
            <option value="user">Cargo Owner (Looking to ship goods)</option>
            <option value="ship_owner">Ship / Boat Owner (Vessel Operator)</option>
            <option value="taxi">Road Taxi / Truck Driver (Pickup & Delivery)</option>
            <option value="worker">Jetty Loading / Unloading Worker</option>
          </select>
        </div>

        {/* Taxi fields */}
        {formData.role === 'taxi' && (
          <div className="p-3 bg-accent-light/30 rounded-lg space-y-3 border border-default">
            <p className="text-xs font-semibold text-accent">Vehicle Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="label text-xs">Vehicle Type</label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  className="input select w-full text-sm"
                  disabled={loading}
                  required
                >
                  <option value="">Select type</option>
                  <option value="auto">Auto (up to 0.8t)</option>
                  <option value="pickup">Pickup (up to 2.5t)</option>
                  <option value="mini_truck">Mini Truck (up to 5t)</option>
                  <option value="truck">Truck (up to 12t)</option>
                  <option value="trailer">Trailer (&gt;12t)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="label text-xs">Capacity (Tonnes)</label>
                <input
                  type="number"
                  name="capacity_t"
                  value={formData.capacity_t}
                  onChange={handleChange}
                  className="input w-full text-sm"
                  placeholder="e.g. 10"
                  step="0.5"
                  min="0.1"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Ship Owner fields: ship type and max capacity in kgs */}
        {formData.role === 'ship_owner' && (
          <div className="p-3 bg-accent-light/30 rounded-lg space-y-3 border border-default">
            <p className="text-xs font-semibold text-accent">Vessel / Boat Information</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="label text-xs">Ship / Vessel Type</label>
                <select
                  name="ship_type"
                  value={formData.ship_type}
                  onChange={handleChange}
                  className="input select w-full text-sm"
                  disabled={loading}
                  required
                >
                  <option value="bulk_cargo_barge">Bulk Cargo Barge (Sand, Cement, Gravel)</option>
                  <option value="country_craft">Traditional Country Craft / Vallam</option>
                  <option value="deck_barge">Heavy Deck Cargo Barge</option>
                  <option value="motor_cargo_boat">Motorized Inland Cargo Vessel</option>
                  <option value="kettuvallam_cargo">Modified Kettuvallam Freight Carrier</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="label text-xs">Max Vessel Capacity (in KG)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="capacity_kg"
                    value={formData.capacity_kg}
                    onChange={handleChange}
                    className="input w-full text-sm"
                    placeholder="e.g. 15000 (for 15 tonnes)"
                    step="500"
                    min="500"
                    disabled={loading}
                    required
                  />
                  <span className="text-xs text-secondary whitespace-nowrap">
                    ≈ {(Number(formData.capacity_kg || 0) / 1000).toFixed(1)} tonnes
                  </span>
                </div>
                <p className="text-[11px] text-secondary">
                  Specify carrying limit in kilograms (e.g. 8000 kg = 8 tonnes).
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full mt-4 py-2.5 rounded-lg flex items-center justify-center font-medium"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="spinner" style={{ width: 18, height: 18 }} />
              Creating account...
            </span>
          ) : (
            'Complete Registration'
          )}
        </button>

        <div className="text-center text-sm text-secondary mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
