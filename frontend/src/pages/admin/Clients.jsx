import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, Trash2 } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, StatusBadge, Confirm } from '../../components/ui/index';
import api from '../../api/axios';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get('/clients');
    setClients(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/clients', form);
      setModal(false);
      setForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/clients/${deleteId}`);
      setDeleteId(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const clientToDelete = clients.find(c => c._id === deleteId);

  return (
    <div>
      <PageHeader title="Clients" subtitle="Manage your client accounts"
        action={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={16} /> Add Client
          </button>
        }
      />

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Contact Person', 'Email', 'Phone', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => navigate(`/admin/clients/${c._id}`)}>{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.contactPerson || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/admin/clients/${c._id}`)} className="text-gray-400 hover:text-gray-600">
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setDeleteId(c._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No clients found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Client">
        <div className="space-y-4">
          <FormField label="Client Name" required>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Contact Person">
            <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Phone">
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Address">
            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputCls} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!deleteId}
        message={`Delete "${clientToDelete?.name}"? This will also remove all standards, stages and scheduler entries for this client.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}