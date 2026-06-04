import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, FormField, inputCls } from '../../components/ui/index';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async (date) => {
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');
    const { data } = await api.get(`/scheduler?startDate=${start}&endDate=${end}`);
    setEvents(data.map(e => ({
      id: e._id,
      title: `${e.employeeId?.name} — ${e.clientId?.name} (${e.stageId?.name})`,
      start: new Date(e.date),
      end: new Date(e.date),
      resource: e,
      isMine: e.employeeId?._id === user._id,
    })));
  }, [user._id]);

  useEffect(() => { loadEvents(currentDate); }, [currentDate]);

  const openEvent = (event) => {
    setSelectedEvent(event);
    setNotes(event.resource.notes || '');
    setEditModal(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedEvent?.isMine) return;
    setSaving(true);
    try {
      await api.put(`/scheduler/${selectedEvent.id}`, { notes });
      setEditModal(false);
      loadEvents(currentDate);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedEvent?.isMine) return;
    await api.delete(`/scheduler/${selectedEvent.id}`);
    setEditModal(false);
    loadEvents(currentDate);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Team Schedule</h1>
        <p className="text-sm text-gray-500">Full team calendar — you can edit your own entries</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ height: 620 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={openEvent}
          onNavigate={setCurrentDate}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.isMine ? '#2563eb' : '#94a3b8',
              borderRadius: '4px',
              fontSize: '11px',
            }
          })}
        />
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Assignment Details">
        {selectedEvent && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-gray-400 w-20">Date:</span><span className="font-medium">{new Date(selectedEvent.resource.date).toLocaleDateString()}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20">Employee:</span><span>{selectedEvent.resource.employeeId?.name}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20">Client:</span><span>{selectedEvent.resource.clientId?.name}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-20">Stage:</span><span>{selectedEvent.resource.stageId?.name}</span></div>
            </div>

            {selectedEvent.isMine && (
              <>
                <FormField label="Notes">
                  <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Add notes..." />
                </FormField>
                <div className="flex justify-between pt-2">
                  <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                  <div className="flex gap-3">
                    <button onClick={() => setEditModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                    <button onClick={handleSaveNotes} disabled={saving}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </>
            )}
            {!selectedEvent.isMine && (
              <button onClick={() => setEditModal(false)} className="w-full px-4 py-2 text-sm border rounded-lg">Close</button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
