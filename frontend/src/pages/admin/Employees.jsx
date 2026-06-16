import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Pencil } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

const PRESET_COLORS = [
  '#2563eb','#16a34a','#dc2626','#9333ea','#ea580c',
  '#0891b2','#65a30d','#db2777','#d97706','#0f766e',
  '#7c3aed','#b45309','#0369a1','#15803d','#be185d',
];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', designation: '', dateOfJoining: '', qualifications: '', color: '#2563eb' });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get('/users?role=employee');
    setEmployees(data);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/users', { ...form, role: 'employee' });
      setModal(false);
      setForm({ name: '', email: '', password: '', designation: '', dateOfJoining: '', qualifications: '', color: '#2563eb' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${editModal._id}`, editForm);
      setEditModal(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    await api.patch(`/users/${id}/toggle-status`);
    load();
  };

  const ColorPicker = ({ value, onChange }) => (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-all ${value === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
        <span className="text-xs text-gray-400">Custom colour</span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Employees" subtitle="Manage your team"
        action={
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus size={16} /> Add Employee
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['', 'Name', 'Email', 'Designation', 'Date of Joining', 'Status', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map(e => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: e.color || '#2563eb' }} />
                </td>
                <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => navigate(`/admin/employees/${e._id}`)}>{e.name}</td>
                <td className="px-4 py-3 text-gray-600">{e.email}</td>
                <td className="px-4 py-3 text-gray-600">{e.designation || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditModal(e); setEditForm({ name: e.name, designation: e.designation || '', dateOfJoining: e.dateOfJoining?.split('T')[0] || '', qualifications: e.qualifications || '', color: e.color || '#2563eb' }); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleToggle(e._id)}
                      className={`text-xs px-2 py-1 rounded ${e.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {e.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => navigate(`/admin/employees/${e._id}`)} className="text-gray-400">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No employees yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Employee" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Email" required>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Password" required>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Designation">
              <input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date of Joining">
              <input type="date" value={form.dateOfJoining} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Qualifications">
              <input value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Calendar Colour">
            <ColorPicker value={form.color} onChange={c => setForm({ ...form, color: c })} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.email || !form.password}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Employee" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Designation">
              <input value={editForm.designation || ''} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date of Joining">
              <input type="date" value={editForm.dateOfJoining || ''} onChange={e => setEditForm({ ...editForm, dateOfJoining: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Qualifications">
              <input value={editForm.qualifications || ''} onChange={e => setEditForm({ ...editForm, qualifications: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Calendar Colour">
            <ColorPicker value={editForm.color || '#2563eb'} onChange={c => setEditForm({ ...editForm, color: c })} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleEdit} disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}