import { useState } from 'react';
import { Download } from 'lucide-react';
import { FormField, inputCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

export default function EmpReports() {
  const [tab, setTab] = useState('work');
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setData(null);
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const endpoint = tab === 'work' ? '/reports/employee' : '/reports/expenses';
      const { data: res } = await api.get(`${endpoint}?${params}`);
      setData(res);
    } catch (err) { alert('Error generating report'); }
    finally { setLoading(false); }
  };

  const exportPDF = async () => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
    const endpoint = tab === 'work' ? '/reports/employee/pdf' : '/reports/expenses/pdf';
    const res = await api.get(`${endpoint}?${params}`, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href; a.download = tab === 'work' ? 'my-report.pdf' : 'my-expenses.pdf';
    a.click(); URL.revokeObjectURL(href);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Reports</h1>

      <div className="flex gap-2 mb-6">
        {[{ id: 'work', label: 'Work Report' }, { id: 'expense', label: 'Expense Report' }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setData(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField label="From Date">
            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="To Date">
            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className={inputCls} />
          </FormField>
        </div>
        <div className="flex gap-3">
          <button onClick={generate} disabled={loading}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate'}
          </button>
          {data && (
            <button onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <Download size={14} /> Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Work report */}
      {data && tab === 'work' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-2xl font-bold text-primary-600 mb-1">{data.totalDays}</div>
            <div className="text-sm text-gray-500">Total Days Worked</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b font-medium">Work Summary</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Stage</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.summary?.map((s, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{s.client}</td>
                    <td className="px-4 py-3">{s.stage}</td>
                    <td className="px-4 py-3 font-medium">{s.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense report */}
      {data && tab === 'expense' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="text-2xl font-bold text-primary-600 mb-1">₹{data.total?.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Expenses</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Type', 'Amount', 'Client', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.expenses?.map(e => (
                  <tr key={e._id}>
                    <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 capitalize">{e.type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 font-medium">₹{e.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{e.clientId?.name || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}