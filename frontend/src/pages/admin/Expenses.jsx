import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Paperclip } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, selectCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

const TYPES = ['travel', 'local_travel', 'food', 'accommodation', 'other'];

export default function ExpensesAdmin() {
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ employeeId: '', clientId: '', status: '', startDate: '', endDate: '' });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const { data } = await api.get(`/expenses?${params}`);
    setExpenses(data);
  };

  useEffect(() => {
    api.get('/users?role=employee').then(r => setEmployees(r.data));
    api.get('/clients').then(r => setClients(r.data));
  }, []);

  useEffect(() => { load(); }, [filters]);

  const handleAction = async (id, action, reason) => {
    await api.patch(`/expenses/${id}/action`, { action, rejectionReason: reason });
    load();
  };

  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Review and approve employee expenses" />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <select value={filters.employeeId} onChange={e => setFilters({ ...filters, employeeId: e.target.value })} className={selectCls}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select value={filters.clientId} onChange={e => setFilters({ ...filters, clientId: e.target.value })} className={selectCls}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={selectCls}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className={inputCls} placeholder="From" />
        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className={inputCls} placeholder="To" />
      </div>

      {/* Summary */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-primary-700">{expenses.length} expense(s) found</span>
        <span className="font-semibold text-primary-900">Total: ₹{total.toLocaleString()}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date', 'Employee', 'Client', 'Type', 'Amount', 'Description', 'Bill', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map(e => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{e.employeeId?.name}</td>
                <td className="px-4 py-3 text-gray-600">{e.clientId?.name || '-'}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{e.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-medium">₹{e.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description || '-'}</td>
                <td className="px-4 py-3">
                  {e.billAttachment ? (
                    <a href={`/uploads/${e.billAttachment}`} target="_blank" rel="noreferrer"
                      className="text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      <Paperclip size={14} /> View
                    </a>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3">
                  {e.status === 'pending' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(e._id, 'approve')}
                        className="p-1.5 text-green-500 hover:bg-green-50 rounded" title="Approve">
                        <CheckCircle2 size={16} />
                      </button>
                      <button onClick={() => { setRejectModal(e._id); setRejectReason(''); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Reject">
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                  {e.status === 'rejected' && e.rejectionReason && (
                    <span className="text-xs text-gray-400">{e.rejectionReason}</span>
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Expense" size="sm">
        <div className="space-y-4">
          <FormField label="Reason for rejection">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className={inputCls} placeholder="Optional reason..." />
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={() => { handleAction(rejectModal, 'reject', rejectReason); setRejectModal(null); }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
