import { useState, useEffect } from 'react'

const stages = [
  { text: 'Scanning r/LinkedInLunatics', icon: '🔍' },
  { text: 'Analyzing cringe levels', icon: '📊' },
  { text: 'Generating your card', icon: '🃏' },
]

export default function LoadingSequence() {
  const [currentStage, setCurrentStage] = useState(0)

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStage(1), 1200)
    const timer2 = setTimeout(() => setCurrentStage(2), 2400)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center noise scanlines relative">
      <div className="relative z-10 text-center px-5">
        {/* Pulsing ring */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border-2 border-neon-pink/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-neon-pink/40 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">{stages[currentStage].icon}</span>
          </div>
        </div>

        {/* Stage text */}
        <div className="space-y-3" aria-live="polite">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={`flex items-center justify-center gap-2 transition-all duration-300 ${
                i < currentStage
                  ? 'opacity-30'
                  : i === currentStage
                    ? 'opacity-100'
                    : 'opacity-0'
              }`}
            >
              <span
                className={`text-xs ${
                  i < currentStage ? 'text-neon-green' : 'text-neon-pink'
                }`}
              >
                {i < currentStage ? '✓' : '▸'}
              </span>
              <span
                className={`text-sm ${
                  i === currentStage ? 'loading-dots text-text-primary' : 'text-text-muted'
                }`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {stage.text}
              </span>
            </div>
          ))}
        </div>

        {/* Sublabel */}
        <p
          className="mt-8 text-[10px] text-text-muted/50 tracking-wider uppercase"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          All processing happens in your browser
        </p>
      </div>
    </div>
  )
}
