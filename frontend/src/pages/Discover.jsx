import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FilterSidebar from '../components/FilterSidebar'
import SwipeStack from '../components/SwipeStack'
import MatchesPanel from '../components/MatchesPanel'
import PsychDetailModal from '../components/PsychDetailModal'
import { fetchPsychologists, fetchMatches } from '../api'

export default function Discover() {
  const { token, openLoginModal } = useAuth()
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPsych, setSelectedPsych] = useState(null)
  const swipeDoRef = useRef(null)

  useEffect(() => {
    if (!token) { openLoginModal(); navigate('/') }
  }, [token, openLoginModal, navigate])

  const load = useCallback(async (filters = {}) => {
    if (!token) return
    setLoading(true); setError('')
    try {
      setQueue(await fetchPsychologists(token, filters))
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

  if (!token) return null

  return (
    <>
      <div
        className="grid min-h-[calc(100vh-65px)]"
        style={{ gridTemplateColumns: '280px 1fr 280px' }}
      >
        <div className="max-lg:hidden">
          <FilterSidebar onApply={filters => load(filters)} />
        </div>

        <div className="flex flex-col items-center justify-center gap-2 py-10 px-5">
          <div className="text-xs text-warm-mid mb-4">
            🧭{' '}
            {loading ? 'Cargando...'
              : error || (queue.length > 0
                ? `${queue.length} psicólogo${queue.length > 1 ? 's' : ''} para explorar`
                : '¡Ya los viste todos! 🌿')}
          </div>

          {loading ? (
            <div className="w-[360px] h-[520px] flex flex-col items-center justify-center gap-3 text-warm-mid">
              <div className="text-5xl">⏳</div>
              <div>Cargando...</div>
            </div>
          ) : error ? (
            <div className="w-[360px] h-[520px] flex flex-col items-center justify-center gap-3 text-warm-mid text-center px-6">
              <div className="text-5xl">⚠️</div>
              <div>{error}</div>
              <code className="text-xs bg-warm-dark/5 px-3 py-1 rounded-lg">python manage.py runserver</code>
            </div>
          ) : (
            <SwipeStack
              queue={queue}
              setQueue={setQueue}
              onMatchFound={loadMatches}
              onInfo={psych => setSelectedPsych(psych)}
              swipeRef={fn => { swipeDoRef.current = fn }}
            />
          )}
        </div>

        <div className="max-lg:hidden">
          <MatchesPanel matches={matches} />
        </div>
      </div>

      <PsychDetailModal
        psych={selectedPsych}
        index={queue.findIndex(p => p.id === selectedPsych?.id)}
        onClose={() => setSelectedPsych(null)}
        onSwipe={dir => swipeDoRef.current?.(dir)}
      />
    </>
  )
}
