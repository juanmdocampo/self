import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const TABS = [
  { path: '/', label: 'Inicio' },
  { path: '/discover', label: 'Descubrir' },
  { path: '/recommend', label: 'Me recomiendan' },
  { path: '/register', label: 'Registrarse' },
]

export default function Nav() {
  const { currentUser, logout, openLoginModal } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    showToast('Hasta la próxima 👋')
    navigate('/')
  }

  const initials = currentUser
    ? ([currentUser.first_name?.[0], currentUser.last_name?.[0]].filter(Boolean).join('').toUpperCase() || currentUser.username?.[0]?.toUpperCase())
    : null

  return (
    <nav className="sticky top-0 z-50 bg-cream border-b border-warm-dark/[0.08] flex items-center justify-between px-10 py-4">
      <Link to="/" className="font-serif text-3xl font-bold tracking-tight text-warm-dark">
        Self<span className="text-sage-dark italic">.</span>
      </Link>

      <div className="flex gap-1.5">
        {TABS.filter(tab => !(tab.path === '/register' && currentUser)).map(tab => {
          const active = location.pathname === tab.path
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-warm-dark text-cream'
                  : 'text-warm-mid hover:bg-warm-dark/[0.06]'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            <Link
              to="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Mi perfil"
            >
              {currentUser.avatar
                ? <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-sage" />
                : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-xs font-bold text-warm-dark border-2 border-sage">
                    {initials}
                  </div>
                )
              }
              <span className="text-sm text-warm-mid">
                {currentUser.first_name || currentUser.username}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-5 py-2 rounded-full border-[1.5px] border-warm-dark text-sm font-medium text-warm-dark hover:bg-warm-dark hover:text-cream transition-all"
            >
              Salir
            </button>
          </>
        ) : (
          <>
            <button
              onClick={openLoginModal}
              className="px-5 py-2 rounded-full border-[1.5px] border-warm-dark text-sm font-medium text-warm-dark hover:bg-warm-dark hover:text-cream transition-all"
            >
              Iniciar sesión
            </button>
            <Link
              to="/register"
              className="px-5 py-2 rounded-full bg-sage-dark text-white text-sm font-medium hover:bg-sage transition-all"
            >
              Únete
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
