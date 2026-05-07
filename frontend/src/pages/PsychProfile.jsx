import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchPsychologist, swipeAction, fetchPsychologistPublicEvents, bookAppointment } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online y Presencial' }

export default function PsychProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, openLoginModal } = useAuth()
  const { showToast } = useToast()

  const [psych, setPsych] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [bookModal, setBookModal] = useState(null)  // { event }
  const [bookingSlot, setBookingSlot] = useState(false)
  const [recurringWeeks, setRecurringWeeks] = useState(0)

  const calendarRef = useRef(null)

  useEffect(() => {
    fetchPsychologist(token, id)
      .then(data => {
        setPsych(data)
        setLiked(data.swipe_status === 'like')
      })
      .catch(() => navigate('/discover'))
      .finally(() => setLoading(false))
  }, [id, token, navigate])

  const fetchEvents = useCallback(async (info, successCb, failureCb) => {
    try {
      const data = await fetchPsychologistPublicEvents(token, id, info.startStr, info.endStr)
      successCb(data)
    } catch {
      failureCb()
    }
  }, [token, id])

  function handleEventClick(info) {
    if (!token) { openLoginModal(); return }
    if (currentUser?.role === 'psychologist') return
    setBookModal({ event: info.event })
    setRecurringWeeks(0)
  }

  async function handleBook() {
    if (!token || bookingSlot) return
    setBookingSlot(true)
    const props = bookModal.event.extendedProps
    try {
      const payload = props.type === 'available'
        ? { slot_id: props.slot_id, recurring_weeks: recurringWeeks }
        : {
            psychologist_id: psych.id,
            date: props.date,
            start_time: props.start_time,
            end_time: props.end_time,
            recurring_weeks: recurringWeeks,
          }
      await bookAppointment(token, payload)
      calendarRef.current?.getApi().refetchEvents()
      setBookModal(null)
      showToast(recurringWeeks > 0
        ? `¡${recurringWeeks} turnos reservados! Revisá tu calendario.`
        : '¡Turno reservado! Revisá tu calendario.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setBookingSlot(false)
    }
  }

  async function handleLike() {
    if (!token) { openLoginModal(); return }
    if (likeLoading) return
    const newAction = liked ? 'pass' : 'like'
    setLikeLoading(true)
    try {
      await swipeAction(token, psych.id, newAction)
      setLiked(newAction === 'like')
      showToast(newAction === 'like' ? '💚 ¡Agregado a tus favoritos!' : 'Eliminado de favoritos.')
    } catch {
      showToast('Error al actualizar. Intentá de nuevo.')
    } finally {
      setLikeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-warm-mid text-sm">Cargando...</div>
      </div>
    )
  }

  if (!psych) return null

  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const avatar = AVATARS[psych.id % AVATARS.length]
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : null
  const modality = MODALITY_LABEL[p.modality] || ''

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-warm-mid hover:text-warm-dark transition-colors mb-8"
      >
        ← Volver
      </button>

      {/* Hero avatar */}
      <div className="w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-[8rem] h-64 relative mb-6">
        {psych.avatar
          ? <img src={psych.avatar} alt={name} className="w-full h-full object-cover absolute inset-0" />
          : avatar
        }
        {p.is_verified && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-sage-dark flex items-center gap-1.5 shadow-sm">
            ✓ Verificado
          </div>
        )}
        {p.is_accepting_patients && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-sage-dark flex items-center gap-1.5 shadow-sm">
            <span className="text-green-500 text-[0.5rem]">●</span> Disponible
          </div>
        )}
      </div>

      {/* Name + modality */}
      <div className="mb-2">
        <h1 className="font-serif text-4xl font-bold text-warm-dark">{name}</h1>
        <p className="text-sage-dark font-medium mt-1">
          {[modality, p.city].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Specialties */}
      {p.specialties?.length > 0 && (
        <div className="flex flex-wrap gap-2 my-5">
          {p.specialties.map(s => (
            <span key={s} className="px-3 py-1.5 rounded-full bg-sage/[0.12] text-xs text-sage-dark font-medium">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {price && (
          <div className="bg-card-bg rounded-2xl p-4 border border-warm-dark/[0.06]">
            <div className="text-xs text-warm-mid mb-0.5">Precio por sesión</div>
            <div className="font-semibold text-warm-dark text-lg">{price}</div>
          </div>
        )}
        {p.years_experience > 0 && (
          <div className="bg-card-bg rounded-2xl p-4 border border-warm-dark/[0.06]">
            <div className="text-xs text-warm-mid mb-0.5">Experiencia</div>
            <div className="font-semibold text-warm-dark text-lg">{p.years_experience} años</div>
          </div>
        )}
        {p.modality && (
          <div className="bg-card-bg rounded-2xl p-4 border border-warm-dark/[0.06]">
            <div className="text-xs text-warm-mid mb-0.5">Modalidad</div>
            <div className="font-semibold text-warm-dark">{modality}</div>
          </div>
        )}
        {p.languages?.length > 0 && (
          <div className="bg-card-bg rounded-2xl p-4 border border-warm-dark/[0.06]">
            <div className="text-xs text-warm-mid mb-0.5">Idiomas</div>
            <div className="font-semibold text-warm-dark">{p.languages.join(', ')}</div>
          </div>
        )}
        {p.city && (
          <div className="bg-card-bg rounded-2xl p-4 border border-warm-dark/[0.06]">
            <div className="text-xs text-warm-mid mb-0.5">Ciudad</div>
            <div className="font-semibold text-warm-dark">{p.city}</div>
          </div>
        )}
        {p.license_number && (
          <div className="bg-card-bg rounded-2xl p-4 border border-warm-dark/[0.06]">
            <div className="text-xs text-warm-mid mb-0.5">Matrícula</div>
            <div className="font-semibold text-warm-dark">{p.license_number}</div>
          </div>
        )}
      </div>

      {/* Bio */}
      {psych.bio && (
        <div className="mb-8">
          <h2 className="text-xs text-warm-mid uppercase tracking-wider font-medium mb-3">Sobre mí</h2>
          <p className="text-warm-dark leading-relaxed">{psych.bio}</p>
        </div>
      )}

      {/* Booking calendar — only shown to patients */}
      {(!currentUser || currentUser.role === 'patient') && (
        <div className="mb-8">
          <h2 className="text-xs text-warm-mid uppercase tracking-wider font-medium mb-3">Reservar turno</h2>
          <div className="bg-white rounded-2xl border border-warm-dark/[0.08] overflow-hidden [&_.fc]:font-sans [&_.fc-button-primary]:!bg-warm-dark [&_.fc-button-primary]:!border-warm-dark [&_.fc-button-primary.fc-button-active]:!bg-sage-dark [&_.fc-button-primary.fc-button-active]:!border-sage-dark [&_.fc-today-button]:!bg-sage [&_.fc-today-button]:!border-sage [&_.fc-daygrid-day.fc-day-today]:!bg-sage/10 p-3">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale={esLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              height="auto"
              events={fetchEvents}
              eventClick={handleEventClick}
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              nowIndicator
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
            />
          </div>
          <p className="text-xs text-warm-mid mt-2">Hacé clic en un turno disponible para reservarlo.</p>
        </div>
      )}

      {/* Book modal */}
      {bookModal && (
        <div
          className="fixed inset-0 z-[700] bg-warm-dark/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setBookModal(null) }}
        >
          <div className="bg-cream rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-warm-dark">Reservar turno</h3>
              <button onClick={() => setBookModal(null)} className="w-7 h-7 rounded-full bg-warm-dark/[0.08] text-warm-mid flex items-center justify-center text-sm">×</button>
            </div>
            <div className="bg-card-bg rounded-xl p-3 mb-4 text-sm">
              <div className="text-warm-mid text-xs">
                {new Date(bookModal.event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div className="font-medium text-warm-dark mt-0.5">
                {new Date(bookModal.event.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(bookModal.event.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider block mb-2">
                ¿Reservar de forma recurrente?
              </label>
              <select
                value={recurringWeeks}
                onChange={e => setRecurringWeeks(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl border border-warm-dark/[0.15] bg-white text-sm text-warm-dark outline-none focus:border-sage-dark w-full"
              >
                <option value={0}>Solo este turno</option>
                <option value={4}>4 semanas</option>
                <option value={8}>8 semanas</option>
                <option value={12}>12 semanas</option>
              </select>
            </div>
            <button
              onClick={handleBook}
              disabled={bookingSlot}
              className="w-full py-3 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60"
            >
              {bookingSlot ? 'Reservando...' : recurringWeeks > 0 ? `Reservar ${recurringWeeks} turnos` : 'Confirmar reserva'}
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleLike}
        disabled={likeLoading}
        className={`w-full py-4 rounded-xl text-sm font-medium transition-all disabled:opacity-60 ${
          liked
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-warm-dark text-cream hover:bg-sage-dark'
        }`}
      >
        {liked ? '♥ En tus favoritos' : '♡ Me interesa este profesional'}
      </button>
    </div>
  )
}
