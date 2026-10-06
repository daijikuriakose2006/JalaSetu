'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { ThemeMode } from '@/lib/types/database';

export default function UserProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, theme }),
      });
      if (res.ok) {
        await refreshProfile();
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card p-6 bg-surface border border-default rounded-xl space-y-5">
        <div>
          <h2 className="text-lg font-bold text-primary">Account & Preferences</h2>
          <p className="text-xs text-secondary">Manage your profile details and app appearance</p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold">
            ✓ Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="label text-xs">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="label text-xs">Email Address</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="input text-sm opacity-60 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="label text-xs">Theme Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`py-2 px-3 text-xs rounded-lg border capitalize font-medium ${
                    theme === mode
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-secondary border-default'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary w-full py-2.5 text-xs font-bold mt-2"
          >
            {saving ? 'Saving Changes...' : 'Save Profile Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
