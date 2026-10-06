export default function TaxiDashboard() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-medium text-primary mb-2">Taxi Dashboard</h2>
        <p className="text-secondary text-sm">
          Accept pickup and delivery jobs connecting cargo to Kerala&apos;s jetties.
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-primary">Online Status</h3>
          <button className="btn btn-secondary text-sm">
            🔴 Go Online
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-medium text-primary mb-4">Active Jobs</h3>
        <div className="text-center py-8">
          <p className="text-secondary text-sm">No active jobs.</p>
        </div>
      </div>
    </div>
  );
}
