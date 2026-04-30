import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { register } from '../api'

const CONDITIONS = [
  'Ansiedad', 'Depresión', 'Pareja', 'Autoestima',
  'Estrés laboral', 'Adolescencia', 'Trauma', 'Sexualidad',
  'Adicciones', 'Familiar',
]

const SPECIALTIES = [
  'TCC', 'Psicoanálisis', 'Gestalt', 'Sistémica', 'ACT',
  'Ansiedad', 'Depresión', 'Trauma', 'Pareja', 'Infancia',
  'Duelo', 'EMDR', 'Autoestima', 'Estrés laboral', 'Otra',
]

const MODALITIES = [
  { value: 'both', label: 'Online y Presencial' },
  { value: 'online', label: 'Solo Online' },
  { value: 'presential', label: 'Solo Presencial' },
]

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal font-normal text-warm-mid/60">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'px-4 py-3 rounded-xl border-[1.5px] border-warm-border bg-card-bg text-sm text-warm-dark outline-none focus:border-warm-dark transition-colors'

function ChipSelect({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs transition-all ${
            selected.includes(opt)
              ? 'bg-warm-dark text-cream border-warm-dark'
              : 'border-warm-border text-warm-mid hover:border-warm-dark hover:text-warm-dark'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function Register() {
  const { login: setAuth } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '', email: '', password: '', city: '',
  })
  const [soughtSpecialties, setSoughtSpecialties] = useState([])
  const [psyForm, setPsyForm] = useState({
    bio: '', license_number: '', specialty: 'TCC', modality: 'both', session_price: '',
    specialties: ['TCC'],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPsy = (k, v) => setPsyForm(f => ({ ...f, [k]: v }))
  const isPsy = role === 'psychologist'

  function toggleCondition(c) {
    setSoughtSpecialties(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c])
  }

  function toggleSpecialty(s) {
    setPsyForm(f => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...f.specialties, s],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.username || !form.email || !form.password) {
      setError('Completá usuario, email y contraseña.')
      return
    }

    const body = {
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      city: form.city,
      role,
    }

    if (!isPsy) {
      body.sought_specialties = soughtSpecialties
    } else {
      body.bio = psyForm.bio
      body.psychologist_profile = {
        specialties: psyForm.specialties.length ? psyForm.specialties : ['Otra'],
        modality: psyForm.modality,
        session_price: psyForm.session_price || null,
        license_number: psyForm.license_number,
        city: form.city,
      }
    }

    setLoading(true)
    try {
      const data = await register(body)
      setAuth(data.access, data.refresh, data.user)

      if (isPsy) {
        showToast(`¡Bienvenido/a, ${data.user.first_name || data.user.username}! Completá tu perfil y subí tu documentación.`)
        navigate('/profile')
      } else {
        showToast(`¡Bienvenido/a a Self, ${data.user.first_name || data.user.username}!`)
        navigate('/discover')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h2 className="font-serif text-4xl font-bold mb-2">Crear cuenta</h2>
      <p className="text-warm-mid mb-10">¿Sos paciente buscando ayuda, o profesional ofreciendo tus servicios?</p>

      {/* Role selector */}
      <div className="flex gap-3 mb-10">
        {[
          { value: 'patient', icon: '🌿', label: 'Soy paciente' },
          { value: 'psychologist', icon: '🩺', label: 'Soy psicólogo/a' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setRole(t.value)}
            className={`flex-1 py-4 rounded-2xl border-2 text-center transition-all ${
              role === t.value
                ? 'border-warm-dark bg-warm-dark/[0.06]'
                : 'border-warm-border bg-card-bg hover:border-warm-dark'
            }`}
          >
            <span className="block text-3xl mb-1.5">{t.icon}</span>
            <span className={`text-sm font-medium ${role === t.value ? 'text-warm-dark' : 'text-warm-mid'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">

          {/* Datos personales */}
          <Field label="Nombre">
            <input className={inputCls} placeholder="Ej: Sofía" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          </Field>
          <Field label="Apellido">
            <input className={inputCls} placeholder="Ej: Martínez" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </Field>
          <Field label="Usuario">
            <input className={inputCls} placeholder="Ej: sofia_m" value={form.username} onChange={e => set('username', e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} placeholder="tu@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Contraseña">
            <input type="password" className={inputCls} placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => set('password', e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <input className={inputCls} placeholder="Ej: Buenos Aires" value={form.city} onChange={e => set('city', e.target.value)} />
          </Field>

          {/* Paciente: qué busca */}
          {!isPsy && (
            <div className="col-span-2 max-sm:col-span-1">
              <Field label="¿Qué buscás trabajar?" hint="(opcional, seleccioná todo lo que aplique)">
                <ChipSelect options={CONDITIONS} selected={soughtSpecialties} onToggle={toggleCondition} />
              </Field>
            </div>
          )}

          {/* Psicólogo: campos profesionales */}
          {isPsy && (
            <>
              <Field label="N° de matrícula">
                <input className={inputCls} placeholder="Ej: MN 12345" value={psyForm.license_number} onChange={e => setPsy('license_number', e.target.value)} />
              </Field>
              <Field label="Modalidad">
                <select className={inputCls} value={psyForm.modality} onChange={e => setPsy('modality', e.target.value)}>
                  {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Precio por sesión ($)" hint="(opcional)">
                <input type="number" className={inputCls} placeholder="Ej: 8000" value={psyForm.session_price} onChange={e => setPsy('session_price', e.target.value)} />
              </Field>

              <div className="col-span-2 max-sm:col-span-1">
                <Field label="Especialidades">
                  <ChipSelect options={SPECIALTIES} selected={psyForm.specialties} onToggle={toggleSpecialty} />
                </Field>
              </div>
              <div className="col-span-2 max-sm:col-span-1">
                <Field label="Bio profesional" hint="(opcional)">
                  <textarea
                    className={`${inputCls} resize-y min-h-[90px]`}
                    placeholder="Contá brevemente tu enfoque, experiencia y con quiénes trabajás..."
                    value={psyForm.bio}
                    onChange={e => setPsy('bio', e.target.value)}
                  />
                </Field>
              </div>

              {/* Info verificación */}
              <div className="col-span-2 max-sm:col-span-1 bg-warm-border/20 border border-warm-border rounded-xl px-4 py-3 text-xs text-warm-mid leading-relaxed">
                <strong className="text-warm-dark">Verificación de cuenta:</strong> una vez registrado/a, podés subir tu documentación profesional desde tu perfil. El equipo SELF la revisará y aprobará tu cuenta para aparecer en el buscador.
              </div>
            </>
          )}

          {error && (
            <div className="col-span-2 max-sm:col-span-1 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="col-span-2 max-sm:col-span-1 flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
            <p className="text-center text-xs text-warm-mid">
              ¿Ya tenés cuenta?{' '}
              <button type="button" onClick={() => navigate('/')} className="text-warm-dark underline">
                Iniciá sesión
              </button>
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
