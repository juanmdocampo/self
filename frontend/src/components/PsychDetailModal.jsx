const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const MODALITY_LABEL = { online: 'Online', presential: 'Presencial', both: 'Online + Presencial' }

export default function PsychDetailModal({ psych, index = 0, onClose, onSwipe }) {
  if (!psych) return null

  const p = psych.psychologist_profile || {}
  const name = [psych.first_name, psych.last_name].filter(Boolean).join(' ') || psych.username
  const avatar = AVATARS[index % AVATARS.length]
  const price = p.session_price ? `$${Number(p.session_price).toLocaleString()}` : null
  const modality = MODALITY_LABEL[p.modality] || ''

  return (
    <div
      className="fixed inset-0 bg-warm-dark/50 backdrop-blur-sm z-[600] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card-bg rounded-3xl w-full max-w-lg shadow-modal overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header image */}
        <div className="relative h-52 bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-[5rem] flex-shrink-0">
          {psych.avatar
            ? <img src={psych.avatar} alt={name} className="w-full h-full object-cover absolute inset-0" />
            : avatar
          }
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-warm-mid hover:text-warm-dark transition-all text-lg leading-none"
          >×</button>
          {p.is_verified && (
            <div className="absolute top-4 left-4 bg-white rounded-full px-2.5 py-1 text-xs font-medium text-sage-dark flex items-center gap-1">
              ✓ Verificado
            </div>
          )}
          {p.is_accepting_patients && (
            <div className="absolute bottom-4 left-4 bg-white rounded-full px-2.5 py-1 text-xs font-medium text-sage-dark flex items-center gap-1">
              <span className="text-sage text-[0.5rem]">●</span> Disponible
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-7">
          <h2 className="font-serif text-3xl font-bold mb-1">{name}</h2>
          <p className="text-sm text-sage-dark font-medium mb-4">
            {modality}{p.city ? ` · ${p.city}` : ''}
          </p>

          {/* Specialties */}
          {p.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {p.specialties.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-sage/[0.12] text-xs text-sage-dark font-medium">{s}</span>
              ))}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {price && (
              <div className="bg-cream rounded-2xl p-3.5">
                <div className="text-xs text-warm-mid mb-0.5">Precio por sesión</div>
                <div className="font-semibold text-warm-dark">{price}</div>
              </div>
            )}
            {p.years_experience > 0 && (
              <div className="bg-cream rounded-2xl p-3.5">
                <div className="text-xs text-warm-mid mb-0.5">Experiencia</div>
                <div className="font-semibold text-warm-dark">{p.years_experience} años</div>
              </div>
            )}
            {p.modality && (
              <div className="bg-cream rounded-2xl p-3.5">
                <div className="text-xs text-warm-mid mb-0.5">Modalidad</div>
                <div className="font-semibold text-warm-dark">{modality}</div>
              </div>
            )}
            {p.languages?.length > 0 && (
              <div className="bg-cream rounded-2xl p-3.5">
                <div className="text-xs text-warm-mid mb-0.5">Idiomas</div>
                <div className="font-semibold text-warm-dark">{p.languages.join(', ')}</div>
              </div>
            )}
          </div>

          {/* Bio */}
          {psych.bio && (
            <div className="mb-5">
              <div className="text-xs text-warm-mid uppercase tracking-wider font-medium mb-2">Sobre mí</div>
              <p className="text-sm text-warm-dark leading-relaxed">{psych.bio}</p>
            </div>
          )}

          {/* License */}
          {p.license_number && (
            <div className="text-xs text-warm-mid">Matrícula: {p.license_number}</div>
          )}
        </div>

        {/* Actions */}
        {onSwipe && (
          <div className="flex gap-3 p-5 pt-0 flex-shrink-0">
            <button
              onClick={() => { onSwipe('left'); onClose() }}
              className="flex-1 py-3.5 rounded-xl border-[1.5px] border-warm-dark/15 text-warm-mid text-sm font-medium hover:border-warm-dark hover:text-warm-dark transition-all"
            >
              Pasar
            </button>
            <button
              onClick={() => { onSwipe('right'); onClose() }}
              className="flex-1 py-3.5 rounded-xl bg-sage-dark text-white text-sm font-medium hover:bg-sage transition-all"
            >
              ♥ Me interesa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
