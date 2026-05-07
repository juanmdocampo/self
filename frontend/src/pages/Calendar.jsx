import { useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  fetchCalendarEvents, createSlot, deleteSlot,
  fetchAppointments, updateAppointment,
} from '../api'

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[700] bg-warm-dark/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-cream rounded-2xl w-full max-w-sm shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-bold text-warm-dark">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-warm-dark/[0.08] text-warm-mid hover:text-warm-dark flex items-center justify-center text-sm">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = 'px-3 py-2.5 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors w-full'

// ── Psychologist add-slot modal ───────────────────────────────────────────────

function AddSlotModal({ date, startTime, endTime, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    date: date || '',
    start_time: startTime || '',
    end_time: endTime || '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Modal title="Agregar disponibilidad" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Fecha</label>
          <input type="date" required className={inputCls} value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Inicio</label>
            <input type="time" required className={inputCls} value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          </div>
          <div>
            <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Fin</label>
            <input type="time" required className={inputCls} value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 mt-1">
          {saving ? 'Guardando...' : 'Guardar turno'}
        </button>
      </form>
    </Modal>
  )
}

// ── Slot detail modal (psychologist) ─────────────────────────────────────────

function SlotDetailModal({ event, onDelete, onClose, deleting }) {
  const props = event.extendedProps
  const isBooked = props.type === 'booked'
  return (
    <Modal title={isBooked ? 'Turno reservado' : 'Turno disponible'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="bg-card-bg rounded-xl p-3 text-sm">
          <div className="font-medium text-warm-dark">{event.title}</div>
          <div className="text-warm-mid text-xs mt-1">
            {new Date(event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(event.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {!isBooked && (
          <button onClick={() => onDelete(props.slot_id)} disabled={deleting}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
            {deleting ? 'Eliminando...' : 'Eliminar turno'}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── Appointment detail modal (patient) ───────────────────────────────────────

function AppointmentDetailModal({ event, onCancel, onClose, cancelling }) {
  const props = event.extendedProps
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmado', cancelled: 'Cancelado' }
  const statusCls = { pending: 'text-amber-600', confirmed: 'text-green-600', cancelled: 'text-red-500' }
  return (
    <Modal title="Tu turno" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="bg-card-bg rounded-xl p-3 text-sm">
          <div className="font-medium text-warm-dark">{event.title}</div>
          <div className="text-warm-mid text-xs mt-1">
            {new Date(event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(event.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`text-xs font-medium mt-2 ${statusCls[props.status]}`}>
            {statusLabel[props.status]}
          </div>
        </div>
        {props.status !== 'cancelled' && (
          <button onClick={() => onCancel(props.appointment_id)} disabled={cancelling}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
            {cancelling ? 'Cancelando...' : 'Cancelar turno'}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Calendar() {
  const { token, currentUser } = useAuth()
  const { showToast } = useToast()
  const calendarRef = useRef(null)
  const isPsychologist = currentUser?.role === 'psychologist'

  const [addModal, setAddModal] = useState(null)   // { date, startTime, endTime }
  const [detailEvent, setDetailEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchEvents = useCallback(async (info, successCb, failureCb) => {
    try {
      const data = await fetchCalendarEvents(token, info.startStr, info.endStr)
      successCb(data)
    } catch {
      failureCb()
    }
  }, [token])

  // Psychologist clicks empty date/time → open add-slot modal
  function handleDateSelect(info) {
    if (!isPsychologist) return
    const startTime = info.startStr.includes('T')
      ? info.startStr.slice(11, 16)
      : ''
    const endTime = info.endStr?.includes('T')
      ? info.endStr.slice(11, 16)
      : ''
    setAddModal({
      date: info.startStr.slice(0, 10),
      startTime,
      endTime,
    })
  }

  function handleEventClick(info) {
    setDetailEvent(info.event)
  }

  async function handleAddSlot(form) {
    setSaving(true)
    try {
      await createSlot(token, form)
      calendarRef.current?.getApi().refetchEvents()
      setAddModal(null)
      showToast('Turno agregado ✓')
    } catch (err) {
      showToast(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSlot(slotId) {
    setDeleting(true)
    try {
      await deleteSlot(token, slotId)
      calendarRef.current?.getApi().refetchEvents()
      setDetailEvent(null)
      showToast('Turno eliminado.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleCancelAppointment(apptId) {
    setCancelling(true)
    try {
      await updateAppointment(token, apptId, 'cancelled')
      calendarRef.current?.getApi().refetchEvents()
      setDetailEvent(null)
      showToast('Turno cancelado.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-warm-dark">
          {isPsychologist ? 'Mi agenda' : 'Mis turnos'}
        </h1>
        <p className="text-warm-mid text-sm mt-1">
          {isPsychologist
            ? 'Hacé clic en un día o franja horaria para agregar disponibilidad.'
            : 'Tus turnos reservados con psicólogos.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-warm-dark/[0.08] shadow-sm overflow-hidden [&_.fc]:font-sans [&_.fc-button]:!rounded-lg [&_.fc-button-primary]:!bg-warm-dark [&_.fc-button-primary]:!border-warm-dark [&_.fc-button-primary.fc-button-active]:!bg-sage-dark [&_.fc-button-primary.fc-button-active]:!border-sage-dark [&_.fc-today-button]:!bg-sage [&_.fc-today-button]:!border-sage [&_.fc-daygrid-day.fc-day-today]:!bg-sage/10 [&_.fc-timegrid-now-indicator-line]:!border-sage-dark p-3 sm:p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="auto"
          selectable={isPsychologist}
          selectMirror={isPsychologist}
          events={fetchEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        />
      </div>

      {addModal && (
        <AddSlotModal
          date={addModal.date}
          startTime={addModal.startTime}
          endTime={addModal.endTime}
          onSave={handleAddSlot}
          onClose={() => setAddModal(null)}
          saving={saving}
        />
      )}

      {detailEvent && isPsychologist && (
        <SlotDetailModal
          event={detailEvent}
          onDelete={handleDeleteSlot}
          onClose={() => setDetailEvent(null)}
          deleting={deleting}
        />
      )}

      {detailEvent && !isPsychologist && (
        <AppointmentDetailModal
          event={detailEvent}
          onCancel={handleCancelAppointment}
          onClose={() => setDetailEvent(null)}
          cancelling={cancelling}
        />
      )}
    </div>
  )
}
