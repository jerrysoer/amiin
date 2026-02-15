import { behaviors } from '../lib/behaviors'

interface BehaviorGridProps {
  selected: string[]
  onToggle: (id: string) => void
}

export default function BehaviorGrid({ selected, onToggle }: BehaviorGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {behaviors.map((b) => {
        const isSelected = selected.includes(b.id)
        return (
          <button
            key={b.id}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={() => onToggle(b.id)}
            className={`behavior-card flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left cursor-pointer min-h-[48px] ${
              isSelected
                ? 'border-neon-pink bg-neon-pink/10 shadow-[0_0_12px_rgba(255,45,149,0.15)]'
                : 'border-surface-overlay bg-surface-raised hover:border-text-muted/40'
            }`}
          >
            <span className="text-lg flex-shrink-0">{b.emoji}</span>
            <span
              className={`text-xs leading-snug ${
                isSelected ? 'text-neon-pink font-semibold' : 'text-text-primary/80'
              }`}
            >
              {b.label}
            </span>
            {isSelected && (
              <span className="ml-auto text-neon-pink text-sm flex-shrink-0">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
