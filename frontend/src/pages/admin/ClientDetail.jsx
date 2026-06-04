import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Modal, FormField, inputCls, selectCls, StatusBadge, Badge } from '../../components/ui/index';
import api from '../../api/axios';

const statusIcon = { complete: CheckCircle2, in_progress: Clock, not_started: Circle };
const statusColor = { complete: 'text-green-500', in_progress: 'text-yellow-500', not_started: 'text-gray-300' };

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [standards, setStandards] = useState([]);
  const [stagesPool, setStagesPool] = useState([]);
  const [standardModal, setStandardModal] = useState(false);
  const [stageModal, setStageModal] = useState(null); // clientStandardId
  const [stdForm, setStdForm] = useState({ standardId: '', contractStartDate: '', targetEndDate: '' });
  const [selectedStages, setSelectedStages] = useState([]);
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

  const assignStandard = async () => {
    setSaving(true);
    try {
      await api.post(`/clients/${id}/standards`, stdForm);
      setStandardModal(false);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

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

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{client.contactPerson} {client.email && `• ${client.email}`} {client.phone && `• ${client.phone}`}</p>
          </div>
          <StatusBadge status={client.status} />
        </div>
        {client.address && <p className="text-sm text-gray-400 mt-2">{client.address}</p>}
      </div>

      {/* Standards */}
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
          const totalDays = cs.stages?.reduce((a, s) => a + s.allottedManDays, 0) || 0;
          const complete = cs.stages?.filter(s => s.status === 'complete').length || 0;
          const pct = cs.stages?.length ? Math.round((complete / cs.stages.length) * 100) : 0;

          return (
            <div key={cs._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base">{cs.standardId?.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cs.contractStartDate && `Start: ${new Date(cs.contractStartDate).toLocaleDateString()}`}
                    {cs.targetEndDate && ` • Target: ${new Date(cs.targetEndDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">{pct}%</div>
                    <div className="text-xs text-gray-400">{totalDays} days allotted</div>
                  </div>
                  <button onClick={() => { setStageModal(cs._id); setSelectedStages([]); }}
                    className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                    <Plus size={12} /> Add Stages
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                <div className="bg-primary-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>

              {/* Stages */}
              <div className="grid grid-cols-1 gap-2">
                {cs.stages?.map(s => {
                  const Icon = statusIcon[s.status] || Circle;
                  return (
                    <div key={s._id} className="flex items-center justify-between py-2 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={statusColor[s.status]} />
                        <span className="text-sm">{s.stageId?.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{s.allottedManDays} days allotted</span>
                        <select value={s.status}
                          onChange={e => updateStageStatus(s._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1">
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                {cs.stages?.length === 0 && <p className="text-xs text-gray-400 py-2">No stages added</p>}
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Assign Stages Modal */}
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
                  }}
                  className="rounded" />
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
    </div>
  );
}
