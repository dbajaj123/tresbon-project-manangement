import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { LayoutDashboard, CalendarDays, Receipt, GraduationCap, BarChart3, LogOut } from 'lucide-react';

const nav = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employee/scheduler', label: 'Schedule', icon: CalendarDays },
  { to: '/employee/expenses', label: 'Expenses', icon: Receipt },
  { to: '/employee/training', label: 'Training', icon: GraduationCap },
  { to: '/employee/reports', label: 'Reports', icon: BarChart3 },
];

export default function EmployeeLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-primary-900 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700">
          <h1 className="text-xl font-bold">Tresbon</h1>
          <p className="text-xs text-primary-300 mt-1">{user?.companyId?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-primary-200 hover:bg-primary-800'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-700">
          <div className="text-sm text-primary-300 mb-2">{user?.name}</div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-sm text-primary-300 hover:text-white">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8"><Outlet /></div>
      </main>
    </div>
  );
}