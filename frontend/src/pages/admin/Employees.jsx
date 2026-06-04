import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { PageHeader, Modal, FormField, inputCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', designation: '', dateOfJoining: '', qualifications: '' });
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
      setForm({ name: '', email: '', password: '', designation: '', dateOfJoining: '', qualifications: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

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
              {['Name', 'Email', 'Designation', 'Date of Joining', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map(e => (
              <tr key={e._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/employees/${e._id}`)}>
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 text-gray-600">{e.email}</td>
                <td className="px-4 py-3 text-gray-600">{e.designation || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-gray-400"><ChevronRight size={16} /></td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No employees yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Employee">
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
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.email || !form.password}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
