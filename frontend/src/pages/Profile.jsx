import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchMe, updateProfile, uploadAvatar, uploadDocument, fetchRecurringRules, createRecurringRule, deleteRecurringRule } from '../api'

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

const inputCls = 'px-4 py-3 rounded-xl border-[1.5px] border-warm-border bg-card-bg text-sm text-warm-dark outline-none focus:border-warm-dark transition-colors w-full'

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function VerificationBanner({ profile, onUpload, uploading }) {
  const docRef = useRef()
  const { verification_status, rejection_reason, document_upload } = profile

  const config = {
    pending: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: '⏳',
      title: 'Cuenta pendiente de revisión',
      body: 'Subí tu documentación profesional (matrícula o certificado) para que el equipo SELF pueda verificar tu cuenta. Una vez aprobada, tu perfil aparecerá en el buscador.',
    },
    approved: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: '✓',
      title: 'Cuenta verificada',
      body: 'Tu perfil está activo y visible para los pacientes.',
    },
    rejected: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: '✕',
      title: 'Verificación rechazada',
      body: rejection_reason
        ? `Motivo: ${rejection_reason}. Corregí la información y volvé a subir tu documentación.`
        : 'Revisá tu información y volvé a subir tu documentación.',
    },
  }

  const c = config[verification_status] || config.pending

  return (
    <div className={`${c.bg} border rounded-xl px-4 py-4 mb-6`}>
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">{c.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${c.text}`}>{c.title}</p>
          <p className={`text-xs mt-0.5 leading-relaxed ${c.text} opacity-80`}>{c.body}</p>

          {verification_status !== 'approved' && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => docRef.current.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-full bg-warm-dark text-cream text-xs font-medium hover:opacity-90 transition-all disabled:opacity-60"
              >
                {uploading ? 'Subiendo...' : document_upload ? 'Reemplazar documento' : 'Subir documento'}
              </button>
              {document_upload && (
                <span className="text-xs text-warm-mid">
                  ✓ Documento subido
                </span>
              )}
              <input
                ref={docRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => e.target.files[0] && onUpload(e.target.files[0])}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function AvailabilitySection({ token }) {
  const { showToast } = useToast()
  const [rules, setRules] = useState([])
  const [form, setForm] = useState({ day_of_week: '0', start_time: '', end_time: '' })
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchRecurringRules(token).then(setRules)
  }, [token])

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true)
    try {
      const rule = await createRecurringRule(token, form)
      setRules(prev => [...prev, rule].sort((a, b) => a.day_of_week - b.day_of_week))
      setForm({ day_of_week: '0', start_time: '', end_time: '' })
      showToast('Disponibilidad recurrente agregada ✓')
    } catch (err) {
      showToast(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(ruleId) {
    setDeleting(ruleId)
    try {
      await deleteRecurringRule(token, ruleId)
      setRules(prev => prev.filter(r => r.id !== ruleId))
      showToast('Regla eliminada.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-warm-border/50">
      <h3 className="font-medium text-warm-dark mb-1">Disponibilidad recurrente</h3>
      <p className="text-xs text-warm-mid mb-5">
        Definí tu horario habitual. Los turnos de esta regla aparecerán automáticamente en tu calendario.
        También podés agregar turnos puntuales desde el <a href="/calendar" className="text-sage-dark underline">Calendario</a>.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">Día</label>
          <select
            className={inputCls}
            value={form.day_of_week}
            onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
          >
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">Hora inicio</label>
          <input type="time" required className={inputCls} value={form.start_time}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider">Hora fin</label>
          <input type="time" required className={inputCls} value={form.end_time}
            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
        </div>
        <button type="submit" disabled={adding}
          className="px-5 py-3 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60">
          {adding ? 'Agregando...' : '+ Agregar'}
        </button>
      </form>

      {rules.length === 0 ? (
        <p className="text-sm text-warm-mid">No tenés disponibilidad recurrente configurada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-card-bg border border-warm-dark/[0.08] text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium text-warm-dark">{DAY_NAMES[rule.day_of_week]}</span>
                <span className="text-warm-mid">{rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}</span>
              </div>
              <button onClick={() => handleDelete(rule.id)} disabled={deleting === rule.id}
                className="text-xs text-warm-mid hover:text-red-500 transition-colors disabled:opacity-40">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AvatarSection({ user, onAvatarChange }) {
  const fileRef = useRef()
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user.username?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex items-center gap-5 mb-8 pb-8 border-b border-warm-border/50">
      <div className="relative flex-shrink-0">
        {user.avatar
          ? <img src={user.avatar} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-warm-border" />
          : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center font-serif text-2xl font-bold text-warm-dark border-2 border-warm-border">
              {initials}
            </div>
          )
        }
        <button
          onClick={() => fileRef.current.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-warm-dark text-cream text-xs flex items-center justify-center hover:opacity-90 transition-all"
          title="Cambiar foto"
        >✎</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files[0] && onAvatarChange(e.target.files[0])}
        />
      </div>
      <div>
        <div className="font-serif text-xl font-bold">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}</div>
        <div className="text-sm text-warm-mid mt-0.5">{user.role === 'psychologist' ? 'Psicólogo/a' : 'Paciente'}</div>
        <div className="text-xs text-warm-mid/60 mt-1">Hacé clic en el ícono para cambiar tu foto</div>
      </div>
    </div>
  )
}

export default function Profile() {
  const { token, updateUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [form, setForm] = useState({})
  const [psyForm, setPsyForm] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { navigate('/'); return }
    fetchMe(token).then(data => {
      setUser(data)
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        bio: data.bio || '',
        city: data.city || '',
      })
      if (data.psychologist_profile) {
        const p = data.psychologist_profile
        setPsyForm({
          specialties: p.specialties || [],
          modality: p.modality || 'both',
          session_price: p.session_price || '',
          years_experience: p.years_experience || '',
          city: p.city || '',
          license_number: p.license_number || '',
          languages: (p.languages || []).join(', '),
        })
      }
    }).catch(() => showToast('Error al cargar perfil'))
      .finally(() => setLoading(false))
  }, [token, navigate, showToast])

  function handleAvatarChange(file) {
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleDocumentUpload(file) {
    setUploading(true)
    try {
      const updated = await uploadDocument(token, file)
      setUser(updated)
      updateUser(updated)
      showToast('Documento subido correctamente ✓')
    } catch {
      showToast('Error al subir el documento. Intentá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function toggleSpecialty(s) {
    setPsyForm(f => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...f.specialties, s],
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = { ...form }
      if (user.role === 'psychologist') {
        body.psychologist_profile = {
          ...psyForm,
          languages: psyForm.languages.split(',').map(l => l.trim()).filter(Boolean),
          session_price: psyForm.session_price || null,
          years_experience: psyForm.years_experience || 0,
        }
      }
      let updated = await updateProfile(token, body)

      if (avatarFile) {
        updated = await uploadAvatar(token, avatarFile)
        setAvatarFile(null)
      }

      setUser(updated)
      updateUser(updated)
      showToast('¡Perfil actualizado! ✓')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-warm-mid text-sm">Cargando...</div>
      </div>
    )
  }

  const displayUser = avatarPreview ? { ...user, avatar: avatarPreview } : user

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h2 className="font-serif text-4xl font-bold mb-2">Mi perfil</h2>
      <p className="text-warm-mid mb-8">Editá tu información personal.</p>

      {/* Verification banner — solo psicólogos */}
      {user.role === 'psychologist' && user.psychologist_profile && (
        <VerificationBanner
          profile={user.psychologist_profile}
          onUpload={handleDocumentUpload}
          uploading={uploading}
        />
      )}

      <AvatarSection user={displayUser} onAvatarChange={handleAvatarChange} />

      <form onSubmit={handleSave} className="flex flex-col gap-5">

        <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
          <Field label="Nombre">
            <input className={inputCls} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </Field>
          <Field label="Apellido">
            <input className={inputCls} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Ciudad">
            <input className={inputCls} placeholder="Ej: Buenos Aires" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </Field>
        </div>

        <Field label="Bio">
          <textarea
            className={`${inputCls} resize-y min-h-[100px]`}
            placeholder="Contá un poco sobre vos..."
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          />
        </Field>

        {/* Psychologist-only fields */}
        {user.role === 'psychologist' && (
          <>
            <div className="pt-4 border-t border-warm-border/50">
              <h3 className="font-medium text-warm-dark mb-4">Perfil profesional</h3>
            </div>

            <div>
              <div className="text-[0.7rem] font-medium text-warm-mid uppercase tracking-wider mb-2">Especialidades</div>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs transition-all ${
                      psyForm.specialties?.includes(s)
                        ? 'bg-warm-dark text-cream border-warm-dark'
                        : 'border-warm-border text-warm-mid hover:border-warm-dark hover:text-warm-dark'
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <Field label="Modalidad">
                <select className={inputCls} value={psyForm.modality} onChange={e => setPsyForm(f => ({ ...f, modality: e.target.value }))}>
                  {MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Precio por sesión ($)">
                <input type="number" className={inputCls} value={psyForm.session_price} onChange={e => setPsyForm(f => ({ ...f, session_price: e.target.value }))} />
              </Field>
              <Field label="Ciudad">
                <input className={inputCls} placeholder="Ej: Buenos Aires" value={psyForm.city} onChange={e => setPsyForm(f => ({ ...f, city: e.target.value }))} />
              </Field>
              <Field label="Años de experiencia">
                <input type="number" className={inputCls} value={psyForm.years_experience} onChange={e => setPsyForm(f => ({ ...f, years_experience: e.target.value }))} />
              </Field>
              <Field label="Matrícula">
                <input className={inputCls} placeholder="Ej: MN 12345" value={psyForm.license_number} onChange={e => setPsyForm(f => ({ ...f, license_number: e.target.value }))} />
              </Field>
              <Field label="Idiomas (separados por coma)">
                <input className={inputCls} placeholder="Español, Inglés" value={psyForm.languages} onChange={e => setPsyForm(f => ({ ...f, languages: e.target.value }))} />
              </Field>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 mt-2"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {user.role === 'psychologist' && <AvailabilitySection token={token} />}
    </div>
  )
}
