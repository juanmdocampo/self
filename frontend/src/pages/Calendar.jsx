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
  fetchRecurringRules, createRecurringRange, deleteRecurringRule, cancelRecurringRuleDate,
} from '../api'

// ── Shared helpers ────────────────────────────────────────────────────────────

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const inputCls = 'px-3 py-2.5 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors w-full'

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[700] bg-warm-dark/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-cream rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-bold text-warm-dark">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-warm-dark/[0.08] text-warm-mid hover:text-warm-dark flex items-center justify-center text-sm flex-shrink-0">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Add slot modal (psychologist — range based) ───────────────────────────────

function AddSlotModal({ date, startTime, endTime, slotDuration, slotGap, onSave, onClose, saving }) {
  const [form, setForm] = useState({ date: date || '', start_time: startTime || '', end_time: endTime || '' })
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
            Turnos de <strong>{slotDuration} min</strong>{slotGap > 0 ? ` · ${slotGap} min de pausa` : ''}.
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

function SlotDetailModal({ event, onApprove, onReject, onApproveRb, onRejectRb, onCancelItem, onDelete, onDeleteRecurringOcc, onDeleteRecurringRule, onClose, approving, rejecting, cancelling, deleting }) {
  const props = event.extendedProps
  const type = props.type
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const titleMap = {
    available: 'Turno disponible',
    recurring: 'Disponibilidad recurrente',
    pending: 'Solicitud de turno',
    confirmed: 'Turno reservado',
    recurring_booking: props.status === 'pending' ? 'Reserva recurrente (pendiente)' : 'Turno recurrente',
  }

  return (
    <Modal title={titleMap[type] || 'Turno'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="bg-card-bg rounded-xl p-3 text-sm">
          {(props.patient_name) && <div className="font-medium text-warm-dark mb-1">{props.patient_name}</div>}
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-warm-mid text-xs">
            {new Date(event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(event.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {type === 'recurring' && <div className="text-xs text-warm-mid mt-0.5">Regla recurrente</div>}
          {type === 'recurring_booking' && <div className="text-xs text-warm-mid mt-0.5">Recurrente semanal</div>}
        </div>

        {/* Available specific slot */}
        {type === 'available' && (
          <button onClick={() => onDelete(props.slot_id)} disabled={deleting}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
            {deleting ? 'Eliminando...' : 'Eliminar turno'}
          </button>
        )}

        {/* Recurring availability: delete this day or whole series */}
        {type === 'recurring' && (
          <>
            <button onClick={() => onDeleteRecurringOcc(props.rule_id, props.date)} disabled={deleting}
              className="w-full py-2.5 rounded-xl border border-warm-dark/20 text-warm-dark text-sm font-medium hover:bg-warm-dark/5 transition-all disabled:opacity-60">
              {deleting ? '...' : 'Eliminar solo este día'}
            </button>
            <button onClick={() => onDeleteRecurringRule(props.rule_id)} disabled={deleting}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
              {deleting ? 'Eliminando...' : 'Eliminar toda la serie'}
            </button>
          </>
        )}

        {/* Pending one-off appointment */}
        {type === 'pending' && !showRejectForm && (
          <>
            <button onClick={() => onApprove(props.appointment_id)} disabled={approving}
              className="w-full py-2.5 rounded-xl bg-sage-dark text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60">
              {approving ? 'Confirmando...' : '✓ Confirmar'}
            </button>
            <button onClick={() => setShowRejectForm(true)}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all">
              ✕ Rechazar
            </button>
          </>
        )}

        {/* Confirmed one-off appointment */}
        {type === 'confirmed' && (
          <button onClick={() => onCancelItem(props.appointment_id, false)} disabled={cancelling}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
            {cancelling ? 'Cancelando...' : 'Cancelar turno'}
          </button>
        )}

        {/* Reject form (shared) */}
        {showRejectForm && (
          <>
            <div>
              <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-1">Motivo (opcional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none resize-none"
                rows={3} placeholder="Explicá el motivo..." />
            </div>
            <button
              onClick={() => type === 'recurring_booking'
                ? onRejectRb(props.recurring_booking_id, rejectReason)
                : onReject(props.appointment_id, rejectReason)
              }
              disabled={rejecting}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
              {rejecting ? 'Rechazando...' : 'Confirmar rechazo'}
            </button>
            <button type="button" onClick={() => setShowRejectForm(false)} className="text-sm text-warm-mid text-center">Cancelar</button>
          </>
        )}

        {/* Recurring booking: pending */}
        {type === 'recurring_booking' && props.status === 'pending' && !showRejectForm && (
          <>
            <button onClick={() => onApproveRb(props.recurring_booking_id)} disabled={approving}
              className="w-full py-2.5 rounded-xl bg-sage-dark text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60">
              {approving ? 'Confirmando...' : '✓ Confirmar serie'}
            </button>
            <button onClick={() => setShowRejectForm(true)}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all">
              ✕ Rechazar
            </button>
          </>
        )}

        {/* Recurring booking: confirmed */}
        {type === 'recurring_booking' && props.status === 'confirmed' && (
          <>
            <button onClick={() => onCancelItem(props.recurring_booking_id, true, props.date)} disabled={cancelling}
              className="w-full py-2.5 rounded-xl border border-warm-dark/20 text-warm-dark text-sm font-medium hover:bg-warm-dark/5 transition-all disabled:opacity-60">
              {cancelling ? '...' : 'Cancelar solo este turno'}
            </button>
            <button onClick={() => onCancelItem(props.recurring_booking_id, true)} disabled={cancelling}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
              {cancelling ? 'Cancelando...' : 'Cancelar toda la serie'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Appointment detail modal (patient) ───────────────────────────────────────

function AppointmentDetailModal({ event, onCancelItem, onClose, cancelling }) {
  const props = event.extendedProps
  const isRecurring = props.type === 'recurring_booking'
  const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmado', cancelled: 'Cancelado', rejected: 'Rechazado' }
  const statusCls  = { pending: 'text-amber-600', confirmed: 'text-orange-600', cancelled: 'text-warm-mid', rejected: 'text-gray-400' }

  return (
    <Modal title={isRecurring ? 'Turno recurrente' : 'Tu turno'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="bg-card-bg rounded-xl p-3 text-sm">
          {props.psychologist_name && <div className="font-medium text-warm-dark mb-1">{props.psychologist_name}</div>}
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
            {isRecurring && ' · Recurrente semanal'}
          </div>
          {props.rejection_reason && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5">
              Motivo: {props.rejection_reason}
            </div>
          )}
        </div>

        {props.status !== 'cancelled' && props.status !== 'rejected' && !isRecurring && (
          <button onClick={() => onCancelItem(props.appointment_id, false)} disabled={cancelling}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
            {cancelling ? 'Cancelando...' : 'Cancelar turno'}
          </button>
        )}

        {props.status !== 'cancelled' && props.status !== 'rejected' && isRecurring && (
          <>
            <button onClick={() => onCancelItem(props.recurring_booking_id, true, props.date)} disabled={cancelling}
              className="w-full py-2.5 rounded-xl border border-warm-dark/20 text-warm-dark text-sm font-medium hover:bg-warm-dark/5 transition-all disabled:opacity-60">
              {cancelling ? '...' : 'Cancelar solo este turno'}
            </button>
            <button onClick={() => onCancelItem(props.recurring_booking_id, true)} disabled={cancelling}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60">
              {cancelling ? 'Cancelando...' : 'Cancelar toda la serie'}
            </button>
          </>
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
    try { await updateAppointment(token, id, 'confirmed'); showToast('Turno confirmado ✓'); load(); onActionDone() }
    catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }
  async function rejectAppt(id, reason) {
    setActing(id)
    try { await updateAppointment(token, id, 'rejected', reason); showToast('Turno rechazado.'); setRejectTarget(null); setRejectReason(''); load(); onActionDone() }
    catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }
  async function approveRb(id) {
    setActing(`rb_${id}`)
    try { await updateRecurringBooking(token, id, { status: 'confirmed' }); showToast('Serie confirmada ✓'); load(); onActionDone() }
    catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }
  async function rejectRb(id, reason) {
    setActing(`rb_${id}`)
    try { await updateRecurringBooking(token, id, { status: 'rejected', rejection_reason: reason }); showToast('Serie rechazada.'); setRejectTarget(null); setRejectReason(''); load(); onActionDone() }
    catch { showToast('Error. Intentá de nuevo.') }
    finally { setActing(null) }
  }

  function ActionRow({ id, actingKey, name, subtitle, note, onApprove, onRejectOpen }) {
    const isRej = rejectTarget?.id === id && rejectTarget?.key === actingKey
    return (
      <div className="bg-white rounded-xl p-4 border border-amber-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium text-warm-dark text-sm">{name}</div>
            <div className="text-xs text-warm-mid mt-0.5">{subtitle}</div>
            {note && <div className="text-xs text-warm-mid mt-1 italic">"{note}"</div>}
          </div>
          {!isRej && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onApprove} disabled={!!acting}
                className="px-3 py-1.5 rounded-full bg-sage-dark text-white text-xs font-medium hover:opacity-90 disabled:opacity-50">
                {acting === actingKey ? '...' : '✓'}
              </button>
              <button onClick={onRejectOpen} disabled={!!acting}
                className="px-3 py-1.5 rounded-full border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                ✕
              </button>
            </div>
          )}
        </div>
        {isRej && (
          <div className="mt-3 flex flex-col gap-2">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl border border-warm-dark/[0.15] bg-white text-xs text-warm-dark outline-none resize-none"
              placeholder="Motivo (opcional)..." />
            <div className="flex gap-2">
              <button onClick={() => rejectTarget.type === 'appt' ? rejectAppt(id, rejectReason) : rejectRb(id, rejectReason)}
                disabled={!!acting}
                className="flex-1 py-2 rounded-xl border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50">
                {acting === actingKey ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl text-xs text-warm-mid">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-amber-800">
        <span className="font-medium text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">{loading ? '…' : total}</span>
          Solicitudes pendientes
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && !loading && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          {data?.appointments?.map(appt => {
            const av = appt.availability
            const name = [appt.patient.first_name, appt.patient.last_name].filter(Boolean).join(' ') || appt.patient.username
            const date = new Date(`${av.date}T${av.start_time}`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
            return (
              <ActionRow key={appt.id} id={appt.id} actingKey={appt.id}
                name={name} subtitle={`${date} · ${av.start_time.slice(0,5)}–${av.end_time.slice(0,5)}`}
                note={appt.notes}
                onApprove={() => approveAppt(appt.id)}
                onRejectOpen={() => { setRejectTarget({ id: appt.id, key: appt.id, type: 'appt' }); setRejectReason('') }}
              />
            )
          })}
          {data?.recurring_bookings?.map(rb => {
            const name = [rb.patient.first_name, rb.patient.last_name].filter(Boolean).join(' ') || rb.patient.username
            return (
              <ActionRow key={rb.id} id={rb.id} actingKey={`rb_${rb.id}`}
                name={name} subtitle={`Recurrente · ${DAY_NAMES[rb.day_of_week]} ${rb.start_time.slice(0,5)}–${rb.end_time.slice(0,5)}`}
                note={rb.notes}
                onApprove={() => approveRb(rb.id)}
                onRejectOpen={() => { setRejectTarget({ id: rb.id, key: `rb_${rb.id}`, type: 'rb' }); setRejectReason('') }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Recurring rules management section (psychologist) ────────────────────────

function RecurringRulesSection({ token, slotDuration, slotGap, onRulesChanged }) {
  const { showToast } = useToast()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ day_of_week: '0', start_time: '', end_time: '' })
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRules(await fetchRecurringRules(token)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await createRecurringRange(token, form)
      await load()
      setForm({ day_of_week: '0', start_time: '', end_time: '' })
      showToast(`${res.created} turno${res.created !== 1 ? 's' : ''} generado${res.created !== 1 ? 's' : ''} ✓`)
      onRulesChanged()
    } catch (err) { showToast(err.message) }
    finally { setAdding(false) }
  }

  async function handleDelete(ruleId) {
    setDeleting(ruleId)
    try { await deleteRecurringRule(token, ruleId); setRules(r => r.filter(x => x.id !== ruleId)); showToast('Regla eliminada.'); onRulesChanged() }
    catch (err) { showToast(err.message) }
    finally { setDeleting(null) }
  }

  const duration = slotDuration || 60
  const gap = slotGap || 0

  return (
    <div className="mb-4 border border-warm-dark/[0.08] rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 bg-card-bg text-warm-dark">
        <span className="font-medium text-sm flex items-center gap-2">
          <span className="text-base">🔄</span>
          Disponibilidad recurrente
          {!loading && <span className="text-xs text-warm-mid font-normal">({rules.length} regla{rules.length !== 1 ? 's' : ''})</span>}
        </span>
        <span className="text-xs text-warm-mid">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-4">
          <p className="text-xs text-warm-mid mb-4">
            Turnos de <strong>{duration} min</strong>{gap > 0 ? ` · ${gap} min de pausa` : ''}. Ingresá un rango para generar múltiples turnos.
          </p>

          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end mb-5">
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-[0.65rem] font-medium text-warm-mid uppercase tracking-wider">Día</label>
              <select className={inputCls} value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
              <label className="text-[0.65rem] font-medium text-warm-mid uppercase tracking-wider">Desde</label>
              <input type="time" required className={inputCls} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
              <label className="text-[0.65rem] font-medium text-warm-mid uppercase tracking-wider">Hasta</label>
              <input type="time" required className={inputCls} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
            <button type="submit" disabled={adding}
              className="px-4 py-2.5 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60">
              {adding ? '...' : '+ Agregar'}
            </button>
          </form>

          {loading ? (
            <p className="text-xs text-warm-mid">Cargando...</p>
          ) : rules.length === 0 ? (
            <p className="text-xs text-warm-mid">Sin reglas recurrentes. Usá el formulario para agregar.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-warm-dark/[0.06] text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-warm-dark">{DAY_NAMES[rule.day_of_week]}</span>
                    <span className="text-warm-mid text-xs">{rule.start_time.slice(0,5)} – {rule.end_time.slice(0,5)}</span>
                    {rule.cancelled_dates?.length > 0 && (
                      <span className="text-xs text-warm-mid/60">{rule.cancelled_dates.length} excepción{rule.cancelled_dates.length !== 1 ? 'es' : ''}</span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(rule.id)} disabled={deleting === rule.id}
                    className="text-xs text-warm-mid hover:text-red-500 transition-colors disabled:opacity-40 px-2 py-1">
                    {deleting === rule.id ? '...' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const slotDuration = currentUser?.psychologist_profile?.slot_duration || 60
  const slotGap = currentUser?.psychologist_profile?.slot_gap || 0

  const refetch = () => calendarRef.current?.getApi().refetchEvents()

  const fetchEvents = useCallback(async (info, successCb, failureCb) => {
    try { successCb(await fetchCalendarEvents(token, info.startStr, info.endStr)) }
    catch { failureCb() }
  }, [token])

  function handleDateSelect(info) {
    if (!isPsychologist) return
    const st = info.startStr.includes('T') ? info.startStr.slice(11, 16) : ''
    const et = info.endStr?.includes('T') ? info.endStr.slice(11, 16) : ''
    setAddModal({ date: info.startStr.slice(0, 10), startTime: st, endTime: et })
  }

  async function handleAddSlot(form) {
    setSaving(true)
    try {
      const res = await createSlotsRange(token, form)
      refetch(); setAddModal(null)
      showToast(`${res.created} turno${res.created !== 1 ? 's' : ''} agregado${res.created !== 1 ? 's' : ''} ✓`)
    } catch (err) { showToast(err.message) }
    finally { setSaving(false) }
  }

  async function handleDeleteSlot(slotId) {
    setDeleting(true)
    try { await deleteSlot(token, slotId); refetch(); setDetailEvent(null); showToast('Turno eliminado.') }
    catch (err) { showToast(err.message) }
    finally { setDeleting(false) }
  }

  async function handleDeleteRecurringOcc(ruleId, date) {
    setDeleting(true)
    try { await cancelRecurringRuleDate(token, ruleId, date); refetch(); setDetailEvent(null); showToast('Día eliminado de la disponibilidad.') }
    catch (err) { showToast(err.message) }
    finally { setDeleting(false) }
  }

  async function handleDeleteRecurringRule(ruleId) {
    setDeleting(true)
    try { await deleteRecurringRule(token, ruleId); refetch(); setDetailEvent(null); showToast('Serie eliminada.') }
    catch (err) { showToast(err.message) }
    finally { setDeleting(false) }
  }

  async function handleApproveAppt(apptId) {
    setApproving(true)
    try { await updateAppointment(token, apptId, 'confirmed'); refetch(); setDetailEvent(null); showToast('Turno confirmado ✓') }
    catch (err) { showToast(err.message) }
    finally { setApproving(false) }
  }

  async function handleRejectAppt(apptId, reason) {
    setRejecting(true)
    try { await updateAppointment(token, apptId, 'rejected', reason); refetch(); setDetailEvent(null); showToast('Turno rechazado.') }
    catch (err) { showToast(err.message) }
    finally { setRejecting(false) }
  }

  async function handleApproveRb(rbId) {
    setApproving(true)
    try { await updateRecurringBooking(token, rbId, { status: 'confirmed' }); refetch(); setDetailEvent(null); showToast('Serie confirmada ✓') }
    catch (err) { showToast(err.message) }
    finally { setApproving(false) }
  }

  async function handleRejectRb(rbId, reason) {
    setRejecting(true)
    try { await updateRecurringBooking(token, rbId, { status: 'rejected', rejection_reason: reason }); refetch(); setDetailEvent(null); showToast('Serie rechazada.') }
    catch (err) { showToast(err.message) }
    finally { setRejecting(false) }
  }

  async function handleCancelItem(id, isRecurring, cancelDate = null) {
    setCancelling(true)
    try {
      if (isRecurring) {
        await updateRecurringBooking(token, id, cancelDate ? { cancel_date: cancelDate } : { status: 'cancelled' })
        showToast(cancelDate ? 'Turno cancelado.' : 'Serie cancelada.')
      } else {
        await updateAppointment(token, id, 'cancelled')
        showToast('Turno cancelado.')
      }
      refetch(); setDetailEvent(null)
    } catch (err) { showToast(err.message) }
    finally { setCancelling(false) }
  }

  const isPatientEvent = detailEvent && !isPsychologist
  const isPsychEvent = detailEvent && isPsychologist

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="mb-5">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-warm-dark">
          {isPsychologist ? 'Mi agenda' : 'Mis turnos'}
        </h1>
        <p className="text-warm-mid text-sm mt-1">
          {isPsychologist
            ? 'Tocá una franja horaria para agregar disponibilidad.'
            : 'Tus turnos y reservas con psicólogos.'}
        </p>
      </div>

      {isPsychologist && (
        <>
          <PendingSection token={token} onActionDone={refetch} />
          <RecurringRulesSection
            token={token}
            slotDuration={slotDuration}
            slotGap={slotGap}
            onRulesChanged={refetch}
          />
        </>
      )}

      {/* Color legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 text-xs text-warm-mid">
        {isPsychologist ? (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8BAF8E]" />Disponible</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />Pendiente</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />Reservado</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />Pendiente</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />Confirmado</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]" />Rechazado</span>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-warm-dark/[0.08] shadow-sm overflow-hidden [&_.fc]:font-sans [&_.fc-button]:!rounded-lg [&_.fc-button-primary]:!bg-warm-dark [&_.fc-button-primary]:!border-warm-dark [&_.fc-button-primary.fc-button-active]:!bg-sage-dark [&_.fc-button-primary.fc-button-active]:!border-sage-dark [&_.fc-today-button]:!bg-sage [&_.fc-today-button]:!border-sage [&_.fc-daygrid-day.fc-day-today]:!bg-sage/10 [&_.fc-timegrid-now-indicator-line]:!border-sage-dark [&_.fc-toolbar-title]:!text-base sm:[&_.fc-toolbar-title]:!text-lg [&_.fc-button]:!text-xs sm:[&_.fc-button]:!text-sm [&_.fc-button]:!px-2 sm:[&_.fc-button]:!px-3 p-2 sm:p-5">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
          locale={esLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay,timeGridWeek' : 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="auto"
          selectable={isPsychologist}
          selectMirror={isPsychologist}
          events={fetchEvents}
          select={handleDateSelect}
          eventClick={info => setDetailEvent(info.event)}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          dayMaxEvents={isMobile ? 3 : true}
        />
      </div>

      {!isPsychologist && (
        <p className="text-xs text-warm-mid mt-3 text-center">
          Para reservar un nuevo turno, visitá el perfil de un psicólogo desde{' '}
          <a href="/discover" className="text-sage-dark underline">Descubrir</a>.
        </p>
      )}

      {addModal && isPsychologist && (
        <AddSlotModal
          date={addModal.date} startTime={addModal.startTime} endTime={addModal.endTime}
          slotDuration={slotDuration} slotGap={slotGap}
          onSave={handleAddSlot} onClose={() => setAddModal(null)} saving={saving}
        />
      )}

      {isPsychEvent && (
        <SlotDetailModal
          event={detailEvent}
          onApprove={handleApproveAppt} onReject={handleRejectAppt}
          onApproveRb={handleApproveRb} onRejectRb={handleRejectRb}
          onCancelItem={handleCancelItem}
          onDelete={handleDeleteSlot}
          onDeleteRecurringOcc={handleDeleteRecurringOcc}
          onDeleteRecurringRule={handleDeleteRecurringRule}
          onClose={() => setDetailEvent(null)}
          approving={approving} rejecting={rejecting} cancelling={cancelling} deleting={deleting}
        />
      )}

      {isPatientEvent && (
        <AppointmentDetailModal
          event={detailEvent} onCancelItem={handleCancelItem}
          onClose={() => setDetailEvent(null)} cancelling={cancelling}
        />
      )}
    </div>
  )
}
