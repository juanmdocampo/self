const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'hoy'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'ayer'
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function MatchesPanel({ matches }) {
  return (
    <aside className="p-8 border-l border-warm-dark/[0.08] flex flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="font-serif text-xl font-bold">Tus matches ✨</h2>
        <p className="text-xs text-warm-mid mt-1">Psicólogos que elegiste</p>
      </div>

      {matches.length === 0 ? (
        <p className="text-xs text-warm-mid py-2">
          Todavía no tenés matches. ¡Empezá a explorar!
        </p>
      ) : (
        matches.map((m, i) => {
          const psy = m.psychologist
          const name = [psy.first_name, psy.last_name].filter(Boolean).join(' ') || psy.username
          const specs = (psy.psychologist_profile?.specialties || []).slice(0, 2).join(' · ') || 'Psicólogo/a'
          return (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-warm-dark/[0.04] transition-colors">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-xl flex-shrink-0 border-2 border-sage">
                {AVATARS[i % AVATARS.length]}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className="text-xs text-warm-mid truncate">{specs}</div>
              </div>
              <div className="text-xs text-warm-mid ml-auto flex-shrink-0">{formatDate(m.created_at)}</div>
            </div>
          )
        })
      )}

      <div className="mt-auto p-4 bg-sage/[0.08] rounded-2xl border border-dashed border-sage/40">
        <div className="text-xs font-medium text-sage-dark mb-1">🌱 Próximamente</div>
        <div className="text-xs text-warm-mid">Chat directo, agendado de turnos y más.</div>
      </div>
    </aside>
  )
}
