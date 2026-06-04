import { useState, useEffect } from 'react';
import { Download, BarChart3, FileText, Receipt } from 'lucide-react';
import { FormField, selectCls, inputCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

const tabs = [
  { id: 'client', label: 'Client Report', icon: BarChart3 },
  { id: 'employee', label: 'Employee Report', icon: FileText },
  { id: 'expense', label: 'Expense Report', icon: Receipt },
];

async function downloadBlob(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

function getMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    months.push({ label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), start, end: endStr });
  }
  return months;
}

const MONTH_OPTIONS = getMonthOptions();

export default function Reports() {
  const [tab, setTab] = useState('client');
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ clientId: '', employeeId: '', startDate: '', endDate: '', status: '' });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data));
    api.get('/users?role=employee').then(r => setEmployees(r.data));
  }, []);

  const handleMonthSelect = (val) => {
    setSelectedMonth(val);
    if (!val) {
      setFilters(f => ({ ...f, startDate: '', endDate: '' }));
      return;
    }
    const m = MONTH_OPTIONS.find(m => m.label === val);
    if (m) setFilters(f => ({ ...f, startDate: m.start, endDate: m.end }));
  };

  const handleDateChange = (key, val) => {
    setSelectedMonth(''); // clear month selection if manual date entered
    setFilters(f => ({ ...f, [key]: val }));
  };

  const buildParams = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    return params.toString();
  };

  const generate = async () => {
    setLoading(true);
    setData(null);
    try {
      const endpoint = tab === 'client' ? '/reports/client' : tab === 'employee' ? '/reports/employee' : '/reports/expenses';
      const { data: res } = await api.get(`${endpoint}?${buildParams()}`);
      setData(res);
    } catch (err) {
      alert(err.response?.data?.message || 'Error generating report');
    } finally { setLoading(false); }
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const endpoint = tab === 'client' ? '/reports/client/pdf' : tab === 'employee' ? '/reports/employee/pdf' : '/reports/expenses/pdf';
      const name = tab === 'client' ? 'client-report.pdf' : tab === 'employee' ? 'employee-report.pdf' : 'expense-report.pdf';
      await downloadBlob(`${endpoint}?${buildParams()}`, name);
    } catch (err) { alert('Export failed: ' + (err.response?.data?.message || err.message)); }
    finally { setExporting(''); }
  };

  const exportExcel = async () => {
    setExporting('excel');
    try {
      await downloadBlob(`/reports/expenses/excel?${buildParams()}`, 'expense-report.xlsx');
    } catch (err) { alert('Export failed'); }
    finally { setExporting(''); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setData(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">

        {/* Month quick select */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Quick Month Select</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleMonthSelect('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedMonth === '' && !filters.startDate ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              All Time
            </button>
            {MONTH_OPTIONS.map(m => (
              <button key={m.label} onClick={() => handleMonthSelect(m.label)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedMonth === m.label ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Filters</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {tab === 'client' && (
              <FormField label="Client">
                <select value={filters.clientId} onChange={e => setFilters({ ...filters, clientId: e.target.value })} className={selectCls}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </FormField>
            )}
            {tab === 'employee' && (
              <FormField label="Employee">
                <select value={filters.employeeId} onChange={e => setFilters({ ...filters, employeeId: e.target.value })} className={selectCls}>
                  <option value="">Select employee...</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </FormField>
            )}
            {tab === 'expense' && (<>
              <FormField label="Employee">
                <select value={filters.employeeId} onChange={e => setFilters({ ...filters, employeeId: e.target.value })} className={selectCls}>
                  <option value="">All Employees</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </FormField>
              <FormField label="Client">
                <select value={filters.clientId} onChange={e => setFilters({ ...filters, clientId: e.target.value })} className={selectCls}>
                  <option value="">All Clients</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={selectCls}>
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </FormField>
            </>)}
            <FormField label="From Date">
              <input type="date" value={filters.startDate} onChange={e => handleDateChange('startDate', e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="To Date">
              <input type="date" value={filters.endDate} onChange={e => handleDateChange('endDate', e.target.value)} className={inputCls} />
            </FormField>
          </div>

          {/* Active filter tags */}
          {(filters.startDate || filters.endDate || selectedMonth) && (
            <div className="flex items-center gap-2 mb-4 text-xs">
              <span className="text-gray-400">Active:</span>
              {selectedMonth && <span className="bg-primary-50 text-primary-700 px-2 py-1 rounded-full">{selectedMonth}</span>}
              {!selectedMonth && filters.startDate && <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{filters.startDate} → {filters.endDate}</span>}
              <button onClick={() => { setSelectedMonth(''); setFilters(f => ({ ...f, startDate: '', endDate: '' })); }}
                className="text-red-400 hover:text-red-600 ml-1">✕ Clear</button>
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={generate} disabled={loading}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {data && (<>
            <button onClick={exportPDF} disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              <Download size={14} /> {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
            {tab === 'expense' && (
              <button onClick={exportExcel} disabled={!!exporting}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                <Download size={14} /> {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
              </button>
            )}
          </>)}
        </div>
      </div>

      {data && tab === 'client' && <ClientReportView data={data} />}
      {data && tab === 'employee' && <EmployeeReportView data={data} />}
      {data && tab === 'expense' && <ExpenseReportView data={data} />}
    </div>
  );
}

function ClientReportView({ data }) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xl font-bold text-primary-900">{data.client?.name}</h2>
        <div className="flex gap-4 text-sm text-gray-500 mt-1 flex-wrap">
          {data.client?.contactPerson && <span>Contact: {data.client.contactPerson}</span>}
          {data.client?.email && <span>Email: {data.client.email}</span>}
          {data.client?.phone && <span>Phone: {data.client.phone}</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Days on Site', value: data.totalClientDays },
          { label: 'Standards Assigned', value: data.standards?.length },
          { label: 'Employees Assigned', value: data.employeeSummary?.length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-3xl font-bold text-primary-600">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      {data.employeeSummary?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold mb-3">Employees Working on this Client</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {data.employeeSummary.map((e, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  {e.designation && <div className="text-xs text-gray-400">{e.designation}</div>}
                </div>
                <div className="text-primary-600 font-semibold text-sm">{e.days}d</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.standards?.map((s, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-base text-primary-900">{s.standardName}</h3>
              <div className="flex gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                {s.contractStartDate && <span>Start: {new Date(s.contractStartDate).toLocaleDateString()}</span>}
                {s.targetEndDate && <span>Target: {new Date(s.targetEndDate).toLocaleDateString()}</span>}
              </div>
            </div>
            <StatusBadge status={s.status} />
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Completion', value: `${s.completionPercent}%` },
              { label: 'Days Allotted', value: s.totalAllotted },
              { label: 'Days Used', value: s.totalActual },
              { label: 'Remaining', value: s.remainingDays },
            ].map(st => (
              <div key={st.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-primary-700">{st.value}</div>
                <div className="text-xs text-gray-400">{st.label}</div>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${s.completionPercent}%` }} />
          </div>
          <div className="text-xs text-gray-400 mb-4">{s.stagesComplete}/{s.stagesTotal} stages complete — {s.stagesInProgress} in progress</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Stage', 'Allotted', 'Actual', 'Utilization', 'Status', 'Employees'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {s.stages?.map((st, j) => (
                <tr key={j} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{st.stageName}</td>
                  <td className="px-3 py-2 text-gray-600">{st.allottedManDays}d</td>
                  <td className="px-3 py-2 text-gray-600">{st.actualDays}d</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${st.utilization > 100 ? 'bg-red-500' : st.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(st.utilization, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{st.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={st.status} /></td>
                  <td className="px-3 py-2">
                    {st.employees?.length > 0
                      ? <span className="text-xs text-gray-500">{st.employees.map(e => `${e.name} (${e.days}d)`).join(', ')}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function EmployeeReportView({ data }) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xl font-bold text-primary-900">{data.employee?.name}</h2>
        <div className="flex gap-4 text-sm text-gray-500 mt-1 flex-wrap">
          {data.employee?.designation && <span>{data.employee.designation}</span>}
          {data.employee?.email && <span>{data.employee.email}</span>}
          {data.employee?.dateOfJoining && <span>Joined: {new Date(data.employee.dateOfJoining).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Days', value: data.totalDays, color: 'text-primary-600' },
          { label: 'Clients', value: data.clientSummary?.length, color: 'text-green-600' },
          { label: 'Approved Expenses', value: `₹${data.totalExpenses?.toLocaleString()}`, color: 'text-yellow-600' },
          { label: 'Trainings', value: data.trainings?.length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      {data.monthlyBreakdown?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold mb-4">Monthly Activity</h3>
          <div className="space-y-2">
            {data.monthlyBreakdown.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-500 text-right">{m.month}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="bg-primary-500 h-3 rounded-full"
                    style={{ width: `${data.totalDays > 0 ? (m.days / data.totalDays) * 100 : 0}%` }} />
                </div>
                <div className="w-16 text-sm font-medium text-primary-700">{m.days} days</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.clientSummary?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold mb-4">Work by Client</h3>
          <div className="space-y-4">
            {data.clientSummary.map((c, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-primary-900">{c.client}</span>
                  <span className="text-sm font-semibold text-primary-600">{c.totalDays} days</span>
                </div>
                <div className="space-y-1">
                  {c.stages.map((s, j) => (
                    <div key={j} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 w-40">{s.stage}</span>
                      <span className="font-medium w-12">{s.days}d</span>
                      <span className="text-xs text-gray-400 flex-1">{s.dates.slice(0, 6).join(', ')}{s.dates.length > 6 ? ` +${s.dates.length - 6} more` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.trainings?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b font-semibold">Training Records</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Subject', 'Date', 'Duration', 'Trainer', 'Certificate', 'Expiry'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.trainings.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{t.duration || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.trainerName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${t.certificateIssued ? 'text-green-600' : 'text-gray-400'}`}>
                      {t.certificateIssued ? '✓ Issued' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.expiryDate ? (
                      <span className={`text-xs ${new Date(t.expiryDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                        {new Date(t.expiryDate).toLocaleDateString()}
                        {new Date(t.expiryDate) < new Date() && ' ⚠ Expired'}
                      </span>
                    ) : '-'}
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

function ExpenseReportView({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Submitted', value: `₹${data.total?.toLocaleString()}`, color: 'text-gray-800' },
          { label: 'Approved', value: `₹${data.approved?.toLocaleString()}`, color: 'text-green-600' },
          { label: 'Pending', value: `₹${data.pending?.toLocaleString()}`, color: 'text-yellow-600' },
          { label: 'Transactions', value: data.expenses?.length, color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold mb-4">By Type</h3>
          <div className="space-y-3">
            {Object.entries(data.byType || {}).map(([type, amount]) => {
              const pct = data.total > 0 ? Math.round((amount / data.total) * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-600">{type.replace('_', ' ')}</span>
                    <span className="font-medium">₹{amount.toLocaleString()} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold mb-4">By Employee</h3>
          <div className="space-y-2">
            {data.byEmployee?.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{e.name}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary-700">₹{e.total.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{e.count} expense(s)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b font-semibold">All Transactions</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date', 'Employee', 'Client', 'Type', 'Amount', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.expenses?.map(e => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-4 py-3">{e.employeeId?.name}</td>
                <td className="px-4 py-3 text-gray-600">{e.clientId?.name || '-'}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{e.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-medium text-primary-700">₹{e.amount.toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}