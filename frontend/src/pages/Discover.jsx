import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import FilterSidebar from '../components/FilterSidebar'
import SwipeStack from '../components/SwipeStack'
import MatchesPanel from '../components/MatchesPanel'
import PsychDetailModal from '../components/PsychDetailModal'
import { fetchPsychologists, fetchMatches } from '../api'

export default function Discover() {
  const { token } = useAuth()
  const [psychs, setPsychs] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPsych, setSelectedPsych] = useState(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const swipeDoRef = useRef(null)

  const load = useCallback(async (filters = {}) => {
    if (!token) return
    setLoading(true); setError('')
    try {
      setPsychs(await fetchPsychologists(token, filters))
    } catch {
      setError('Error al cargar. ¿Está el servidor corriendo?')
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadMatches = useCallback(async () => {
    if (!token) return
    setMatches(await fetchMatches(token))
  }, [token])

  useEffect(() => { load(); loadMatches() }, [load, loadMatches])

  const handleSwipeUpdate = useCallback((psychId, action) => {
    setPsychs(prev => prev.map(p => p.id === psychId ? { ...p, swipe_status: action } : p))
    if (action === 'like') loadMatches()
  }, [loadMatches])

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

      <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[280px_1fr_280px]">

        {/* Left sidebar — desktop only */}
        <div className="hidden lg:block">
          <FilterSidebar onApply={load} />
        </div>

        {/* Center — stack */}
        <div className="flex flex-col items-center justify-start lg:justify-center gap-2 py-6 sm:py-10 px-3 sm:px-5">

          {/* Mobile top bar */}
          <div className="flex lg:hidden items-center justify-between w-full max-w-[360px] mb-2">
            <span className="text-xs text-warm-mid">
              🧭{' '}
              {loading ? 'Cargando...' : error ? 'Error' : `${psychs.length} psicólogos`}
            </span>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-warm-dark/20 text-xs text-warm-dark hover:bg-warm-dark/[0.05] transition-all"
            >
              ⚙ Filtros
            </button>
          </div>

          {loading ? (
            <div className="w-full max-w-[360px] h-[460px] sm:h-[520px] flex flex-col items-center justify-center gap-3 text-warm-mid">
              <div className="text-5xl">⏳</div>
              <div>Cargando...</div>
            </div>
          ) : error ? (
            <div className="w-full max-w-[360px] h-[460px] sm:h-[520px] flex flex-col items-center justify-center gap-3 text-warm-mid text-center px-6">
              <div className="text-5xl">⚠️</div>
              <div>{error}</div>
            </div>
          ) : (
            <SwipeStack
              psychs={psychs}
              onSwipeUpdate={handleSwipeUpdate}
              onMatchFound={loadMatches}
              onInfo={psych => setSelectedPsych(psych)}
              swipeRef={fn => { swipeDoRef.current = fn }}
            />
          )}
        </div>

        {/* Right sidebar — desktop only */}
        <div className="hidden lg:block">
          <MatchesPanel matches={matches} />
        </div>
      </div>

      <PsychDetailModal
        psych={selectedPsych}
        index={psychs.findIndex(p => p.id === selectedPsych?.id)}
        onClose={() => setSelectedPsych(null)}
        onSwipe={dir => swipeDoRef.current?.(dir)}
      />
    </>
  )
}
