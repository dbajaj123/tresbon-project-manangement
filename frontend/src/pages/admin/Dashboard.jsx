import { useEffect, useState } from 'react';
import { Building2, Users, CalendarDays, Receipt } from 'lucide-react';
import { StatCard } from '../../components/ui/index';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, employees: 0, todayEntries: 0, pendingExpenses: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [clients, employees, scheduler, expenses] = await Promise.all([
          api.get('/clients'),
          api.get('/users?role=employee'),
          api.get(`/scheduler?startDate=${today}&endDate=${today}`),
          api.get('/expenses?status=pending'),
        ]);
        setStats({
          clients: clients.data.filter(c => c.status === 'active').length,
          employees: employees.data.length,
          todayEntries: scheduler.data.length,
          pendingExpenses: expenses.data.length,
        });
      } catch {}
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Clients" value={stats.clients} icon={Building2} color="blue" />
        <StatCard title="Employees" value={stats.employees} icon={Users} color="green" />
        <StatCard title="Today's Schedule" value={stats.todayEntries} icon={CalendarDays} color="yellow" />
        <StatCard title="Pending Expenses" value={stats.pendingExpenses} icon={Receipt} color="purple" />
      </div>
    </div>
  );
}
