import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageTransition from './PageTransition';

const links = [
  { to: '/', label: 'Appointments' },
  { to: '/patients', label: 'Patients' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-emerald-800 text-white flex flex-col">
        <div className="p-6 border-b border-emerald-700">
          <h1 className="text-lg font-bold">Hospital Dashboard</h1>
          <p className="text-sm text-emerald-300 mt-1">Smart Health Kiosk</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-emerald-200 hover:bg-emerald-700'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-emerald-700">
          <p className="text-sm text-emerald-300 mb-2">{user?.name}</p>
          <button onClick={logout} className="text-sm text-red-300 hover:text-red-200">Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <PageTransition />
      </main>
    </div>
  );
}
