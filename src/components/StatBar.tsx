interface StatBarProps {
  label: string
  value: number
  color: string
  delay: number
}

export default function StatBar({ label, value, color, delay }: StatBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-display text-[10px] font-bold w-8 text-right tracking-wider opacity-70"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-3 bg-black/30 rounded-sm overflow-hidden border border-white/10">
        <div
          className="stat-fill h-full rounded-sm"
          style={{
            '--fill': `${value}%`,
            '--delay': `${delay}ms`,
            backgroundColor: color,
          } as React.CSSProperties}
        />
      </div>
      <span
        className="font-mono text-[10px] font-bold w-6 tabular-nums"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </span>
    </div>
  )
}
