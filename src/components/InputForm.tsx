import { useState, useRef, useEffect } from 'react'
import type { UserInput } from '../lib/types'
import BehaviorGrid from './BehaviorGrid'

interface InputFormProps {
  onSubmit: (input: UserInput) => void
  onBack: () => void
}

export default function InputForm({ onSubmit, onBack }: InputFormProps) {
  const [name, setName] = useState('')
  const [headline, setHeadline] = useState('')
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([])
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const toggleBehavior = (id: string) => {
    setSelectedBehaviors((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    )
  }

  const isValid = name.trim().length >= 2

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onSubmit({
      name: name.trim(),
      headline: headline.trim(),
      behaviors: selectedBehaviors,
    })
  }

  return (
    <div className="min-h-screen bg-surface noise relative">
      <div className="relative z-10 max-w-2xl mx-auto px-5 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary text-xs mb-8 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ← Back
        </button>

        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          CONFESS YOUR <span className="text-neon-pink">SINS</span>
        </h1>
        <p
          className="text-text-muted text-xs mb-8"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Be honest. We already know.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Your LinkedIn Name
            </label>
            <input
              ref={nameRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chad Hustleton"
              maxLength={100}
              className="w-full px-4 py-3 bg-surface-raised border-2 border-surface-overlay rounded-lg text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-neon-pink transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Headline */}
          <div>
            <label
              htmlFor="headline"
              className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Your LinkedIn Headline{' '}
              <span className="text-text-muted/50 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Serial Entrepreneur | Forbes 30u30 | Thought Leader | 🚀"
              maxLength={300}
              className="w-full px-4 py-3 bg-surface-raised border-2 border-surface-overlay rounded-lg text-text-primary text-sm placeholder:text-text-muted/40 focus:outline-none focus:border-neon-pink transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <div className="flex justify-between mt-1.5">
              <span
                className="text-[10px] text-text-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Pipes and buzzwords = bonus points
              </span>
              <span
                className={`text-[10px] tabular-nums ${headline.length > 200 ? 'text-neon-pink' : 'text-text-muted'}`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {headline.length}/300
              </span>
            </div>
          </div>

          {/* Behaviors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                className="block text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Guilty Behaviors
              </label>
              <span
                className="text-[10px] text-neon-pink tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {selectedBehaviors.length} selected
              </span>
            </div>
            <BehaviorGrid selected={selectedBehaviors} onToggle={toggleBehavior} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-bold text-base tracking-wide border-0 cursor-pointer transition-all ${
              isValid
                ? 'bg-neon-pink text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,45,149,0.3)]'
                : 'bg-surface-overlay text-text-muted cursor-not-allowed'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {isValid ? 'GENERATE MY CARD' : 'Enter your name to continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
