import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, Clock, Circle, Pencil, Trash2 } from 'lucide-react';
import { Modal, FormField, inputCls, selectCls, StatusBadge, Confirm } from '../../components/ui/index';
import api from '../../api/axios';

const statusIcon = { complete: CheckCircle2, in_progress: Clock, not_started: Circle };
const statusColor = { complete: 'text-green-500', in_progress: 'text-yellow-500', not_started: 'text-gray-300' };

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [standards, setStandards] = useState([]);
  const [stagesPool, setStagesPool] = useState([]);

  // Modals
  const [editClientModal, setEditClientModal] = useState(false);
  const [standardModal, setStandardModal] = useState(false);
  const [editStandardModal, setEditStandardModal] = useState(null); // cs object
  const [stageModal, setStageModal] = useState(null); // clientStandardId
  const [editStageModal, setEditStageModal] = useState(null); // stage object
  const [deleteStandardId, setDeleteStandardId] = useState(null);
  const [deleteStageId, setDeleteStageId] = useState(null);

  // Forms
  const [clientForm, setClientForm] = useState({});
  const [stdForm, setStdForm] = useState({ standardId: '', contractStartDate: '', targetEndDate: '' });
  const [editStdForm, setEditStdForm] = useState({});
  const [selectedStages, setSelectedStages] = useState([]);
  const [editStageForm, setEditStageForm] = useState({ allottedManDays: 1, status: 'not_started' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [clientRes, standardsRes, stagesRes] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get('/standards'),
      api.get('/stages'),
    ]);
    setClient(clientRes.data);
    setStandards(standardsRes.data);
    setStagesPool(stagesRes.data);
  };
  useEffect(() => { load(); }, [id]);

  // Edit client
  const openEditClient = () => {
    setClientForm({ name: client.name, contactPerson: client.contactPerson || '', email: client.email || '', phone: client.phone || '', address: client.address || '' });
    setEditClientModal(true);
  };
  const saveClient = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${id}`, clientForm);
      setEditClientModal(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // Assign standard
  const assignStandard = async () => {
    setSaving(true);
    try {
      await api.post(`/clients/${id}/standards`, stdForm);
      setStandardModal(false);
      setStdForm({ standardId: '', contractStartDate: '', targetEndDate: '' });
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // Edit standard dates
  const saveStandard = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/${id}/standards/${editStandardModal._id}`, editStdForm);
      setEditStandardModal(null);
      load();
    } catch (err) {
      // fallback: update status only via existing endpoint
      try {
        await api.put(`/clients/stages/${editStandardModal._id}`, editStdForm);
        setEditStandardModal(null);
        load();
      } catch { alert('Error updating standard'); }
    }
    finally { setSaving(false); }
  };

  // Assign stages
  const assignStages = async () => {
    setSaving(true);
    try {
      await api.post(`/clients/${id}/stages`, {
        clientStandardId: stageModal,
        stages: selectedStages.map(s => ({ stageId: s.id, allottedManDays: s.days })),
      });
      setStageModal(null);
      setSelectedStages([]);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // Edit stage
  const saveStage = async () => {
    setSaving(true);
    try {
      await api.put(`/clients/stages/${editStageModal._id}`, editStageForm);
      setEditStageModal(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // Delete stage
  const deleteStage = async () => {
    try {
      await api.delete(`/clients/stages/${deleteStageId}`);
      setDeleteStageId(null);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  // Quick status update
  const updateStageStatus = async (stageId, status) => {
    await api.put(`/clients/stages/${stageId}`, { status });
    load();
  };

  if (!client) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  const assignedStandardIds = client.standards?.map(s => s.standardId?._id) || [];
  const availableStandards = standards.filter(s => !assignedStandardIds.includes(s._id));

  return (
    <div>
      <button onClick={() => navigate('/admin/clients')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      {/* Client Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {client.contactPerson && `${client.contactPerson}`}
              {client.email && ` • ${client.email}`}
              {client.phone && ` • ${client.phone}`}
            </p>
            {client.address && <p className="text-sm text-gray-400 mt-1">{client.address}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={client.status} />
            <button onClick={openEditClient}
              className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <Pencil size={14} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Standards header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Standards & Stages</h2>
        {availableStandards.length > 0 && (
          <button onClick={() => setStandardModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-700">
            <Plus size={14} /> Assign Standard
          </button>
        )}
      </div>

      {client.standards?.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          No standards assigned yet
        </div>
      )}

      <div className="space-y-4">
        {client.standards?.map(cs => {
          // Each standard tracks its own stages independently
          const totalDays = cs.stages?.reduce((a, s) => a + s.allottedManDays, 0) || 0;
          const complete = cs.stages?.filter(s => s.status === 'complete').length || 0;
          const pct = cs.stages?.length ? Math.round((complete / cs.stages.length) * 100) : 0;

          return (
            <div key={cs._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              {/* Standard header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base">{cs.standardId?.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cs.contractStartDate && `Start: ${new Date(cs.contractStartDate).toLocaleDateString()}`}
                    {cs.targetEndDate && ` • Target: ${new Date(cs.targetEndDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <div className="text-sm font-medium">{pct}%</div>
                    <div className="text-xs text-gray-400">{totalDays} days allotted</div>
                  </div>
                  <button onClick={() => { setStageModal(cs._id); setSelectedStages([]); }}
                    className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                    <Plus size={12} /> Add Stages
                  </button>
                  <button onClick={() => { setEditStandardModal(cs); setEditStdForm({ contractStartDate: cs.contractStartDate?.split('T')[0] || '', targetEndDate: cs.targetEndDate?.split('T')[0] || '', status: cs.status }); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>

              {/* Stages — isolated per standard */}
              <div className="divide-y divide-gray-50">
                {cs.stages?.map(s => {
                  const Icon = statusIcon[s.status] || Circle;
                  return (
                    <div key={s._id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={statusColor[s.status]} />
                        <span className="text-sm font-medium">{s.stageId?.name}</span>
                        <span className="text-xs text-gray-400">{s.allottedManDays} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={s.status}
                          onChange={e => updateStageStatus(s._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1">
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
                        <button onClick={() => { setEditStageModal(s); setEditStageForm({ allottedManDays: s.allottedManDays, status: s.status }); }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteStageId(s._id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {cs.stages?.length === 0 && <p className="text-xs text-gray-400 py-2">No stages added yet</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Client Modal */}
      <Modal open={editClientModal} onClose={() => setEditClientModal(false)} title="Edit Client">
        <div className="space-y-4">
          <FormField label="Client Name" required>
            <input value={clientForm.name || ''} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Contact Person">
            <input value={clientForm.contactPerson || ''} onChange={e => setClientForm({ ...clientForm, contactPerson: e.target.value })} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <input type="email" value={clientForm.email || ''} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Phone">
              <input value={clientForm.phone || ''} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Address">
            <textarea value={clientForm.address || ''} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} rows={2} className={inputCls} />
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditClientModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={saveClient} disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Standard Modal */}
      <Modal open={standardModal} onClose={() => setStandardModal(false)} title="Assign Standard">
        <div className="space-y-4">
          <FormField label="Standard" required>
            <select value={stdForm.standardId} onChange={e => setStdForm({ ...stdForm, standardId: e.target.value })} className={selectCls}>
              <option value="">Select standard...</option>
              {availableStandards.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contract Start">
              <input type="date" value={stdForm.contractStartDate} onChange={e => setStdForm({ ...stdForm, contractStartDate: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Target End">
              <input type="date" value={stdForm.targetEndDate} onChange={e => setStdForm({ ...stdForm, targetEndDate: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setStandardModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={assignStandard} disabled={saving || !stdForm.standardId}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Standard Modal */}
      <Modal open={!!editStandardModal} onClose={() => setEditStandardModal(null)} title="Edit Standard">
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {editStandardModal?.standardId?.name}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contract Start">
              <input type="date" value={editStdForm.contractStartDate || ''} onChange={e => setEditStdForm({ ...editStdForm, contractStartDate: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Target End">
              <input type="date" value={editStdForm.targetEndDate || ''} onChange={e => setEditStdForm({ ...editStdForm, targetEndDate: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          <FormField label="Status">
            <select value={editStdForm.status || 'not_started'} onChange={e => setEditStdForm({ ...editStdForm, status: e.target.value })} className={selectCls}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditStandardModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={saveStandard} disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Stages Modal */}
      <Modal open={!!stageModal} onClose={() => setStageModal(null)} title="Add Stages" size="lg">
        <div className="space-y-3 mb-4">
          {stagesPool.map(stage => {
            const existing = selectedStages.find(s => s.id === stage._id);
            return (
              <div key={stage._id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                <input type="checkbox" checked={!!existing}
                  onChange={e => {
                    if (e.target.checked) setSelectedStages([...selectedStages, { id: stage._id, days: stage.defaultManDays }]);
                    else setSelectedStages(selectedStages.filter(s => s.id !== stage._id));
                  }} className="rounded" />
                <span className="flex-1 text-sm">{stage.name}</span>
                {existing && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Man Days:</span>
                    <input type="number" min={1} value={existing.days}
                      onChange={e => setSelectedStages(selectedStages.map(s => s.id === stage._id ? { ...s, days: +e.target.value } : s))}
                      className="w-16 border border-gray-200 rounded px-2 py-1 text-xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 border-t pt-4">
          <button onClick={() => setStageModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
          <button onClick={assignStages} disabled={saving || selectedStages.length === 0}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Saving...' : `Add ${selectedStages.length} Stage(s)`}
          </button>
        </div>
      </Modal>

      {/* Edit Stage Modal */}
      <Modal open={!!editStageModal} onClose={() => setEditStageModal(null)} title="Edit Stage" size="sm">
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {editStageModal?.stageId?.name}
          </div>
          <FormField label="Allotted Man Days">
            <input type="number" min={1} value={editStageForm.allottedManDays}
              onChange={e => setEditStageForm({ ...editStageForm, allottedManDays: +e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="Status">
            <select value={editStageForm.status} onChange={e => setEditStageForm({ ...editStageForm, status: e.target.value })} className={selectCls}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditStageModal(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={saveStage} disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Confirm open={!!deleteStageId} message="Delete this stage assignment?" onConfirm={deleteStage} onCancel={() => setDeleteStageId(null)} />
    </div>
  );
}