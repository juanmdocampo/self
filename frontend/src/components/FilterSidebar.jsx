import { useState } from 'react'

const SPECIALTIES = ['Ansiedad', 'Depresión', 'Pareja', 'Familia', 'Infancia', 'Trauma', 'Autoestima', 'Estrés laboral']
const MODALITIES = [
  { value: 'online', label: 'Online' },
  { value: 'presential', label: 'Presencial' },
]
const LANGUAGES = ['Español', 'Inglés', 'Portugués', 'Francés']

function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border-[1.5px] text-xs transition-all ${
        selected
          ? 'bg-warm-dark text-cream border-warm-dark'
          : 'border-warm-dark/15 text-warm-mid hover:bg-warm-dark hover:text-cream hover:border-warm-dark'
      }`}
    >
      {label}
    </button>
  )
}

export default function FilterSidebar({ onApply }) {
  const [specialty, setSpecialty] = useState('')
  const [modality, setModality] = useState('')
  const [language, setLanguage] = useState('')
  const [maxPrice, setMaxPrice] = useState(20000)

  function handleReset() {
    setSpecialty('')
    setModality('')
    setLanguage('')
    setMaxPrice(20000)
    onApply({})
  }

  const hasFilters = specialty || modality || language || maxPrice < 20000

  return (
    <aside className="p-8 border-r border-warm-dark/[0.08] flex flex-col gap-6 h-full">
      <div>
        <h2 className="font-serif text-xl font-bold">Filtros</h2>
        <p className="text-xs text-warm-mid mt-1">Encontrá tu psicólogo ideal</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Especialidad</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Todas" selected={specialty === ''} onClick={() => setSpecialty('')} />
          {SPECIALTIES.map(s => (
            <Chip key={s} label={s} selected={specialty === s} onClick={() => setSpecialty(s === specialty ? '' : s)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Modalidad</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Todas" selected={modality === ''} onClick={() => setModality('')} />
          {MODALITIES.map(m => (
            <Chip key={m.value} label={m.label} selected={modality === m.value} onClick={() => setModality(m.value === modality ? '' : m.value)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Idioma</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Todos" selected={language === ''} onClick={() => setLanguage('')} />
          {LANGUAGES.map(l => (
            <Chip key={l} label={l} selected={language === l} onClick={() => setLanguage(l === language ? '' : l)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Precio máx. por sesión</span>
        <input
          type="range"
          min={2000}
          max={20000}
          step={500}
          value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full accent-sage-dark"
        />
        <span className="text-xs text-warm-mid">
          {maxPrice >= 20000 ? 'Sin límite' : `Hasta $${maxPrice.toLocaleString()}`}
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={() => onApply({ specialty, modality, language, maxPrice: maxPrice < 20000 ? maxPrice : null })}
          className="w-full py-3.5 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:bg-sage-dark transition-all"
        >
          Aplicar filtros
        </button>
        {hasFilters && (
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl text-warm-mid text-xs hover:text-warm-dark transition-all"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </aside>
  )
}
