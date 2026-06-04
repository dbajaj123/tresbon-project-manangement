import { useEffect, useState } from 'react';
import { Plus, Paperclip } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, selectCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

const TYPES = ['travel', 'local_travel', 'food', 'accommodation', 'other'];

export default function EmpExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: '', type: 'travel', amount: '', clientId: '', description: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { const { data } = await api.get('/expenses'); setExpenses(data); };
  useEffect(() => {
    load();
    api.get('/clients').then(r => setClients(r.data.filter(c => c.status === 'active')));
  }, []);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (file) fd.append('bill', file);
      await api.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModal(false);
      setForm({ date: '', type: 'travel', amount: '', clientId: '', description: '' });
      setFile(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const approved = expenses.filter(e => e.status === 'approved').reduce((a, e) => a + e.amount, 0);
  const pending = expenses.filter(e => e.status === 'pending').reduce((a, e) => a + e.amount, 0);

  return (
    <div>
      <PageHeader title="My Expenses" subtitle="Submit and track your expenses"
        action={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={16} /> Submit Expense
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Submitted', value: total, color: 'bg-gray-50' },
          { label: 'Approved', value: approved, color: 'bg-green-50' },
          { label: 'Pending', value: pending, color: 'bg-yellow-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 border border-gray-100`}>
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className="text-lg font-bold">₹{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date', 'Type', 'Amount', 'Client', 'Description', 'Bill', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {expenses.map(e => (
              <tr key={e._id}>
                <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 capitalize">{e.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-medium">₹{e.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{e.clientId?.name || '-'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{e.description || '-'}</td>
                <td className="px-4 py-3">
                  {e.billAttachment
                    ? <a href={`/uploads/${e.billAttachment}`} target="_blank" rel="noreferrer" className="text-primary-600 flex items-center gap-1"><Paperclip size={14} /> View</a>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                  {e.status === 'rejected' && e.rejectionReason && (
                    <p className="text-xs text-red-400 mt-0.5">{e.rejectionReason}</p>
                  )}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No expenses submitted yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Submit Expense">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Type" required>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={selectCls}>
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (₹)" required>
              <input type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Client (optional)">
              <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className={selectCls}>
                <option value="">No client</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Description">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Bill Attachment (PDF/Image)">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !form.date || !form.amount}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
