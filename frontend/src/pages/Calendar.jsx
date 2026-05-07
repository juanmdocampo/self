import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchAppointments, updateAppointment } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']

const STATUS_LABEL = {
  pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado', cls: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-50 text-red-600 border-red-200' },
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function AppointmentCard({ appt, isPatient, onUpdateStatus, updating }) {
  const other = isPatient ? appt.psychologist : appt.patient
  const name = [other.first_name, other.last_name].filter(Boolean).join(' ') || other.username
  const avatar = AVATARS[other.id % AVATARS.length]
  const { date, start_time, end_time } = appt.availability
  const status = STATUS_LABEL[appt.status] || STATUS_LABEL.pending

  return (
    <div className="bg-card-bg rounded-2xl p-5 border border-warm-dark/[0.06] shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-xl border-2 border-sage">
          {other.avatar
            ? <img src={other.avatar} alt={name} className="w-full h-full object-cover" />
            : avatar
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="font-medium text-warm-dark">{name}</div>
              <div className="text-xs text-warm-mid mt-0.5 capitalize">{formatDate(date)}</div>
              <div className="text-xs text-warm-mid">{start_time.slice(0, 5)} – {end_time.slice(0, 5)}</div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${status.cls}`}>
              {status.label}
            </span>
          </div>

          {appt.notes && (
            <p className="text-xs text-warm-mid mt-2 italic">"{appt.notes}"</p>
          )}

          {/* Actions */}
          {appt.status !== 'cancelled' && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {!isPatient && appt.status === 'pending' && (
                <button
                  onClick={() => onUpdateStatus(appt.id, 'confirmed')}
                  disabled={updating === appt.id}
                  className="px-3 py-1.5 rounded-full bg-sage-dark text-white text-xs font-medium hover:bg-sage transition-all disabled:opacity-60"
                >
                  Confirmar
                </button>
              )}
              <button
                onClick={() => onUpdateStatus(appt.id, 'cancelled')}
                disabled={updating === appt.id}
                className="px-3 py-1.5 rounded-full border border-warm-dark/20 text-warm-mid text-xs font-medium hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const { token, currentUser } = useAuth()
  const { showToast } = useToast()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState('all')

  const isPatient = currentUser?.role === 'patient'

  const load = useCallback(async () => {
    if (!token) return
    const data = await fetchAppointments(token)
    setAppointments(data)
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleUpdateStatus(apptId, newStatus) {
    setUpdating(apptId)
    try {
      const updated = await updateAppointment(token, apptId, newStatus)
      setAppointments(prev => prev.map(a => a.id === apptId ? updated : a))
      showToast(newStatus === 'confirmed' ? 'Turno confirmado ✓' : 'Turno cancelado.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => a.status === filter)

  const upcoming = filtered.filter(a => a.status !== 'cancelled')
  const past = filtered.filter(a => a.status === 'cancelled')

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold">
          {isPatient ? 'Mis turnos' : 'Mi agenda'}
        </h1>
        <p className="text-warm-mid mt-2 text-sm">
          {isPatient
            ? 'Tus reservas con psicólogos.'
            : 'Los turnos reservados por tus pacientes.'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'confirmed', label: 'Confirmados' },
          { key: 'cancelled', label: 'Cancelados' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-warm-dark text-cream'
                : 'bg-card-bg border border-warm-dark/[0.08] text-warm-mid hover:text-warm-dark'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-warm-mid">
          <div className="text-4xl">⏳</div>
          <div>Cargando turnos...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-warm-mid text-center">
          <div className="text-5xl">📅</div>
          <div className="font-medium">No tenés turnos todavía.</div>
          <div className="text-sm">
            {isPatient
              ? 'Explorá perfiles de psicólogos y reservá un turno.'
              : 'Agregá tu disponibilidad en tu perfil para que los pacientes puedan reservar.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              isPatient={isPatient}
              onUpdateStatus={handleUpdateStatus}
              updating={updating}
            />
          ))}
        </div>
      )}
    </div>
  )
}
