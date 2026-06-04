import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, Confirm } from '../../components/ui/index';
import api from '../../api/axios';

export default function Stages() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', defaultManDays: 1 });
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { const { data } = await api.get('/stages'); setItems(data); };
  useEffect(() => { load(); }, []);

  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, defaultManDays: item.defaultManDays }); setModal(true); };
  const openNew = () => { setEditing(null); setForm({ name: '', defaultManDays: 1 }); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await api.put(`/stages/${editing._id}`, form);
      else await api.post('/stages', form);
      setModal(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Stages Pool" subtitle="Manage available audit stages"
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
            <Plus size={16} /> Add Stage
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stage Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Default Man Days</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-gray-600">{item.defaultManDays} days</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(item._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No stages yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Stage' : 'Add Stage'}>
        <div className="space-y-4">
          <FormField label="Stage Name" required>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Default Man Days">
            <input type="number" min={1} value={form.defaultManDays} onChange={e => setForm({ ...form, defaultManDays: +e.target.value })} className={inputCls} />
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Confirm open={!!deleteId} message="Delete this stage?" onConfirm={async () => { await api.delete(`/stages/${deleteId}`); setDeleteId(null); load(); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
