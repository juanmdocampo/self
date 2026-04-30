import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { login } from '../api'

export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, login: setAuth } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('Completá usuario y contraseña.'); return }

    setLoading(true)
    try {
      const data = await login(username, password)
      setAuth(data.access, data.refresh, data.user)
      showToast(`Bienvenido/a, ${data.user.first_name || data.user.username}! 🌿`)
      setUsername(''); setPassword('')
      navigate('/discover')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!loginModalOpen) return null

  return (
    <div
      className="fixed inset-0 bg-warm-dark/40 backdrop-blur-sm z-[500] flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) closeLoginModal() }}
    >
      <div className="bg-card-bg rounded-3xl p-10 w-full max-w-md shadow-modal relative">
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-5 text-warm-mid hover:text-warm-dark text-2xl leading-none"
        >
          ×
        </button>

        <h3 className="font-serif text-3xl font-bold mb-1.5">Bienvenido/a</h3>
        <p className="text-warm-mid text-sm mb-7">Iniciá sesión para explorar psicólogos y guardar tus matches.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-warm-mid uppercase tracking-wider">Usuario</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="tu_usuario"
              className="px-4 py-3 rounded-xl border-[1.5px] border-warm-dark/15 bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-warm-mid uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-4 py-3 rounded-xl border-[1.5px] border-warm-dark/15 bg-white text-sm text-warm-dark outline-none focus:border-sage-dark transition-colors"
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
            className="w-full py-4 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:bg-sage-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-warm-mid">
          ¿No tenés cuenta?{' '}
          <button
            onClick={() => { closeLoginModal(); navigate('/register') }}
            className="text-sage-dark underline"
          >
            Registrate
          </button>
        </p>
      </div>
    </div>
  )
}
