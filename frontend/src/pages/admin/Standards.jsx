import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, Confirm } from '../../components/ui/index';
import api from '../../api/axios';

export default function Standards() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => { const { data } = await api.get('/standards'); setItems(data); };
  useEffect(() => { load(); }, []);

  const openEdit = (item) => { setEditing(item); setForm({ name: item.name, description: item.description || '' }); setModal(true); };
  const openNew = () => { setEditing(null); setForm({ name: '', description: '' }); setModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) await api.put(`/standards/${editing._id}`, form);
      else await api.post('/standards', form);
      setModal(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await api.delete(`/standards/${deleteId}`);
    setDeleteId(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Standards Pool" subtitle="Manage available standards"
        action={
          <button onClick={openNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
            <Plus size={16} /> Add Standard
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(item._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            No standards yet. Add your first standard.
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Standard' : 'Add Standard'}>
        <div className="space-y-4">
          <FormField label="Name" required>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Description">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} />
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

      <Confirm open={!!deleteId} message="Delete this standard?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
