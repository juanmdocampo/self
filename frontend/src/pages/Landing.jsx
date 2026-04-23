import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const navigate = useNavigate()
  const { token, openLoginModal } = useAuth()

  function goDiscover() {
    if (token) navigate('/discover')
    else openLoginModal()
  }

  return (
    <div className="grid grid-cols-2 min-h-[calc(100vh-65px)] max-lg:grid-cols-1">
      {/* Left */}
      <div className="flex flex-col justify-center gap-7 px-16 py-20 max-lg:px-8 max-lg:py-12">
        <div className="inline-flex items-center gap-2 bg-sage/15 border border-sage/40 px-3.5 py-1.5 rounded-full text-xs text-sage-dark font-medium w-fit">
          ✦ Psicología · Bienestar · Conexión
        </div>

        <h1 className="font-serif text-[clamp(2.8rem,4vw,4rem)] leading-[1.1] font-bold">
          Encontrá tu<br />
          <em className="text-sage-dark">psicólogo ideal.</em>
        </h1>

        <p className="text-warm-mid leading-relaxed max-w-md text-base">
          Self conecta personas con profesionales de salud mental de forma simple,
          humana e intuitiva. Como elegir un café favorito — pero para tu mente.
        </p>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={goDiscover}
            className="px-8 py-3.5 rounded-full bg-warm-dark text-cream text-sm font-medium hover:bg-sage-dark hover:-translate-y-px transition-all"
          >
            Explorar psicólogos →
          </button>
          <button
            onClick={() => navigate('/recommend')}
            className="px-8 py-3.5 rounded-full border-[1.5px] border-warm-mid text-warm-mid text-sm font-medium hover:border-warm-dark hover:text-warm-dark transition-all"
          >
            Quiero que me recomienden
          </button>
        </div>

        <div className="flex gap-8 pt-2">
          {[
            { num: '240+', label: 'Profesionales activos' },
            { num: '1.2k', label: 'Conexiones realizadas' },
            { num: '98%', label: 'Satisfacción' },
          ].map(s => (
            <div key={s.label}>
              <div className="font-serif text-3xl font-bold">{s.num}</div>
              <div className="text-xs text-warm-mid mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="bg-gradient-to-br from-[#D4E8D5] to-[#E8D4C8] flex items-center justify-center p-16 relative overflow-hidden max-lg:hidden">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-white/25 -top-24 -right-24" />
        <div className="relative w-72 h-96">
          <div className="absolute top-0 left-5 w-64 h-[360px] bg-white rounded-3xl shadow-card rotate-[-3deg]" />
          <div className="absolute top-5 left-0 w-72 h-[370px] bg-card-bg rounded-3xl shadow-card overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-[4.5rem]">
              👩‍⚕️
            </div>
            <div className="p-5">
              <div className="font-serif text-xl font-bold mb-1">Dra. Sofía M.</div>
              <div className="text-xs text-sage-dark mb-2.5">Psicología Clínica · TCC</div>
              <div className="flex gap-1.5 flex-wrap">
                {['Ansiedad', 'Adultos', 'Online'].map(t => (
                  <span key={t} className="bg-sage/12 px-2.5 py-1 rounded-full text-xs text-sage-dark">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
