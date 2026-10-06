export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-medium text-primary mb-2">Admin Dashboard</h2>
        <p className="text-secondary text-sm">
          Overview of JalaSetu operations, user management, and analytics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-secondary uppercase tracking-wide">Total Users</p>
          <p className="text-2xl font-bold text-primary mt-1">—</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-secondary uppercase tracking-wide">Active Orders</p>
          <p className="text-2xl font-bold text-primary mt-1">—</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-secondary uppercase tracking-wide">Online Providers</p>
          <p className="text-2xl font-bold text-primary mt-1">—</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-secondary uppercase tracking-wide">CO₂ Saved</p>
          <p className="text-2xl font-bold text-accent mt-1">—</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-primary mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <p className="text-secondary text-sm">No activity yet.</p>
        </div>
      </div>
    </div>
  );
}
