import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, FormField, inputCls, selectCls } from '../../components/ui/index';
import useAuthStore from '../../store/authStore';
import api from '../../api/axios';

const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales: {},
});

export default function EmpScheduler() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: '', clientId: '', clientStandardId: '', stageId: '', notes: '' });
  const [clientStandards, setClientStandards] = useState([]);
  const [stages, setStages] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data.filter(c => c.status === 'active')));
  }, []);

  const loadEvents = useCallback(async (date) => {
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');
    const { data } = await api.get(`/scheduler?startDate=${start}&endDate=${end}`);
    setEvents(data.map(e => ({
      id: e._id,
      title: `${e.employeeId?.name} — ${e.clientId?.name}${e.stageId?.name ? ` (${e.stageId.name})` : ''}`,
      start: new Date(e.date),
      end: new Date(e.date),
      resource: e,
      isMine: e.employeeId?._id === user._id,
      employeeColor: e.employeeId?.color || '#94a3b8',
    })));
  }, [user._id]);

  useEffect(() => { loadEvents(currentDate); }, [currentDate, loadEvents]);

  const onClientChange = async (clientId) => {
    setForm(f => ({ ...f, clientId, clientStandardId: '', stageId: '' }));
    if (!clientId) return setClientStandards([]);
    const { data } = await api.get(`/clients/${clientId}`);
    setClientStandards(data.standards || []);
  };

  const onStandardChange = (csId) => {
    setForm(f => ({ ...f, clientStandardId: csId, stageId: '' }));
    const cs = clientStandards.find(s => s._id === csId);
    setStages(cs?.stages || []);
  };

  // Create new assignment for self
  const openNew = (slotInfo) => {
    const date = slotInfo?.start || new Date();
    setForm({ date: format(date, 'yyyy-MM-dd'), clientId: '', clientStandardId: '', stageId: '', notes: '' });
    setClientStandards([]);
    setStages([]);
    setSelectedEvent(null);
    setModal(true);
  };

  // Open existing — only editable if mine
  const openEvent = (event) => {
    setSelectedEvent(event);
    const r = event.resource;
    if (event.isMine) {
      setForm({ date: format(new Date(r.date), 'yyyy-MM-dd'), clientId: r.clientId?._id, clientStandardId: r.clientStandardId, stageId: r.stageId?._id, notes: r.notes || '' });
      api.get(`/clients/${r.clientId?._id}`).then(res => {
        const stds = res.data.standards || [];
        setClientStandards(stds);
        const cs = stds.find(s => s._id === r.clientStandardId);
        setStages(cs?.stages || []);
      });
    }
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedEvent) {
        await api.put(`/scheduler/${selectedEvent.id}`, form);
      } else {
        // Employee creates entry for themselves
        await api.post('/scheduler', { ...form, employeeId: user._id });
      }
      setModal(false);
      setSelectedEvent(null);
      loadEvents(currentDate);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedEvent?.isMine) return;
    await api.delete(`/scheduler/${selectedEvent.id}`);
    setModal(false);
    setSelectedEvent(null);
    loadEvents(currentDate);
  };

  const viewOnly = selectedEvent && !selectedEvent.isMine;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Schedule</h1>
          <p className="text-sm text-gray-500">Click a date to add your own assignment, or click your entries to edit</p>
        </div>
        <button onClick={() => openNew(null)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          + New Assignment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2" style={{ height: 760 }}>
        <style>{`
          .rbc-month-row { min-height: 130px !important; }
          .rbc-event { margin-bottom: 1px !important; padding: 1px 4px !important; font-size: 11px !important; }
          .rbc-show-more { display: none !important; }
        `}</style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={openNew}
          onSelectEvent={openEvent}
          onNavigate={setCurrentDate}
          popup={false}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.employeeColor || '#94a3b8',
              opacity: event.isMine ? 1 : 0.55,
              borderRadius: '4px',
              fontSize: '11px',
              border: event.isMine ? '2px solid #1e3a8a' : 'none',
            }
          })}
        />
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setSelectedEvent(null); }}
        title={selectedEvent ? (viewOnly ? 'Assignment Details' : 'Edit My Assignment') : 'New Assignment'}>
        {viewOnly ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-gray-400 w-20">Date:</span><span className="font-medium">{new Date(selectedEvent.resource.date).toLocaleDateString()}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20">Employee:</span><span>{selectedEvent.resource.employeeId?.name}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20">Client:</span><span>{selectedEvent.resource.clientId?.name}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20">Stage:</span><span>{selectedEvent.resource.stageId?.name || '-'}</span></div>
              {selectedEvent.resource.notes && <div className="flex gap-2"><span className="text-gray-400 w-20">Notes:</span><span>{selectedEvent.resource.notes}</span></div>}
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">This is another team member's assignment — view only.</div>
            <button onClick={() => { setModal(false); setSelectedEvent(null); }} className="w-full px-4 py-2 text-sm border rounded-lg">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="Date" required>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Client" required>
              <select value={form.clientId} onChange={e => onClientChange(e.target.value)} className={selectCls}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </FormField>
            {clientStandards.length > 0 && (
              <FormField label="Standard">
                <select value={form.clientStandardId} onChange={e => onStandardChange(e.target.value)} className={selectCls}>
                  <option value="">Select standard...</option>
                  {clientStandards.map(cs => <option key={cs._id} value={cs._id}>{cs.standardId?.name}</option>)}
                </select>
              </FormField>
            )}
            {stages.length > 0 && (
              <FormField label="Stage">
                <select value={form.stageId} onChange={e => setForm({ ...form, stageId: e.target.value })} className={selectCls}>
                  <option value="">Select stage...</option>
                  {stages.map(s => <option key={s._id} value={s.stageId?._id}>{s.stageId?.name}</option>)}
                </select>
              </FormField>
            )}
            <FormField label="Notes">
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} placeholder="Add notes..." />
            </FormField>
            <div className="flex justify-between items-center pt-2">
              {selectedEvent
                ? <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
                : <span />}
              <div className="flex gap-3">
                <button onClick={() => { setModal(false); setSelectedEvent(null); }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.date || !form.clientId}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Saving...' : selectedEvent ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}