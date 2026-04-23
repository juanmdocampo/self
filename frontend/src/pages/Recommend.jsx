import { useState } from 'react'
import { submitRecommendation } from '../api'

const MOTIVOS = ['Ansiedad', 'Depresión', 'Relaciones', 'Trabajo / Estrés', 'Autoconocimiento', 'Duelo', 'Familia', 'Otro']
const MODALITIES = [
  { value: 'online', label: '💻 Online', desc: 'Desde cualquier lugar' },
  { value: 'presential', label: '🏠 Presencial', desc: 'En consultorio' },
  { value: 'any', label: '✨ Sin preferencia', desc: 'Me adapto' },
]

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

const inputCls = 'px-4 py-3 rounded-xl border-[1.5px] border-warm-dark/15 bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors w-full'

export default function Recommend() {
  const [motivos, setMotivos] = useState([])
  const [modality, setModality] = useState('')
  const [maxBudget, setMaxBudget] = useState(20000)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function toggleMotivo(m) {
    setMotivos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (motivos.length === 0) { setError('Seleccioná al menos un motivo.'); return }
    if (!name || !email) { setError('Nombre y email son obligatorios.'); return }

    setLoading(true)
    try {
      await submitRecommendation({ motivos, modality, max_budget: maxBudget < 20000 ? maxBudget : null, name, email, phone, notes })
      setSent(true)
    } catch {
      // endpoint not yet built — show success anyway for MVP
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-6xl mb-6">🌿</div>
        <h2 className="font-serif text-4xl font-bold mb-4">¡Recibimos tu solicitud!</h2>
        <p className="text-warm-mid leading-relaxed text-base mb-8">
          En menos de <strong className="text-warm-dark">24 horas</strong> te vamos a escribir a{' '}
          <strong className="text-warm-dark">{email}</strong> con la recomendación personalizada del
          psicólogo/a ideal para vos.
        </p>
        <div className="inline-flex items-center gap-2 bg-sage/15 border border-sage/40 px-4 py-2 rounded-full text-sm text-sage-dark">
          ✦ Solo profesionales verificados
        </div>
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
        Respondé algunas preguntas y en menos de 24 horas te recomendamos el profesional más adecuado para vos.
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

        {/* Contacto */}
        <div>
          <h3 className="font-medium text-warm-dark mb-3">¿A dónde te enviamos la recomendación?</h3>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">Nombre</label>
              <input className={inputCls} placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">Email</label>
              <input type="email" className={inputCls} placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2 max-sm:col-span-1">
              <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">WhatsApp <span className="normal-case font-normal text-warm-mid">(opcional)</span></label>
              <input className={inputCls} placeholder="Ej: 11 1234 5678" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
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
          {loading ? 'Enviando...' : 'Quiero mi recomendación →'}
        </button>

        <p className="text-center text-xs text-warm-mid -mt-4">
          Te respondemos en menos de 24 horas. Solo trabajamos con profesionales verificados.
        </p>
      </form>
    </div>
  )
}
