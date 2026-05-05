import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchPsychologist, swipeAction } from '../api'

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

  useEffect(() => {
    fetchPsychologist(token, id)
      .then(data => {
        setPsych(data)
        setLiked(data.swipe_status === 'like')
      })
      .catch(() => navigate('/discover'))
      .finally(() => setLoading(false))
  }, [id, token, navigate])

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
