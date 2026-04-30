import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { swipeAction } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

function Dots({ total, current, onSelect }) {
  if (total <= 1) return null
  const MAX = 7
  let start = Math.max(0, current - Math.floor(MAX / 2))
  const end = Math.min(total, start + MAX)
  start = Math.max(0, end - MAX)

  return (
    <div className="flex items-center gap-1.5">
      {start > 0 && <span className="text-warm-mid/40 text-xs">·</span>}
      {Array.from({ length: end - start }, (_, i) => i + start).map(i => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`rounded-full transition-all duration-200 ${
            i === current
              ? 'w-4 h-1.5 bg-warm-dark'
              : 'w-1.5 h-1.5 bg-warm-dark/20 hover:bg-warm-dark/40'
          }`}
        />
      ))}
      {end < total && <span className="text-warm-mid/40 text-xs">·</span>}
    </div>
  )
}

function PsychCard({ psych, opacity, dragRef }) {
  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const specialties = p.specialties || []
  const modality = MODALITY_LABEL[p.modality] || ''
  const avatar = AVATARS[psych.id % AVATARS.length]
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : null
  const years = p.years_experience ? `${p.years_experience} años de exp.` : null
  const liked = psych.swipe_status === 'like'

  return (
    <div
      ref={dragRef}
      className="w-full rounded-3xl bg-card-bg shadow-card overflow-hidden select-none"
      style={{ opacity, transition: 'opacity 0.15s ease' }}
    >
      {/* Photo */}
      <div className="w-full h-[240px] sm:h-[280px] bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-[5rem] relative">
        {psych.avatar
          ? <img src={psych.avatar} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          : avatar
        }
        {liked && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
            ♥ Elegido
          </div>
        )}
        {p.is_accepting_patients && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-sage-dark flex items-center gap-1">
            <span className="text-green-500 text-[0.5rem]">●</span> Disponible
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-serif text-2xl font-bold leading-tight">{name}</h2>
          {price && (
            <span className="text-sm font-semibold text-sage-dark flex-shrink-0 mt-1">{price}</span>
          )}
        </div>

        <div className="text-sm text-sage-dark font-medium mb-3">
          {[modality, p.city].filter(Boolean).join(' · ')}
        </div>

        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {specialties.slice(0, 5).map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-sage/[0.12] text-xs text-sage-dark font-medium">{s}</span>
            ))}
            {specialties.length > 5 && (
              <span className="px-2.5 py-1 rounded-full bg-warm-dark/[0.06] text-xs text-warm-mid">+{specialties.length - 5}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-warm-mid mb-3">
          {p.city && <span>📍 {p.city}</span>}
          {years && <span>💬 {years}</span>}
          {p.license_number && <span>🪪 {p.license_number}</span>}
        </div>

        {psych.bio && (
          <p className="text-sm text-warm-mid leading-relaxed line-clamp-3">{psych.bio}</p>
        )}
      </div>
    </div>
  )
}

export default function SwipeStack({ psychs, onSwipeUpdate, onMatchFound, onInfo, swipeRef }) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [idx, setIdx] = useState(0)
  const [displayIdx, setDisplayIdx] = useState(0)
  const [cardOpacity, setCardOpacity] = useState(1)
  const [likeLoading, setLikeLoading] = useState(false)
  const cardRef = useRef(null)
  const touch = useRef({ startX: 0, startY: 0 })

  const current = psychs[displayIdx]
  const liked = current?.swipe_status === 'like'

  const navigateTo = useCallback((newIdx) => {
    if (newIdx < 0 || newIdx >= psychs.length) return
    setCardOpacity(0)
    setTimeout(() => {
      setIdx(newIdx)
      setDisplayIdx(newIdx)
      setCardOpacity(1)
    }, 130)
  }, [psychs.length])

  const goNext = useCallback(() => navigateTo(Math.min(idx + 1, psychs.length - 1)), [idx, psychs.length, navigateTo])
  const goPrev = useCallback(() => navigateTo(Math.max(idx - 1, 0)), [idx, navigateTo])

  const handleLike = useCallback(async () => {
    if (!current || likeLoading) return
    const newAction = liked ? 'pass' : 'like'
    setLikeLoading(true)
    try {
      await swipeAction(token, current.id, newAction)
      onSwipeUpdate?.(current.id, newAction)
      if (newAction === 'like') {
        showToast('💚 ¡Agregado a tus matches!')
        onMatchFound?.()
      } else {
        showToast('Eliminado de matches.')
      }
    } catch {}
    setLikeLoading(false)
  }, [current, liked, likeLoading, token, onSwipeUpdate, onMatchFound, showToast])

  // swipeRef compatibility for PsychDetailModal
  const doSwipe = useCallback((dir) => {
    if (dir === 'right') handleLike()
    else goNext()
  }, [handleLike, goNext])

  useEffect(() => { swipeRef?.(doSwipe) }, [doSwipe, swipeRef])

  // Touch swipe to navigate
  const onTouchStart = (e) => {
    touch.current.startX = e.touches[0].clientX
    touch.current.startY = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.startX
    const dy = Math.abs(e.changedTouches[0].clientY - touch.current.startY)
    if (dy > 40) return // vertical scroll, ignore
    if (dx > 60) goPrev()
    else if (dx < -60) goNext()
  }

  if (psychs.length === 0) {
    return (
      <div className="w-full max-w-[440px] h-[520px] flex flex-col items-center justify-center gap-4 text-warm-mid text-center px-6">
        <div className="text-5xl">🌿</div>
        <div className="font-medium">No hay psicólogos disponibles.</div>
        <div className="text-sm">Probá ajustar los filtros.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full px-1 sm:px-0" style={{ maxWidth: 440 }}>
      {/* Counter */}
      <div className="text-xs text-warm-mid self-end">
        {displayIdx + 1} <span className="text-warm-dark/30">/</span> {psychs.length}
      </div>

      {/* Card */}
      <div
        className="w-full"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current && (
          <PsychCard
            key={current.id}
            psych={current}
            opacity={cardOpacity}
            dragRef={cardRef}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 w-full">
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className="w-11 h-11 rounded-full bg-white shadow-card flex items-center justify-center text-warm-dark hover:bg-warm-dark/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
          title="Anterior"
        >
          ‹
        </button>

        {/* Info */}
        <button
          onClick={() => current && onInfo?.(current)}
          className="w-11 h-11 rounded-full bg-white shadow-card flex items-center justify-center text-warm-mid hover:text-warm-dark hover:bg-warm-dark/[0.06] transition-all flex-shrink-0 text-sm"
          title="Ver perfil completo"
        >
          ℹ
        </button>

        {/* Heart — primary CTA */}
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={`flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-card disabled:opacity-60 ${
            liked
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-warm-dark text-cream hover:bg-sage-dark'
          }`}
        >
          <span className="text-base">{liked ? '♥' : '♡'}</span>
          {liked ? 'Elegido' : 'Me interesa'}
        </button>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={idx === psychs.length - 1}
          className="w-11 h-11 rounded-full bg-white shadow-card flex items-center justify-center text-warm-dark hover:bg-warm-dark/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
          title="Siguiente"
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <Dots total={psychs.length} current={displayIdx} onSelect={navigateTo} />
    </div>
  )
}
