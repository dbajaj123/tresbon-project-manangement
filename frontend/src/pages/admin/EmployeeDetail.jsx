import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, GraduationCap } from 'lucide-react';
import { Modal, FormField, inputCls, StatusBadge } from '../../components/ui/index';
import api from '../../api/axios';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [trainingModal, setTrainingModal] = useState(false);
  const [form, setForm] = useState({ subject: '', duration: '', date: '', trainerName: '', certificateIssued: false, expiryDate: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [empRes, trainRes] = await Promise.all([
      api.get(`/users/${id}`),
      api.get(`/training?employeeId=${id}`),
    ]);
    setEmployee(empRes.data);
    setTrainings(trainRes.data);
  };
  useEffect(() => { load(); }, [id]);

  const handleToggle = async () => {
    await api.patch(`/users/${id}/toggle-status`);
    load();
  };

  const addTraining = async () => {
    setSaving(true);
    try {
      await api.post('/training', { ...form, employeeId: id });
      setTrainingModal(false);
      setForm({ subject: '', duration: '', date: '', trainerName: '', certificateIssued: false, expiryDate: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  if (!employee) return <div className="py-20 text-center text-gray-400">Loading...</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/employees')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} /> Back to Employees
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{employee.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{employee.designation || 'No designation'} • {employee.email}</p>
            {employee.dateOfJoining && (
              <p className="text-gray-400 text-xs mt-1">Joined: {new Date(employee.dateOfJoining).toLocaleDateString()}</p>
            )}
            {employee.qualifications && (
              <p className="text-gray-400 text-xs mt-1">Qualifications: {employee.qualifications}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={employee.status} />
            <button onClick={handleToggle}
              className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              {employee.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Training Records */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap size={20} /> Training Records
        </h2>
        <button onClick={() => setTrainingModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-700">
          <Plus size={14} /> Add Training
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Subject', 'Date', 'Duration', 'Trainer', 'Certificate', 'Expiry'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trainings.map(t => (
              <tr key={t._id}>
                <td className="px-4 py-3 font-medium">{t.subject}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-600">{t.duration || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{t.trainerName || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${t.certificateIssued ? 'text-green-600' : 'text-gray-400'}`}>
                    {t.certificateIssued ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {trainings.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No training records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={trainingModal} onClose={() => setTrainingModal(false)} title="Add Training Record">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Subject" required>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration">
              <input placeholder="e.g. 2 days" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Trainer Name">
              <input value={form.trainerName} onChange={e => setForm({ ...form, trainerName: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Certificate Issued">
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.certificateIssued}
                  onChange={e => setForm({ ...form, certificateIssued: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-600">Certificate issued</span>
              </div>
            </FormField>
            {form.certificateIssued && (
              <FormField label="Expiry Date">
                <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} />
              </FormField>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setTrainingModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={addTraining} disabled={saving || !form.subject || !form.date}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
