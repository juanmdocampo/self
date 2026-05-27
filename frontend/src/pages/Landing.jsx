import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const navigate = useNavigate()
  const { token, currentUser, openLoginModal } = useAuth()

  function handleLogin() {
    if (token) navigate('/discover')
    else openLoginModal()
  }

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>
      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-65px)] px-6 sm:px-10 py-16 gap-7">

        {/* Logo + lema */}
        <div className="flex flex-col items-center gap-3">
          <img src="/favicon.svg" alt="SELF" className="w-14 h-14 sm:w-16 sm:h-16" />
          <div>
            <div className="font-serif text-5xl sm:text-6xl font-bold text-warm-dark tracking-tight">
              Self<span className="text-sage-dark italic">.</span>
            </div>
            <p className="text-[11px] text-warm-mid tracking-[0.2em] uppercase mt-2 font-medium">
              conecta · entiende · transforma
            </p>
          </div>
        </div>

        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.1] font-bold max-w-xl">
          Encuentra al<br />
          <em className="text-sage-dark">psicólogo ideal para ti.</em>
        </h1>

        <p className="text-warm-mid leading-relaxed max-w-sm text-base">
          Atención online y presencial con profesionales verificados.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleLogin}
            className="w-full px-8 py-3.5 rounded-full bg-warm-dark text-cream text-sm font-medium hover:bg-sage-dark hover:-translate-y-px transition-all"
          >
            {currentUser ? 'Explorar psicólogos →' : 'Iniciar sesión'}
          </button>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate('/recommend')}
              className="flex-1 px-4 py-3 rounded-full border-[1.5px] border-warm-mid/40 text-warm-mid text-sm font-medium hover:border-warm-dark hover:text-warm-dark transition-all"
            >
              Me recomiendan →
            </button>
            <button
              onClick={() => scrollTo('como-funciona')}
              className="flex-1 px-4 py-3 rounded-full border-[1.5px] border-warm-mid/40 text-warm-mid text-sm font-medium hover:border-warm-dark hover:text-warm-dark transition-all"
            >
              Cómo funciona ↓
            </button>
          </div>
        </div>
      </div>

      {/* Quiénes somos */}
      <section id="quienes-somos" className="py-20 px-6 sm:px-10 lg:px-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4 text-warm-dark">¿Quiénes somos?</h2>
          <p className="text-warm-mid text-lg leading-relaxed max-w-2xl mx-auto">
            Self es una plataforma diseñada para conectar personas con profesionales de salud mental y coaches
            especializados, mediante una experiencia visual, intuitiva y centrada en el usuario. Nuestra misión
            es hacer que el acceso al bienestar emocional sea más simple y accesible.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-14">
            {[
              { num: '0', label: 'Profesionales activos' },
              { num: '0', label: 'Conexiones realizadas' },
              { num: '0', label: 'Satisfacción' },
            ].map(s => (
              <div key={s.label}>
                <div className="font-serif text-4xl font-bold text-warm-dark">{s.num}</div>
                <div className="text-sm text-warm-mid mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-20 px-6 sm:px-10 lg:px-20 bg-card-bg">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-center text-warm-dark mb-14">Cómo funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Contanos sobre vos', desc: 'Respondé algunas preguntas simples sobre lo que estás buscando y tus preferencias.' },
              { step: '02', title: 'Explorá perfiles', desc: 'Descubrí psicólogos y coaches especializados que se adaptan a tus necesidades, de forma visual y simple.' },
              { step: '03', title: 'Conectá', desc: 'Elegí el profesional que más te resuene y comenzá tu proceso con un clic.' },
            ].map(item => (
              <div key={item.step} className="flex flex-col gap-3">
                <div className="font-serif text-5xl font-bold text-sage-dark/20">{item.step}</div>
                <h3 className="font-serif text-xl font-bold text-warm-dark">{item.title}</h3>
                <p className="text-warm-mid text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
