import { useState } from 'react'

const SPECIALTIES = ['Ansiedad', 'Depresión', 'Pareja', 'Familia', 'Infancia', 'Trauma']
const MODALITIES = [
  { value: 'online', label: 'Online' },
  { value: 'presential', label: 'Presencial' },
]

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
  const [maxPrice, setMaxPrice] = useState(20000)

  return (
    <aside className="p-8 border-r border-warm-dark/[0.08] flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-xl font-bold">Filtros</h2>
        <p className="text-xs text-warm-mid mt-1">Encontrá tu match ideal</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Especialidad</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Todas" selected={specialty === ''} onClick={() => setSpecialty('')} />
          {SPECIALTIES.map(s => (
            <Chip key={s} label={s} selected={specialty === s} onClick={() => setSpecialty(s)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Modalidad</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Todas" selected={modality === ''} onClick={() => setModality('')} />
          {MODALITIES.map(m => (
            <Chip key={m.value} label={m.label} selected={modality === m.value} onClick={() => setModality(m.value)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] text-warm-mid uppercase tracking-widest font-medium">Precio máx. (por sesión)</span>
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

      <button
        onClick={() => onApply({ specialty, modality, maxPrice: maxPrice < 20000 ? maxPrice : null })}
        className="mt-auto w-full py-4 rounded-xl bg-warm-dark text-cream text-sm font-medium hover:bg-sage-dark transition-all"
      >
        Aplicar filtros
      </button>
    </aside>
  )
}
