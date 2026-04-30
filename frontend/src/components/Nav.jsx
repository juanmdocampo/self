import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Nav() {
  const { currentUser, logout, openLoginModal } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    showToast('Hasta la próxima 👋')
    navigate('/')
    setMenuOpen(false)
  }

  const initials = currentUser
    ? ([currentUser.first_name?.[0], currentUser.last_name?.[0]].filter(Boolean).join('').toUpperCase() || currentUser.username?.[0]?.toUpperCase())
    : null

  const tabs = [
    { path: '/', label: 'Inicio', show: true },
    { path: '/discover', label: 'Descubrir', show: true },
    { path: '/recommend', label: 'Me recomiendan', show: true },
    { path: '/matches', label: 'Mis matches', show: !!currentUser && currentUser.role === 'patient' },
    { path: '/register', label: 'Registrarse', show: !currentUser },
  ].filter(t => t.show)

  return (
    <nav className="sticky top-0 z-50 bg-cream border-b border-warm-dark/[0.08]">
      <div className="flex items-center justify-between px-5 sm:px-10 py-4">
        <Link to="/" className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-warm-dark">
          Self<span className="text-sage-dark italic">.</span>
        </Link>

        {/* Desktop tabs */}
        <div className="hidden md:flex gap-1.5">
          {tabs.map(tab => {
            const active = location.pathname === tab.path
            return (
              <Link
                key={tab.label}
                to={tab.path}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active ? 'bg-warm-dark text-cream' : 'text-warm-mid hover:bg-warm-dark/[0.06]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Desktop user section */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {currentUser.avatar
                  ? <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-sage" />
                  : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-xs font-bold text-warm-dark border-2 border-sage">
                      {initials}
                    </div>
                  )
                }
                <span className="text-sm text-warm-mid">{currentUser.first_name || currentUser.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-full border-[1.5px] border-warm-dark text-sm font-medium text-warm-dark hover:bg-warm-dark hover:text-cream transition-all"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openLoginModal}
                className="px-4 py-2 rounded-full border-[1.5px] border-warm-dark text-sm font-medium text-warm-dark hover:bg-warm-dark hover:text-cream transition-all"
              >
                Iniciar sesión
              </button>
              <Link
                to="/register"
                className="px-4 py-2 rounded-full bg-sage-dark text-white text-sm font-medium hover:bg-sage transition-all"
              >
                Únete
              </Link>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          {currentUser && (
            <Link to="/profile" onClick={() => setMenuOpen(false)}>
              {currentUser.avatar
                ? <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-sage" />
                : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-xs font-bold text-warm-dark border-2 border-sage">
                    {initials}
                  </div>
                )
              }
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl hover:bg-warm-dark/[0.06] transition-all"
            aria-label="Menú"
          >
            <span className={`block h-[2px] w-5 bg-warm-dark rounded transition-all ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block h-[2px] w-5 bg-warm-dark rounded transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-[2px] w-5 bg-warm-dark rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-warm-dark/[0.08] bg-cream pb-4">
          <div className="flex flex-col px-5 pt-3 gap-1">
            {tabs.map(tab => {
              const active = location.pathname === tab.path
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-warm-dark text-cream' : 'text-warm-dark hover:bg-warm-dark/[0.06]'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}

            <div className="mt-3 pt-3 border-t border-warm-dark/[0.06]">
              {currentUser ? (
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all text-left"
                >
                  Cerrar sesión
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { openLoginModal(); setMenuOpen(false) }}
                    className="w-full py-3 rounded-xl border-[1.5px] border-warm-dark text-sm font-medium text-warm-dark hover:bg-warm-dark hover:text-cream transition-all"
                  >
                    Iniciar sesión
                  </button>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="w-full py-3 rounded-xl bg-sage-dark text-white text-sm font-medium hover:bg-sage transition-all text-center"
                  >
                    Únete
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
