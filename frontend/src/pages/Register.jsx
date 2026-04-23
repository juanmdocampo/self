import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { register } from '../api'

const SPECIALTIES = ['TCC', 'Psicoanálisis', 'Gestalt', 'Sistémica', 'ACT', 'Otra']
const MODALITIES = [
  { value: 'both', label: 'Online y Presencial' },
  { value: 'online', label: 'Solo Online' },
  { value: 'presential', label: 'Solo Presencial' },
]

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'px-4 py-3 rounded-xl border-[1.5px] border-warm-dark/15 bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors'

export default function Register() {
  const { login: setAuth } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '', email: '', password: '',
    bio: '', license_number: '', specialty: 'TCC', modality: 'both', session_price: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isPsy = role === 'psychologist'

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
      role,
    }
    if (isPsy) {
      body.bio = form.bio
      body.psychologist_profile = {
        specialties: [form.specialty],
        modality: form.modality,
        session_price: form.session_price || null,
        license_number: form.license_number,
      }
    }

    setLoading(true)
    try {
      const data = await register(body)
      setAuth(data.access, data.refresh, data.user)
      showToast(`¡Bienvenido/a a Self, ${data.user.first_name || data.user.username}! 🌿`)
      navigate('/discover')
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

      {/* Type selector */}
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
                ? 'border-sage-dark bg-sage/[0.08]'
                : 'border-warm-dark/15 bg-white hover:border-sage-dark'
            }`}
          >
            <span className="block text-3xl mb-1.5">{t.icon}</span>
            <span className={`text-sm font-medium ${role === t.value ? 'text-sage-dark' : 'text-warm-mid'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
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

          {isPsy && (
            <>
              <Field label="N° de matrícula">
                <input className={inputCls} placeholder="Ej: MN 12345" value={form.license_number} onChange={e => set('license_number', e.target.value)} />
              </Field>
              <Field label="Especialidad principal">
                <select className={inputCls} value={form.specialty} onChange={e => set('specialty', e.target.value)}>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Modalidad">
                <select className={inputCls} value={form.modality} onChange={e => set('modality', e.target.value)}>
                  {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Precio por sesión ($)">
                <input type="number" className={inputCls} placeholder="Ej: 5000" value={form.session_price} onChange={e => set('session_price', e.target.value)} />
              </Field>
              <div className="col-span-2 max-sm:col-span-1">
                <Field label="Bio profesional">
                  <textarea
                    className={`${inputCls} resize-y min-h-[100px]`}
                    placeholder="Contá brevemente tu enfoque, experiencia y con quiénes trabajás..."
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                  />
                </Field>
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
              className="w-full py-4 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:bg-sage-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
            <p className="text-center text-xs text-warm-mid">
              ¿Ya tenés cuenta?{' '}
              <button type="button" onClick={() => navigate('/')} className="text-sage-dark underline">
                Iniciá sesión
              </button>
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
