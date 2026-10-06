'use client';

import { useState, useEffect } from 'react';
import type { Profile, UserRole } from '@/lib/types/database';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleSuspend = async (user: Profile) => {
    const action = user.suspended ? 'Reactivate' : 'Suspend';
    if (!confirm(`${action} user ${user.name}?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, suspended: !user.suspended }),
      });
      if (res.ok) {
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary">User Directory & Permissions</h2>
        <p className="text-xs text-secondary">
          Manage platform accounts, suspend fraudulent actors, and modify provider authorizations
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 bg-surface border border-default flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input text-xs"
          />
          <button type="submit" className="btn btn-secondary text-xs px-3">
            Search
          </button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input select text-xs w-full sm:w-44"
        >
          <option value="all">All Roles</option>
          <option value="user">Cargo Owner</option>
          <option value="ship_owner">Ship Owner</option>
          <option value="taxi">Taxi Driver</option>
          <option value="worker">Worker</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-16 text-center text-xs text-secondary">
          <div className="spinner mx-auto mb-2" style={{ width: 24, height: 24 }} />
          Loading user records...
        </div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center bg-surface border border-default text-xs text-secondary">
          No users matching query.
        </div>
      ) : (
        <div className="card bg-surface border border-default rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-default bg-main text-secondary font-semibold">
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-main/50 transition-colors">
                  <td className="p-3 font-medium text-primary">
                    {u.name}
                    {u.vehicle_type && (
                      <span className="block text-[10px] text-secondary capitalize">
                        {u.vehicle_type} ({u.capacity_t}t)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-secondary font-mono">{u.email}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                      className="input select text-[11px] py-1 px-2 w-auto bg-surface"
                    >
                      <option value="user">User</option>
                      <option value="ship_owner">Ship Owner</option>
                      <option value="taxi">Taxi</option>
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    {u.suspended ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        Suspended
                      </span>
                    ) : u.is_online ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Online
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-secondary">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleToggleSuspend(u)}
                      className={`text-[11px] font-medium px-2 py-1 rounded ${
                        u.suspended ? 'text-emerald-600 hover:underline' : 'text-amber-600 hover:underline'
                      }`}
                    >
                      {u.suspended ? 'Reactivate' : 'Suspend'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-[11px] text-red-500 hover:underline px-1 py-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
