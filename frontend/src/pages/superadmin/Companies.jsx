import { useEffect, useState } from 'react';
import { Plus, Pencil, PowerOff } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, StatusBadge, Confirm } from '../../components/ui/index';
import api from '../../api/axios';

const emptyForm = { name: '', email: '', phone: '', address: '', adminName: '', adminEmail: '', adminPassword: '' };

export default function SACompanies() {
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({});
  const [toggleId, setToggleId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { const { data } = await api.get('/companies'); setCompanies(data); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/companies', form);
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/companies/${editModal._id}`, editForm);
      setEditModal(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    await api.patch(`/companies/${toggleId}/toggle-status`);
    setToggleId(null);
    load();
  };

  const company = companies.find(c => c._id === toggleId);

  return (
    <div>
      <PageHeader title="Companies" subtitle="Manage tenant accounts"
        action={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={16} /> New Company
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Company', 'Email', 'Phone', 'Employees', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {companies.map(c => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{c.employeeCount}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-gray-600">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditModal(c); setEditForm({ name: c.name, email: c.email, phone: c.phone || '', address: c.address || '' }); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setToggleId(c._id)}
                      className={`p-1.5 rounded ${c.status === 'active' ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}>
                      <PowerOff size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No companies yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Company" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-medium border-b pb-2">Company Details</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company Name" required>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Company Email" required>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Phone">
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Address">
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <p className="text-sm text-gray-500 font-medium border-b pb-2 pt-2">Admin Account</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Admin Name" required>
              <input value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Admin Email" required>
              <input type="email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Admin Password" required>
              <input type="password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleCreate}
              disabled={saving || !form.name || !form.email || !form.adminName || !form.adminEmail || !form.adminPassword}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Company">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} /></FormField>
            <FormField label="Email"><input value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} /></FormField>
            <FormField label="Phone"><input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} /></FormField>
            <FormField label="Address"><input value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={inputCls} /></FormField>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleEdit} disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!toggleId}
        message={`${company?.status === 'active' ? 'Deactivate' : 'Activate'} "${company?.name}"?`}
        onConfirm={handleToggle}
        onCancel={() => setToggleId(null)}
      />
    </div>
  );
}
