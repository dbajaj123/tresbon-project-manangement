import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, FormField, selectCls, inputCls } from '../../components/ui/index';
import api from '../../api/axios';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales: {} });

export default function Scheduler() {
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState({ date: '', employeeId: '', clientId: '', clientStandardId: '', stageId: '', notes: '' });
  const [clientStandards, setClientStandards] = useState([]);
  const [stages, setStages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    api.get('/users?role=employee').then(r => setEmployees(r.data));
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
    })));
  }, []);

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

  const openNew = (slotInfo) => {
    const date = slotInfo?.start || new Date();
    setForm({ date: format(date, 'yyyy-MM-dd'), employeeId: '', clientId: '', clientStandardId: '', stageId: '', notes: '' });
    setClientStandards([]);
    setStages([]);
    setWarning('');
    setSelectedEvent(null);
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/scheduler', form);
      if (res.data.warning) setWarning(res.data.warning);
      else setModal(false);
      loadEvents(currentDate);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    await api.delete(`/scheduler/${selectedEvent.id}`);
    setSelectedEvent(null);
    setModal(false);
    loadEvents(currentDate);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Scheduler</h1>
          <p className="text-sm text-gray-500">Click any date to assign an employee</p>
        </div>
        <button onClick={() => openNew(null)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          + New Assignment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ height: 620 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectSlot={openNew}
          selectable
          onSelectEvent={(event) => {
            setSelectedEvent(event);
            const r = event.resource;
            setForm({ date: format(new Date(r.date), 'yyyy-MM-dd'), employeeId: r.employeeId?._id, clientId: r.clientId?._id, clientStandardId: r.clientStandardId, stageId: r.stageId?._id, notes: r.notes || '' });
            setModal(true);
          }}
          onNavigate={(date) => setCurrentDate(date)}
          eventPropGetter={() => ({ style: { backgroundColor: '#2563eb', borderRadius: '4px', fontSize: '11px' } })}
        />
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setSelectedEvent(null); setWarning(''); }} title={selectedEvent ? 'Edit Assignment' : 'New Assignment'}>
        {warning && <div className="bg-yellow-50 text-yellow-700 text-sm rounded-lg px-4 py-2 mb-4">{warning}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Employee" required>
              <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className={selectCls}>
                <option value="">Select employee...</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Client" required>
            <select value={form.clientId} onChange={e => onClientChange(e.target.value)} className={selectCls}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </FormField>
          {clientStandards.length > 0 && (
            <FormField label="Standard" required>
              <select value={form.clientStandardId} onChange={e => onStandardChange(e.target.value)} className={selectCls}>
                <option value="">Select standard...</option>
                {clientStandards.map(cs => <option key={cs._id} value={cs._id}>{cs.standardId?.name}</option>)}
              </select>
            </FormField>
          )}
          {stages.length > 0 && (
            <FormField label="Stage" required>
              <select value={form.stageId} onChange={e => setForm({ ...form, stageId: e.target.value })} className={selectCls}>
                <option value="">Select stage...</option>
                {stages.map(s => <option key={s._id} value={s.stageId?._id}>{s.stageId?.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Notes">
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} />
          </FormField>
          <div className="flex justify-between items-center pt-2">
            {selectedEvent ? (
              <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
            ) : <span />}
            <div className="flex gap-3">
              <button onClick={() => { setModal(false); setSelectedEvent(null); }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.date || !form.employeeId || !form.clientId}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}