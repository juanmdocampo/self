import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchFavorites, deleteFavorite, getOrCreateConversation } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'hoy'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'ayer'
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function FavoriteCard({ favorite, isPatient, onRemove, removing, onChat, chatLoading }) {
  const person = isPatient ? favorite.psychologist : favorite.patient
  const name = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.username
  const p = person.psychologist_profile || {}
  const specialties = (p.specialties || []).slice(0, 2).join(', ') || null
  const modality = MODALITY_LABEL[p.modality] || null
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : null
  const city = p.city || null

  return (
    <div className="bg-card-bg rounded-2xl p-5 flex gap-4 items-start shadow-sm border border-warm-dark/[0.06]">
      <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden border-2 border-sage bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-2xl">
        {person.avatar
          ? <img src={person.avatar} alt={name} className="w-full h-full object-cover" />
          : AVATARS[person.id % AVATARS.length]
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-medium text-warm-dark">{name}</div>
            {specialties && <div className="text-xs text-sage-dark mt-0.5">{specialties}</div>}
          </div>
          <div className="text-xs text-warm-mid flex-shrink-0">{formatDate(favorite.created_at)}</div>
        </div>

        {isPatient && (
          <div className="flex flex-wrap gap-2 mt-2">
            {modality && <span className="text-xs bg-sage/[0.10] text-sage-dark px-2 py-0.5 rounded-full">{modality}</span>}
            {city && <span className="text-xs text-warm-mid">📍 {city}</span>}
            {price && <span className="text-xs text-warm-mid">💰 {price}/sesión</span>}
          </div>
        )}

        {person.bio && (
          <p className="text-xs text-warm-mid mt-2 line-clamp-2 leading-relaxed">{person.bio}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {isPatient && (
          <button
            onClick={() => onChat(favorite.psychologist.id)}
            disabled={chatLoading}
            className="text-xs px-3 py-1.5 rounded-full bg-sage-dark text-white font-medium hover:bg-sage transition-all disabled:opacity-50"
          >
            Chatear
          </button>
        )}
        <button
          onClick={() => onRemove(favorite.id)}
          disabled={removing}
          className="text-xs text-warm-mid hover:text-red-500 transition-colors disabled:opacity-40"
          title="Quitar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function Favorites() {
  const { token, currentUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)

  const isPatient = currentUser?.role === 'patient'

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      setFavorites(await fetchFavorites(token))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleChat = async (psychologistId) => {
    setChatLoading(true)
    try {
      const conv = await getOrCreateConversation(token, psychologistId)
      navigate(`/chat?c=${conv.id}`)
    } catch {
      showToast('No se pudo abrir el chat. Intentá de nuevo.')
    } finally {
      setChatLoading(false)
    }
  }

  const handleRemove = async (favoriteId) => {
    setRemoving(favoriteId)
    try {
      await deleteFavorite(token, favoriteId)
      setFavorites(prev => prev.filter(m => m.id !== favoriteId))
      showToast('Favorito eliminado.')
    } catch {
      showToast('No se pudo eliminar. Intentá de nuevo.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold">
          {isPatient ? 'Tus favoritos ✨' : 'Me recomiendan 💚'}
        </h1>
        <p className="text-warm-mid mt-2 text-sm">
          {isPatient
            ? 'Los psicólogos que elegiste. Contactalos cuando estés listo/a.'
            : 'Pacientes que te eligieron a vos.'}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-warm-mid">
          <div className="text-4xl">⏳</div>
          <div>Cargando favoritos...</div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-warm-mid text-center">
          <div className="text-5xl">{isPatient ? '🌿' : '💭'}</div>
          <div className="font-medium">
            {isPatient ? 'Todavía no tenés favoritos.' : 'Nadie te eligió todavía.'}
          </div>
          <div className="text-sm">
            {isPatient
              ? 'Explorá psicólogos en Descubrir y dales like.'
              : 'Completá tu perfil para aparecer en el feed de pacientes.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map(favorite => (
            <FavoriteCard
              key={favorite.id}
              favorite={favorite}
              isPatient={isPatient}
              onRemove={handleRemove}
              removing={removing === favorite.id}
              onChat={handleChat}
              chatLoading={chatLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
