import { useState, useEffect } from 'react';
import api from '../api/client';
import KioskHealthOverview from '../components/KioskHealthOverview';

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${color}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data.stats));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">System Overview</h2>
      <KioskHealthOverview />
      {!stats ? (
        <p className="text-gray-500 mb-6">Loading statistics…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard label="Total Patients" value={stats.totalPatients} color="border-l-4 border-l-blue-500" />
          <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} color="border-l-4 border-l-green-500" />
          <StatCard label="Total Kiosks" value={stats.totalKiosks} color="border-l-4 border-l-purple-500" />
          <StatCard label="Online Kiosks" value={stats.onlineKiosks} color="border-l-4 border-l-emerald-500" />
          <StatCard label="Total Measurements" value={stats.totalMeasurements} color="border-l-4 border-l-orange-500" />
          <StatCard label="Registered Hospitals" value={stats.totalHospitals} color="border-l-4 border-l-pink-500" />
        </div>
      )}
    </div>
  );
}
