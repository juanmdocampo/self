import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import FilterSidebar from '../components/FilterSidebar'
import PsychDetailModal from '../components/PsychDetailModal'
import { fetchPsychologists, swipeAction } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

function PsychCard({ psych, onLike, onInfo, liking }) {
  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const specialties = p.specialties || []
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : null
  const avatar = AVATARS[psych.id % AVATARS.length]
  const liked = psych.swipe_status === 'like'

  return (
    <div className="bg-card-bg rounded-2xl shadow-card overflow-hidden flex flex-col">
      <div
        className="h-44 sm:h-52 bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-5xl cursor-pointer relative"
        onClick={() => onInfo(psych)}
      >
        {psych.avatar
          ? <img src={psych.avatar} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          : <span>{avatar}</span>
        }
        {liked && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">♥ Elegido</div>
        )}
        {p.is_accepting_patients && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-sage-dark flex items-center gap-1">
            <span className="text-green-500 text-[0.5rem]">●</span> Disponible
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-serif text-base font-bold leading-tight cursor-pointer hover:text-sage-dark transition-colors"
            onClick={() => onInfo(psych)}
          >
            {name}
          </h3>
          {price && <span className="text-sm font-semibold text-sage-dark flex-shrink-0">{price}</span>}
        </div>

        <div className="text-xs text-sage-dark font-medium">
          {[MODALITY_LABEL[p.modality], p.city].filter(Boolean).join(' · ')}
        </div>

        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specialties.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-sage/[0.12] text-xs text-sage-dark font-medium">{s}</span>
            ))}
            {specialties.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-warm-dark/[0.06] text-xs text-warm-mid">+{specialties.length - 3}</span>
            )}
          </div>
        )}

        {psych.bio && (
          <p className="text-xs text-warm-mid leading-relaxed line-clamp-2 flex-1">{psych.bio}</p>
        )}

        <button
          onClick={onLike}
          disabled={liking}
          className={`mt-auto w-full py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60 ${
            liked
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-warm-dark text-cream hover:bg-sage-dark'
          }`}
        >
          {liked ? '♥ Elegido' : '♡ Me interesa'}
        </button>
      </div>
    </div>
  )
}

export default function Discover() {
  const { token, openLoginModal } = useAuth()
  const { showToast } = useToast()
  const [psychs, setPsychs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPsych, setSelectedPsych] = useState(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [liking, setLiking] = useState({})

  const load = useCallback(async (filters = {}) => {
    setLoading(true); setError('')
    try {
      setPsychs(await fetchPsychologists(token, filters))
    } catch {
      setError('Error al cargar. ¿Está el servidor corriendo?')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleLike = useCallback(async (psych) => {
    if (!token) { openLoginModal(); return }
    const liked = psych.swipe_status === 'like'
    const newAction = liked ? 'pass' : 'like'
    setLiking(prev => ({ ...prev, [psych.id]: true }))
    try {
      await swipeAction(token, psych.id, newAction)
      setPsychs(prev => prev.map(p => p.id === psych.id ? { ...p, swipe_status: newAction } : p))
      if (newAction === 'like') showToast('💚 ¡Agregado a tus favoritos!')
      else showToast('Eliminado de favoritos.')
    } catch {}
    setLiking(prev => ({ ...prev, [psych.id]: false }))
  }, [token, openLoginModal, showToast])

  const handleApplyFilters = (filters) => {
    load(filters)
    setShowMobileFilters(false)
  }

  return (
    <>
      {/* Mobile filter sheet */}
      {showMobileFilters && (
        <div
          className="lg:hidden fixed inset-0 bg-warm-dark/40 backdrop-blur-sm z-[200] flex flex-col justify-end"
          onClick={() => setShowMobileFilters(false)}
        >
          <div
            className="bg-cream rounded-t-3xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="font-serif text-xl font-bold">Filtros</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-8 h-8 rounded-full bg-warm-dark/[0.06] flex items-center justify-center text-warm-dark text-lg"
              >×</button>
            </div>
            <FilterSidebar onApply={handleApplyFilters} />
          </div>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-65px)]">
        {/* Left sidebar — desktop only */}
        <div className="hidden lg:block w-[260px] flex-shrink-0">
          <FilterSidebar onApply={load} />
        </div>

        {/* Main grid */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-2xl font-bold text-warm-dark">
              {loading ? 'Cargando...' : error ? 'Error' : `${psychs.length} psicólogo${psychs.length !== 1 ? 's' : ''}`}
            </h1>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-warm-dark/20 text-xs text-warm-dark hover:bg-warm-dark/[0.05] transition-all"
            >
              ⚙ Filtros
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-warm-mid">
              <div className="text-4xl">⏳</div>
              <div>Cargando...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-warm-mid text-center">
              <div className="text-4xl">⚠️</div>
              <div>{error}</div>
            </div>
          ) : psychs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-warm-mid text-center">
              <div className="text-4xl">🌿</div>
              <div className="font-medium">No hay psicólogos disponibles.</div>
              <div className="text-sm">Probá ajustar los filtros.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {psychs.map(psych => (
                <PsychCard
                  key={psych.id}
                  psych={psych}
                  onLike={() => handleLike(psych)}
                  onInfo={setSelectedPsych}
                  liking={!!liking[psych.id]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <PsychDetailModal
        psych={selectedPsych}
        index={psychs.findIndex(p => p.id === selectedPsych?.id)}
        onClose={() => setSelectedPsych(null)}
        onSwipe={() => {}}
      />
    </>
  )
}
