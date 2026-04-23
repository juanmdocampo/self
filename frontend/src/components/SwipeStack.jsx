import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { swipeAction } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

function StatusBadge({ status }) {
  if (!status) return null
  if (status === 'like') return (
    <div className="absolute top-3 left-3 z-10 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
      ♥ Elegido
    </div>
  )
  return (
    <div className="absolute top-3 left-3 z-10 bg-gray-400 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
      ✕ Pasado
    </div>
  )
}

function PsychCard({ psych, stackIndex, isTop, topCardRef, onDragStart }) {
  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const specialties = (p.specialties || []).slice(0, 3)
  const modality = MODALITY_LABEL[p.modality] || ''
  const avatar = AVATARS[psych.id % AVATARS.length]
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : ''
  const years = p.years_experience ? `${p.years_experience} años` : ''

  const stackClass = [
    '',
    'rotate-[-2deg] translate-y-2',
    'rotate-[2deg] translate-y-4',
  ][Math.min(stackIndex, 2)] || 'rotate-[-1deg] translate-y-5'

  return (
    <div
      ref={isTop ? topCardRef : null}
      data-id={psych.id}
      className={`absolute w-[360px] h-[520px] rounded-3xl bg-card-bg shadow-card overflow-hidden select-none ${isTop ? 'z-30 cursor-grab' : ''} ${stackClass}`}
      style={{ zIndex: 3 - Math.min(stackIndex, 2) }}
      onMouseDown={isTop ? onDragStart : undefined}
      onTouchStart={isTop ? onDragStart : undefined}
    >
      <StatusBadge status={psych.swipe_status} />
      <div className="w-full h-[280px] bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-[5rem] relative">
        {psych.avatar
          ? <img src={psych.avatar} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          : avatar
        }
        {p.is_accepting_patients && (
          <div className="absolute top-4 right-4 bg-white rounded-full px-2.5 py-1 text-xs font-medium text-sage-dark flex items-center gap-1">
            <span className="text-sage text-[0.5rem]">●</span> Disponible
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="font-serif text-2xl font-bold mb-1">{name}</div>
        <div className="text-xs text-sage-dark font-medium mb-2.5">
          {modality}{p.city ? ` · ${p.city}` : ''}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {specialties.map(s => (
            <span key={s} className="px-2.5 py-1 rounded-full bg-sage/[0.12] text-xs text-sage-dark font-medium">{s}</span>
          ))}
        </div>
        <div className="flex gap-4">
          {p.city && <span className="text-xs text-warm-mid">📍 {p.city}</span>}
          {price && <span className="text-xs text-warm-mid">💰 {price}</span>}
          {years && <span className="text-xs text-warm-mid">💬 {years}</span>}
        </div>
        {psych.bio && (
          <p className="text-xs text-warm-mid mt-2.5 leading-relaxed line-clamp-2">{psych.bio}</p>
        )}
      </div>
      {isTop && (
        <>
          <div className="overlay-like absolute top-8 left-5 font-serif text-3xl font-bold px-4 py-2 rounded-lg border-[3px] border-sage-dark text-sage-dark opacity-0 pointer-events-none rotate-[-15deg] transition-opacity">MATCH</div>
          <div className="overlay-nope absolute top-8 right-5 font-serif text-3xl font-bold px-4 py-2 rounded-lg border-[3px] border-red-500 text-red-500 opacity-0 pointer-events-none rotate-[15deg] transition-opacity">NOPE</div>
        </>
      )}
    </div>
  )
}

export default function SwipeStack({ psychs, onSwipeUpdate, onMatchFound, onInfo, swipeRef }) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [idx, setIdx] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const topCardRef = useRef(null)
  const drag = useRef({ active: false, startX: 0, currentX: 0 })

  const current = psychs[idx]
  const visible = psychs.slice(idx, idx + 3)
  const done = idx >= psychs.length

  const doSwipe = useCallback(async (dir) => {
    if (isSwiping || !current || !topCardRef.current) return
    setIsSwiping(true)

    const card = topCardRef.current
    const psychId = Number(card.dataset.id)
    const action = dir === 'right' ? 'like' : 'pass'

    const likeEl = card.querySelector('.overlay-like')
    const nopeEl = card.querySelector('.overlay-nope')
    if (dir === 'right' && likeEl) likeEl.style.opacity = '1'
    if (dir === 'left' && nopeEl) nopeEl.style.opacity = '1'

    card.style.transition = 'transform 0.4s ease, opacity 0.4s'
    card.style.transform = dir === 'right' ? 'translateX(120%) rotate(20deg)' : 'translateX(-120%) rotate(-20deg)'
    card.style.opacity = '0'

    try {
      const data = await swipeAction(token, psychId, action)
      onSwipeUpdate?.(psychId, action)
      if (data.match) {
        showToast('💚 ¡Match! Psicólogo/a agregado a tus matches.')
        onMatchFound?.()
      } else if (dir === 'right') {
        showToast('👍 ¡Agregado a tus matches!')
      }
    } catch {}

    setTimeout(() => {
      setIdx(prev => prev + 1)
      setIsSwiping(false)
    }, 420)
  }, [isSwiping, current, token, showToast, onMatchFound, onSwipeUpdate])

  useEffect(() => { swipeRef?.(doSwipe) }, [doSwipe, swipeRef])

  const handleDragStart = useCallback((e) => {
    if (isSwiping) return
    e.preventDefault()
    drag.current.active = true
    drag.current.startX = e.touches ? e.touches[0].clientX : e.clientX
    drag.current.currentX = 0
    if (topCardRef.current) topCardRef.current.style.transition = 'none'
  }, [isSwiping])

  useEffect(() => {
    function onMove(e) {
      if (!drag.current.active || !topCardRef.current) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const dx = clientX - drag.current.startX
      drag.current.currentX = dx
      const card = topCardRef.current
      card.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`
      const likeEl = card.querySelector('.overlay-like')
      const nopeEl = card.querySelector('.overlay-nope')
      if (likeEl) likeEl.style.opacity = dx > 50 ? Math.min((dx - 50) / 80, 1) : 0
      if (nopeEl) nopeEl.style.opacity = dx < -50 ? Math.min((-dx - 50) / 80, 1) : 0
    }

    function onEnd() {
      if (!drag.current.active) return
      drag.current.active = false
      const dx = drag.current.currentX
      if (dx > 100) doSwipe('right')
      else if (dx < -100) doSwipe('left')
      else if (topCardRef.current) {
        const card = topCardRef.current
        card.style.transition = 'transform 0.4s ease'
        card.style.transform = ''
        card.querySelectorAll('.overlay-like, .overlay-nope').forEach(el => { el.style.opacity = 0 })
      }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [doSwipe])

  const goBack = () => {
    if (idx > 0 && !isSwiping) setIdx(prev => prev - 1)
  }

  return (
    <div className="flex flex-col items-center gap-7">
      {psychs.length > 0 && (
        <div className="text-xs text-warm-mid">
          {done ? `${psychs.length} de ${psychs.length}` : `${idx + 1} de ${psychs.length}`}
        </div>
      )}

      {done ? (
        <div className="w-[360px] h-[520px] flex flex-col items-center justify-center gap-4 text-warm-mid text-center px-6">
          <div className="text-5xl">🌿</div>
          <div className="font-medium">¡Ya los viste todos!</div>
          <div className="text-sm">Podés volver a explorar desde el principio.</div>
          <button
            onClick={() => setIdx(0)}
            className="mt-2 px-6 py-2.5 rounded-xl bg-sage-dark text-white text-sm font-medium hover:bg-sage transition-all"
          >
            Ver de nuevo →
          </button>
        </div>
      ) : (
        <div className="relative w-[360px] h-[520px]">
          {[...visible].reverse().map((psych, ri) => {
            const visibleCount = visible.length
            const stackIndex = visibleCount - 1 - ri
            const isTop = ri === visibleCount - 1
            return (
              <PsychCard
                key={psych.id}
                psych={psych}
                stackIndex={stackIndex}
                isTop={isTop}
                topCardRef={isTop ? topCardRef : null}
                onDragStart={handleDragStart}
              />
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={goBack}
          disabled={idx === 0 || isSwiping}
          className="w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center text-lg hover:bg-amber-50 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Volver"
        >↩</button>
        <button
          onClick={() => doSwipe('left')}
          disabled={done || isSwiping}
          className="w-14 h-14 rounded-full bg-white shadow-card flex items-center justify-center text-2xl hover:bg-red-50 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Pasar"
        >✕</button>
        <button
          onClick={() => doSwipe('right')}
          disabled={done || isSwiping}
          className="w-16 h-16 rounded-full bg-sage-dark flex items-center justify-center text-3xl hover:bg-sage hover:scale-110 transition-all shadow-card disabled:opacity-30 disabled:cursor-not-allowed"
          title="Me interesa"
        >♥</button>
        <button
          onClick={() => current && onInfo?.(current)}
          disabled={done}
          className="w-14 h-14 rounded-full bg-white shadow-card flex items-center justify-center text-2xl hover:bg-blue-50 hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Ver perfil"
        >ℹ</button>
      </div>

      <div className="text-xs text-warm-mid">← Pasar &nbsp;|&nbsp; ♥ Me interesa →</div>
    </div>
  )
}
