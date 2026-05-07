import { useRef, useState, useCallback, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  fetchCalendarEvents, createSlotsRange, deleteSlot,
  updateAppointment, fetchPendingItems, updateRecurringBooking,
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

// ── Psychologist add-slot modal (range-based) ────────────────────────────────

function AddSlotModal({ date, startTime, endTime, slotDuration, slotGap, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    date: date || '',
    start_time: startTime || '',
    end_time: endTime || '',
  })

  return (
    <Modal title="Agregar disponibilidad" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-3">
        <div>
          <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Fecha</label>
          <input type="date" required className={inputCls} value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Inicio del rango</label>
            <input type="time" required className={inputCls} value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          </div>
          <div>
            <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Fin del rango</label>
            <input type="time" required className={inputCls} value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
        </div>
        {slotDuration && (
          <p className="text-xs text-warm-mid">
            Se generarán turnos de <strong>{slotDuration} min</strong>
            {slotGap > 0 ? ` con ${slotGap} min de pausa` : ''}.
          </p>
        )}
        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 mt-1">
          {saving ? 'Generando...' : 'Generar turnos'}
        </button>
      </form>
    </Modal>
  )
}

// ── Slot detail modal (psychologist) ─────────────────────────────────────────

function SlotDetailModal({ event, onApprove, onReject, onDelete, onClose, approving, rejecting, deleting }) {
  const props = event.extendedProps
  const type = props.type
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const titleMap = { available: 'Turno disponible', pending: 'Solicitud de turno', confirmed: 'Turno confirmado' }

  return (
    <Modal title={titleMap[type] || 'Turno'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="bg-card-bg rounded-xl p-3 text-sm">
          {props.patient_name && (
            <div className="font-medium text-warm-dark mb-1">{props.patient_name}</div>
          )}
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(event.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {type === 'pending' && !showRejectForm && (
          <>
            <button onClick={() => onApprove(props.appointment_id)} disabled={approving}
              className="w-full py-2.5 rounded-xl bg-sage-dark text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60">
              {approving ? 'Confirmando...' : '✓ Confirmar turno'}
            </button>
            <button onClick={() => setShowRejectForm(true)}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all">
              ✕ Rechazar
            </button>
          </>
        )}

        {type === 'pending' && showRejectForm && (
          <>
            <div>
              <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none focus:border-sage-dark resize-none"
                rows={3}
                placeholder="Explicá el motivo..."
              />
            </div>
            <button onClick={() => onReject(props.appointment_id, rejectReason)} disabled={rejecting}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
              {rejecting ? 'Rechazando...' : 'Confirmar rechazo'}
            </button>
            <button type="button" onClick={() => setShowRejectForm(false)} className="text-sm text-warm-mid text-center">
              Cancelar
            </button>
          </>
        )}

        {type === 'available' && (
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
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmado', cancelled: 'Cancelado', rejected: 'Rechazado' }
  const statusCls = { pending: 'text-amber-600', confirmed: 'text-green-600', cancelled: 'text-warm-mid', rejected: 'text-red-500' }

  const isRecurring = props.type === 'recurring_booking'

  return (
    <Modal title={isRecurring ? 'Turno recurrente' : 'Tu turno'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="bg-card-bg rounded-xl p-3 text-sm">
          {props.psychologist_name && (
            <div className="font-medium text-warm-dark mb-1">{props.psychologist_name}</div>
          )}
          <div className="text-warm-mid text-xs mt-1">
            {new Date(event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(event.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`text-xs font-medium mt-2 ${statusCls[props.status] || 'text-warm-mid'}`}>
            {statusLabel[props.status] || props.status}
            {isRecurring && ' · Recurrente'}
          </div>
          {props.rejection_reason && (
            <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1.5">
              Motivo: {props.rejection_reason}
            </div>
          )}
        </div>
        {props.status !== 'cancelled' && props.status !== 'rejected' && (
          <button
            onClick={() => onCancel(
              isRecurring ? props.recurring_booking_id : props.appointment_id,
              isRecurring,
            )}
            disabled={cancelling}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60"
          >
            {cancelling ? 'Cancelando...' : (isRecurring ? 'Cancelar serie recurrente' : 'Cancelar turno')}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── Pending approvals section (psychologist) ─────────────────────────────────

function PendingSection({ token, onActionDone }) {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [open, setOpen] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await fetchPendingItems(token)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  const total = (data?.appointments?.length || 0) + (data?.recurring_bookings?.length || 0)

  if (!loading && total === 0) return null

  async function approveAppt(id) {
    setActing(id)
    try {
      await updateAppointment(token, id, 'confirmed')
      showToast('Turno confirmado ✓')
      load(); onActionDone()
    } catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }

  async function rejectAppt(id, reason) {
    setActing(id)
    try {
      await updateAppointment(token, id, 'rejected', reason)
      showToast('Turno rechazado.')
      setRejectTarget(null); setRejectReason('')
      load(); onActionDone()
    } catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }

  async function approveRb(id) {
    setActing(`rb_${id}`)
    try {
      await updateRecurringBooking(token, id, { status: 'confirmed' })
      showToast('Reserva recurrente confirmada ✓')
      load(); onActionDone()
    } catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }

  async function rejectRb(id, reason) {
    setActing(`rb_${id}`)
    try {
      await updateRecurringBooking(token, id, { status: 'rejected', rejection_reason: reason })
      showToast('Reserva recurrente rechazada.')
      setRejectTarget(null); setRejectReason('')
      load(); onActionDone()
    } catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }

  const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-amber-800"
      >
        <span className="font-medium text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">{loading ? '…' : total}</span>
          Solicitudes pendientes de aprobación
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && !loading && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          {data?.appointments?.map(appt => {
            const av = appt.availability
            const patientName = [appt.patient.first_name, appt.patient.last_name].filter(Boolean).join(' ') || appt.patient.username
            const isRejectTarget = rejectTarget?.type === 'appointment' && rejectTarget?.id === appt.id
            return (
              <div key={appt.id} className="bg-white rounded-xl p-4 border border-amber-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-warm-dark text-sm">{patientName}</div>
                    <div className="text-xs text-warm-mid mt-0.5">
                      {new Date(`${av.date}T${av.start_time}`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {' · '}
                      {av.start_time.slice(0, 5)} – {av.end_time.slice(0, 5)}
                    </div>
                    {appt.notes && <div className="text-xs text-warm-mid mt-1 italic">"{appt.notes}"</div>}
                  </div>
                  {!isRejectTarget && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveAppt(appt.id)}
                        disabled={!!acting}
                        className="px-3 py-1.5 rounded-full bg-sage-dark text-white text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {acting === appt.id ? '...' : '✓'}
                      </button>
                      <button
                        onClick={() => { setRejectTarget({ type: 'appointment', id: appt.id }); setRejectReason('') }}
                        disabled={!!acting}
                        className="px-3 py-1.5 rounded-full border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                {isRejectTarget && (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none focus:border-sage-dark resize-none text-xs"
                      rows={2}
                      placeholder="Motivo (opcional)..."
                    />
                    <div className="flex gap-2">
                      <button onClick={() => rejectAppt(appt.id, rejectReason)} disabled={!!acting}
                        className="flex-1 py-2 rounded-xl border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 transition-all disabled:opacity-50">
                        {acting === appt.id ? 'Rechazando...' : 'Confirmar rechazo'}
                      </button>
                      <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl text-xs text-warm-mid hover:text-warm-dark">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {data?.recurring_bookings?.map(rb => {
            const patientName = [rb.patient.first_name, rb.patient.last_name].filter(Boolean).join(' ') || rb.patient.username
            const isRejectTarget = rejectTarget?.type === 'recurring' && rejectTarget?.id === rb.id
            return (
              <div key={rb.id} className="bg-white rounded-xl p-4 border border-amber-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-warm-dark text-sm">{patientName}</div>
                    <div className="text-xs text-warm-mid mt-0.5">
                      Recurrente · {DAY_NAMES[rb.day_of_week]} {rb.start_time.slice(0, 5)} – {rb.end_time.slice(0, 5)}
                    </div>
                    {rb.notes && <div className="text-xs text-warm-mid mt-1 italic">"{rb.notes}"</div>}
                  </div>
                  {!isRejectTarget && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveRb(rb.id)}
                        disabled={!!acting}
                        className="px-3 py-1.5 rounded-full bg-sage-dark text-white text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {acting === `rb_${rb.id}` ? '...' : '✓'}
                      </button>
                      <button
                        onClick={() => { setRejectTarget({ type: 'recurring', id: rb.id }); setRejectReason('') }}
                        disabled={!!acting}
                        className="px-3 py-1.5 rounded-full border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                {isRejectTarget && (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none focus:border-sage-dark resize-none text-xs"
                      rows={2}
                      placeholder="Motivo (opcional)..."
                    />
                    <div className="flex gap-2">
                      <button onClick={() => rejectRb(rb.id, rejectReason)} disabled={!!acting}
                        className="flex-1 py-2 rounded-xl border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 transition-all disabled:opacity-50">
                        {acting === `rb_${rb.id}` ? 'Rechazando...' : 'Confirmar rechazo'}
                      </button>
                      <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl text-xs text-warm-mid hover:text-warm-dark">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Calendar() {
  const { token, currentUser } = useAuth()
  const { showToast } = useToast()
  const calendarRef = useRef(null)
  const isPsychologist = currentUser?.role === 'psychologist'

  const [addModal, setAddModal] = useState(null)
  const [detailEvent, setDetailEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const slotDuration = currentUser?.psychologist_profile?.slot_duration || 60
  const slotGap = currentUser?.psychologist_profile?.slot_gap || 0

  const fetchEvents = useCallback(async (info, successCb, failureCb) => {
    try {
      const data = await fetchCalendarEvents(token, info.startStr, info.endStr)
      successCb(data)
    } catch {
      failureCb()
    }
  }, [token])

  function handleDateSelect(info) {
    if (!isPsychologist) return
    const startTime = info.startStr.includes('T') ? info.startStr.slice(11, 16) : ''
    const endTime = info.endStr?.includes('T') ? info.endStr.slice(11, 16) : ''
    setAddModal({ date: info.startStr.slice(0, 10), startTime, endTime })
  }

  function handleEventClick(info) {
    setDetailEvent(info.event)
  }

  async function handleAddSlot(form) {
    setSaving(true)
    try {
      const res = await createSlotsRange(token, form)
      calendarRef.current?.getApi().refetchEvents()
      setAddModal(null)
      showToast(`${res.created} turno${res.created !== 1 ? 's' : ''} agregado${res.created !== 1 ? 's' : ''} ✓`)
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

  async function handleApproveAppt(apptId) {
    setApproving(true)
    try {
      await updateAppointment(token, apptId, 'confirmed')
      calendarRef.current?.getApi().refetchEvents()
      setDetailEvent(null)
      showToast('Turno confirmado ✓')
    } catch (err) {
      showToast(err.message)
    } finally {
      setApproving(false)
    }
  }

  async function handleRejectAppt(apptId, reason) {
    setRejecting(true)
    try {
      await updateAppointment(token, apptId, 'rejected', reason)
      calendarRef.current?.getApi().refetchEvents()
      setDetailEvent(null)
      showToast('Turno rechazado.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setRejecting(false)
    }
  }

  async function handleCancelItem(id, isRecurring) {
    setCancelling(true)
    try {
      if (isRecurring) {
        await updateRecurringBooking(token, id, { status: 'cancelled' })
      } else {
        await updateAppointment(token, id, 'cancelled')
      }
      calendarRef.current?.getApi().refetchEvents()
      setDetailEvent(null)
      showToast('Turno cancelado.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const isPatientEvent = detailEvent && !isPsychologist
  const isPsychEvent = detailEvent && isPsychologist

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-warm-dark">
          {isPsychologist ? 'Mi agenda' : 'Mis turnos'}
        </h1>
        <p className="text-warm-mid text-sm mt-1">
          {isPsychologist
            ? 'Hacé clic en una franja horaria para agregar disponibilidad.'
            : 'Tus turnos reservados con psicólogos.'}
        </p>
      </div>

      {isPsychologist && (
        <PendingSection
          token={token}
          onActionDone={() => calendarRef.current?.getApi().refetchEvents()}
        />
      )}

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
          slotDuration={isPsychologist ? slotDuration : null}
          slotGap={slotGap}
          onSave={handleAddSlot}
          onClose={() => setAddModal(null)}
          saving={saving}
        />
      )}

      {isPsychEvent && (
        <SlotDetailModal
          event={detailEvent}
          onApprove={handleApproveAppt}
          onReject={handleRejectAppt}
          onDelete={handleDeleteSlot}
          onClose={() => setDetailEvent(null)}
          approving={approving}
          rejecting={rejecting}
          deleting={deleting}
        />
      )}

      {isPatientEvent && (
        <AppointmentDetailModal
          event={detailEvent}
          onCancel={handleCancelItem}
          onClose={() => setDetailEvent(null)}
          cancelling={cancelling}
        />
      )}
    </div>
  )
}
