import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPsychologists } from '../api'

const MOTIVOS = ['Ansiedad', 'Depresión', 'Relaciones', 'Trabajo / Estrés', 'Autoconocimiento', 'Duelo', 'Familia', 'Otro']
const MODALITIES = [
  { value: 'online', label: '💻 Online', desc: 'Desde cualquier lugar' },
  { value: 'presential', label: '🏠 Presencial', desc: 'En consultorio' },
  { value: 'any', label: '✨ Sin preferencia', desc: 'Me adapto' },
]

const MOTIVO_SPECIALTY = {
  'Ansiedad': 'Ansiedad',
  'Depresión': 'Depresión',
  'Relaciones': 'Pareja',
  'Trabajo / Estrés': 'Estrés laboral',
  'Autoconocimiento': 'Autoestima',
  'Duelo': 'Trauma',
  'Familia': 'Familia',
  'Otro': null,
}

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border-[1.5px] text-sm transition-all ${
        selected
          ? 'bg-warm-dark text-cream border-warm-dark'
          : 'border-warm-dark/15 text-warm-mid hover:border-warm-dark hover:text-warm-dark'
      }`}
    >
      {label}
    </button>
  )
}

function ResultCard({ psych, matchedSpecialties }) {
  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const specialties = p.specialties || []
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : null
  const avatar = AVATARS[psych.id % AVATARS.length]
  const hasMatch = specialties.some(s => matchedSpecialties.includes(s))

  return (
    <div className={`bg-card-bg rounded-2xl shadow-card overflow-hidden flex flex-col ${hasMatch ? 'ring-2 ring-sage-dark/40' : ''}`}>
      <div className="h-44 bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-5xl relative">
        {psych.avatar
          ? <img src={psych.avatar} alt={name} className="absolute inset-0 w-full h-full object-cover" />
          : <span>{avatar}</span>
        }
        {hasMatch && (
          <div className="absolute top-2 left-2 bg-sage-dark text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">✦ Recomendado</div>
        )}
        {p.is_accepting_patients && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-sage-dark flex items-center gap-1">
            <span className="text-green-500 text-[0.5rem]">●</span> Disponible
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base font-bold leading-tight">{name}</h3>
          {price && <span className="text-sm font-semibold text-sage-dark flex-shrink-0">{price}</span>}
        </div>

        <div className="text-xs text-sage-dark font-medium">
          {[MODALITY_LABEL[p.modality], p.city].filter(Boolean).join(' · ')}
        </div>

        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specialties.slice(0, 3).map(s => (
              <span
                key={s}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  matchedSpecialties.includes(s)
                    ? 'bg-sage-dark text-white'
                    : 'bg-sage/[0.12] text-sage-dark'
                }`}
              >{s}</span>
            ))}
            {specialties.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-warm-dark/[0.06] text-xs text-warm-mid">+{specialties.length - 3}</span>
            )}
          </div>
        )}

        {psych.bio && (
          <p className="text-xs text-warm-mid leading-relaxed line-clamp-2 flex-1">{psych.bio}</p>
        )}

        <Link
          to={`/psicologos/${psych.id}`}
          className="mt-auto w-full py-2 rounded-xl text-sm font-medium text-center bg-warm-dark text-cream hover:bg-sage-dark transition-all"
        >
          Ver perfil completo →
        </Link>
      </div>
    </div>
  )
}

const inputCls = 'px-4 py-3 rounded-xl border-[1.5px] border-warm-dark/15 bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors w-full'

export default function Recommend() {
  const { token } = useAuth()
  const [motivos, setMotivos] = useState([])
  const [modality, setModality] = useState('')
  const [maxBudget, setMaxBudget] = useState(20000)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)

  function toggleMotivo(m) {
    setMotivos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (motivos.length === 0) { setError('Seleccioná al menos un motivo.'); return }

    setLoading(true)
    try {
      const filters = {}
      if (modality && modality !== 'any') filters.modality = modality
      if (maxBudget < 20000) filters.maxPrice = maxBudget

      const psychs = await fetchPsychologists(token, filters)

      const matchedSpecialties = motivos.map(m => MOTIVO_SPECIALTY[m]).filter(Boolean)

      const sorted = [...psychs].sort((a, b) => {
        const aSpecs = a.psychologist_profile?.specialties || []
        const bSpecs = b.psychologist_profile?.specialties || []
        const aMatch = aSpecs.some(s => matchedSpecialties.includes(s))
        const bMatch = bSpecs.some(s => matchedSpecialties.includes(s))
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
        const aAccepting = a.psychologist_profile?.is_accepting_patients ? 1 : 0
        const bAccepting = b.psychologist_profile?.is_accepting_patients ? 1 : 0
        return bAccepting - aAccepting
      })

      setResults({ psychs: sorted, matchedSpecialties })
    } catch {
      setError('Error al buscar psicólogos. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (results) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start sm:items-center justify-between gap-4 mb-8 flex-col sm:flex-row">
          <div>
            <h2 className="font-serif text-3xl font-bold text-warm-dark">Tus psicólogos recomendados</h2>
            <p className="text-warm-mid mt-1">
              {results.psychs.length > 0
                ? `Encontramos ${results.psychs.length} profesional${results.psychs.length !== 1 ? 'es' : ''} para vos.`
                : 'No encontramos coincidencias con esos criterios.'
              }
            </p>
          </div>
          <button
            onClick={() => setResults(null)}
            className="px-4 py-2 rounded-full border-[1.5px] border-warm-dark/20 text-sm text-warm-mid hover:border-warm-dark hover:text-warm-dark transition-all whitespace-nowrap"
          >
            ← Nueva búsqueda
          </button>
        </div>

        {results.psychs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🌿</div>
            <p className="text-warm-mid">
              Probá con otros criterios o explorá todos los perfiles en{' '}
              <Link to="/discover" className="text-sage-dark underline">Descubrir</Link>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {results.psychs.map(psych => (
              <ResultCard
                key={psych.id}
                psych={psych}
                matchedSpecialties={results.matchedSpecialties}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="inline-flex items-center gap-2 bg-sage/15 border border-sage/40 px-3.5 py-1.5 rounded-full text-xs text-sage-dark font-medium mb-6">
        ✦ Recomendación personalizada
      </div>
      <h2 className="font-serif text-4xl font-bold mb-3">Te encontramos el psicólogo ideal</h2>
      <p className="text-warm-mid leading-relaxed mb-10">
        Respondé algunas preguntas y te mostramos los profesionales más adecuados para vos.
        Sin costo, sin compromiso.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* Motivos */}
        <div>
          <h3 className="font-medium text-warm-dark mb-1">¿Por qué querés consultar?</h3>
          <p className="text-xs text-warm-mid mb-3">Podés elegir más de uno.</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS.map(m => (
              <Chip key={m} label={m} selected={motivos.includes(m)} onClick={() => toggleMotivo(m)} />
            ))}
          </div>
        </div>

        {/* Modalidad */}
        <div>
          <h3 className="font-medium text-warm-dark mb-3">¿Cómo preferís la sesión?</h3>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            {MODALITIES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setModality(m.value)}
                className={`py-4 px-3 rounded-2xl border-2 text-center transition-all ${
                  modality === m.value
                    ? 'border-sage-dark bg-sage/[0.08]'
                    : 'border-warm-dark/15 bg-white hover:border-sage-dark'
                }`}
              >
                <div className={`text-sm font-medium ${modality === m.value ? 'text-sage-dark' : 'text-warm-mid'}`}>{m.label}</div>
                <div className="text-xs text-warm-mid mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Presupuesto */}
        <div>
          <h3 className="font-medium text-warm-dark mb-1">Presupuesto por sesión</h3>
          <p className="text-xs text-warm-mid mb-3">
            {maxBudget >= 20000 ? 'Sin límite' : `Hasta $${maxBudget.toLocaleString()}`}
          </p>
          <input
            type="range"
            min={2000}
            max={20000}
            step={500}
            value={maxBudget}
            onChange={e => setMaxBudget(Number(e.target.value))}
            className="w-full accent-sage-dark"
          />
          <div className="flex justify-between text-xs text-warm-mid mt-1">
            <span>$2.000</span>
            <span>Sin límite</span>
          </div>
        </div>

        {/* Notas */}
        <div>
          <h3 className="font-medium text-warm-dark mb-2">¿Algo más que quieras contarnos? <span className="text-warm-mid font-normal">(opcional)</span></h3>
          <textarea
            className={`${inputCls} resize-y min-h-[80px]`}
            placeholder="Ej: Busco alguien con experiencia en adultos mayores, o que tenga turnos por la noche..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-warm-dark text-cream text-base font-medium hover:bg-sage-dark hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Buscando...' : 'Encontrar mi psicólogo →'}
        </button>

        <p className="text-center text-xs text-warm-mid -mt-4">
          Solo trabajamos con profesionales verificados.
        </p>
      </form>
    </div>
  )
}
