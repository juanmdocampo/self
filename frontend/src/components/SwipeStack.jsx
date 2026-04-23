import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { swipeAction } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

function PsychCard({ psych, index, isTop, topCardRef, onDragStart }) {
  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const specialties = (p.specialties || []).slice(0, 3)
  const modality = MODALITY_LABEL[p.modality] || ''
  const avatar = AVATARS[index % AVATARS.length]
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : ''
  const years = p.years_experience ? `${p.years_experience} años` : ''

  const stackClass = ['', 'rotate-[-2deg] translate-y-2', 'rotate-[2deg] translate-y-4'][Math.min(index, 2)] || 'rotate-[-1deg] translate-y-5'

  return (
    <div
      ref={isTop ? topCardRef : null}
      data-id={psych.id}
      className={`absolute w-[360px] h-[520px] rounded-3xl bg-card-bg shadow-card overflow-hidden select-none ${isTop ? 'z-30 cursor-grab' : ''} ${stackClass}`}
      style={{ zIndex: 3 - Math.min(index, 2) }}
      onMouseDown={isTop ? onDragStart : undefined}
      onTouchStart={isTop ? onDragStart : undefined}
    >
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

export default function SwipeStack({ queue, setQueue, onMatchFound, onInfo, swipeRef }) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [isSwiping, setIsSwiping] = useState(false)
  const topCardRef = useRef(null)
  const drag = useRef({ active: false, startX: 0, currentX: 0 })

  const doSwipe = useCallback(async (dir) => {
    if (isSwiping || queue.length === 0 || !topCardRef.current) return
    setIsSwiping(true)

    const card = topCardRef.current
    const psychId = card.dataset.id

    const likeEl = card.querySelector('.overlay-like')
    const nopeEl = card.querySelector('.overlay-nope')
    if (dir === 'right' && likeEl) likeEl.style.opacity = '1'
    if (dir === 'left' && nopeEl) nopeEl.style.opacity = '1'

    card.style.transition = 'transform 0.4s ease, opacity 0.4s'
    card.style.transform = dir === 'right' ? 'translateX(120%) rotate(20deg)' : 'translateX(-120%) rotate(-20deg)'
    card.style.opacity = '0'

    try {
      const data = await swipeAction(token, psychId, dir === 'right' ? 'like' : 'pass')
      if (data.match) {
        showToast('💚 ¡Match! Psicólogo/a agregado a tus matches.')
        onMatchFound?.()
      } else if (dir === 'right') {
        showToast('👍 ¡Les escribiremos cuando acepten!')
      }
    } catch {}

    setTimeout(() => {
      setQueue(prev => prev.slice(1))
      setIsSwiping(false)
    }, 420)
  }, [isSwiping, queue, token, showToast, onMatchFound, setQueue])

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

  return (
    <div className="flex flex-col items-center gap-7">
      {queue.length === 0 ? (
        <div className="w-[360px] h-[520px] flex flex-col items-center justify-center gap-3 text-warm-mid text-center px-6">
          <div className="text-5xl">🌿</div>
          <div className="font-medium">¡Ya los viste todos!</div>
          <div className="text-sm">Volvé más tarde para ver nuevos psicólogos.</div>
        </div>
      ) : (
        <div className="relative w-[360px] h-[520px]">
          {[...queue].slice(0, 3).reverse().map((psych, ri) => {
            const visibleCount = Math.min(queue.length, 3)
            const idx = visibleCount - 1 - ri
            const isTop = ri === visibleCount - 1
            return (
              <PsychCard
                key={psych.id}
                psych={psych}
                index={idx}
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
          onClick={() => doSwipe('left')}
          className="w-14 h-14 rounded-full bg-white shadow-card flex items-center justify-center text-2xl hover:bg-red-50 hover:scale-110 transition-all"
          title="Pasar"
        >✕</button>
        <button
          onClick={() => doSwipe('right')}
          className="w-16 h-16 rounded-full bg-sage-dark flex items-center justify-center text-3xl hover:bg-sage hover:scale-110 transition-all shadow-card"
          title="Me interesa"
        >♥</button>
        <button
          onClick={() => queue[0] && onInfo?.(queue[0])}
          className="w-14 h-14 rounded-full bg-white shadow-card flex items-center justify-center text-2xl hover:bg-blue-50 hover:scale-110 transition-all"
          title="Ver perfil"
        >ℹ</button>
      </div>

      <div className="text-xs text-warm-mid">← Pasar &nbsp;|&nbsp; ♥ Me interesa →</div>
    </div>
  )
}
