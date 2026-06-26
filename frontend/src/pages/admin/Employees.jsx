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

const emptyForm = { name: '', email: '', password: '', designation: '', dateOfJoining: '', dateOfLeaving: '', qualifications: '', color: '#2563eb' };

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-full border-2 transition-all ${value === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
        <span className="text-xs text-gray-400">Custom colour</span>
        <div className="w-6 h-6 rounded-full border border-gray-200 ml-1" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [leftEmployees, setLeftEmployees] = useState([]);
  const [showLeft, setShowLeft] = useState(false);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const [active, all] = await Promise.all([
      api.get('/users?role=employee'),
      api.get('/users?role=employee&includeLeft=true'),
    ]);
    setEmployees(active.data);
    // Left = in all but not in active
    const activeIds = new Set(active.data.map(e => e._id));
    setLeftEmployees(all.data.filter(e => !activeIds.has(e._id)));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/users', { ...form, role: 'employee' });
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      // Don't send an empty password field (would otherwise blank/rehash nothing)
      const payload = { ...editForm };
      if (!payload.password || !payload.password.trim()) delete payload.password;
      await api.put(`/users/${editModal._id}`, payload);
      setEditModal(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const EmployeeRow = ({ e, showEdit = true }) => (
    <tr key={e._id} className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: e.color || '#2563eb' }} />
      </td>
      <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => navigate(`/admin/employees/${e._id}`)}>{e.name}</td>
      <td className="px-4 py-3 text-gray-600">{e.email}</td>
      <td className="px-4 py-3 text-gray-600">{e.designation || '-'}</td>
      <td className="px-4 py-3 text-gray-600">{e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : '-'}</td>
      <td className="px-4 py-3 text-gray-600">
        {e.dateOfLeaving
          ? <span className="text-xs font-medium text-red-500">{new Date(e.dateOfLeaving).toLocaleDateString()}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
      <td className="px-4 py-3">
        {showEdit && (
          <div className="flex gap-2 items-center">
            <button onClick={() => {
              setEditModal(e);
              setEditForm({
                name: e.name, designation: e.designation || '',
                dateOfJoining: e.dateOfJoining?.split('T')[0] || '',
                dateOfLeaving: e.dateOfLeaving?.split('T')[0] || '',
                qualifications: e.qualifications || '',
                color: e.color || '#2563eb',
              });
            }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Pencil size={14} />
            </button>
            <button onClick={() => navigate(`/admin/employees/${e._id}`)} className="text-gray-400">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  const tableHead = (
    <thead className="bg-gray-50 border-b">
      <tr>
        {['', 'Name', 'Email', 'Designation', 'Date of Joining', 'Date of Leaving', 'Status', ''].map((h, i) => (
          <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
        ))}
      </tr>
    </thead>
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

      {/* Active employees */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-medium">Active Employees ({employees.length})</span>
        </div>
        <table className="w-full text-sm">
          {tableHead}
          <tbody className="divide-y divide-gray-50">
            {employees.map(e => <EmployeeRow key={e._id} e={e} />)}
            {employees.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No active employees</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Left employees toggle */}
      {leftEmployees.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => setShowLeft(!showLeft)}
            className="w-full px-5 py-3 border-b bg-gray-50 flex items-center justify-between text-sm font-medium text-gray-500 hover:bg-gray-100">
            <span>Former Employees ({leftEmployees.length})</span>
            <span>{showLeft ? '▲' : '▼'}</span>
          </button>
          {showLeft && (
            <table className="w-full text-sm">
              {tableHead}
              <tbody className="divide-y divide-gray-50">
                {leftEmployees.map(e => <EmployeeRow key={e._id} e={e} />)}
              </tbody>
            </table>
          )}
        </div>
      )}

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
            <FormField label="Date of Leaving">
              <input type="date" value={form.dateOfLeaving} onChange={e => setForm({ ...form, dateOfLeaving: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Qualifications">
            <input value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} className={inputCls} />
          </FormField>
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
            <FormField label="Date of Leaving">
              <input type="date" value={editForm.dateOfLeaving || ''} onChange={e => setEditForm({ ...editForm, dateOfLeaving: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Qualifications">
            <input value={editForm.qualifications || ''} onChange={e => setEditForm({ ...editForm, qualifications: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Calendar Colour">
            <ColorPicker value={editForm.color || '#2563eb'} onChange={c => setEditForm({ ...editForm, color: c })} />
          </FormField>
          <div className="border-t border-gray-100 pt-4">
            <FormField label="Reset Password">
              <input type="password" value={editForm.password || ''} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                className={inputCls} placeholder="Leave blank to keep current password" autoComplete="new-password" />
            </FormField>
            <p className="text-xs text-gray-400 mt-1">Enter a new password only if you want to change it for this employee.</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
            Setting a past date of leaving will automatically mark this employee as inactive and exclude them from reports and scheduler.
          </div>
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