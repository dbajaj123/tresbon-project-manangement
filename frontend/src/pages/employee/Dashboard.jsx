import { useEffect, useState } from 'react';
import { CalendarDays, Receipt } from 'lucide-react';
import { StatCard } from '../../components/ui/index';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export default function EmpDashboard() {
  const { user } = useAuthStore();
  const [weekEntries, setWeekEntries] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState(0);

  useEffect(() => {
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    api.get(`/scheduler?startDate=${start}&endDate=${end}&employeeId=${user._id}`)
      .then(r => setWeekEntries(r.data));
    api.get('/expenses?status=pending').then(r => setPendingExpenses(r.data.length));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome, {user?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{user?.designation}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard title="This Week's Assignments" value={weekEntries.length} icon={CalendarDays} color="blue" />
        <StatCard title="Pending Expenses" value={pendingExpenses} icon={Receipt} color="yellow" />
      </div>

      {/* This week schedule */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold mb-3">This Week's Schedule</h2>
        {weekEntries.length === 0 ? (
          <p className="text-sm text-gray-400">No assignments this week</p>
        ) : (
          <div className="space-y-2">
            {weekEntries.map(e => (
              <div key={e._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="w-16 text-xs text-gray-400 font-medium">{new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div className="flex-1">
                  <span className="font-medium">{e.clientId?.name}</span>
                  <span className="text-gray-400 mx-2">—</span>
                  <span className="text-gray-600">{e.stageId?.name}</span>
                </div>
                {e.notes && <span className="text-xs text-gray-400">{e.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
