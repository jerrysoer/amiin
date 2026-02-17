import { useState, useRef, useEffect } from 'react'
import ExampleCards from './ExampleCards'

interface LandingPageProps {
  onSearch: (name: string) => void
  onLeaderboard: () => void
}

export default function LandingPage({ onSearch, onLeaderboard }: LandingPageProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length >= 2) {
      onSearch(name.trim())
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden noise">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-16 sm:pt-24 pb-16">
        {/* Badge */}
        <div className="fade-in-up text-center mb-6">
          <span
            className="inline-block px-3 py-1 rounded-full border border-neon-pink/30 bg-neon-pink/5 text-neon-pink text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            r/LinkedInLunatics Detector
          </span>
        </div>

        {/* Hero */}
        <h1
          className="fade-in-up glitch-text text-center text-5xl sm:text-7xl font-extrabold tracking-tighter leading-[0.9] mb-4"
          style={{ fontFamily: 'var(--font-display)', animationDelay: '100ms' }}
        >
          AM I A
          <br />
          <span className="text-neon-pink">LINKEDIN</span>
          <br />
          LUNATIC?
        </h1>

        <p
          className="fade-in-up text-center text-text-muted text-sm sm:text-base max-w-md mx-auto mb-10 leading-relaxed"
          style={{ fontFamily: 'var(--font-mono)', animationDelay: '200ms' }}
        >
          Search 60,000+ posts. Find out if Reddit has noticed you.
        </p>

        {/* Search input — the hero element */}
        <div className="fade-in-up max-w-lg mx-auto mb-6" style={{ animationDelay: '300ms' }}>
          <form onSubmit={handleSubmit}>
            <div className="relative group">
              {/* Glow effect behind input */}
              <div className="absolute -inset-1 rounded-2xl bg-neon-pink/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

              <div className="relative flex items-center bg-surface-raised border-2 border-surface-overlay rounded-2xl focus-within:border-neon-pink transition-colors overflow-hidden">
                <span className="pl-5 text-text-muted text-lg">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your LinkedIn name..."
                  maxLength={100}
                  className="flex-1 px-4 py-4 bg-transparent text-text-primary text-base placeholder:text-text-muted/40 focus:outline-none"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <button
                  type="submit"
                  disabled={name.trim().length < 2}
                  className={`mr-2 px-5 py-2.5 rounded-xl font-bold text-sm border-0 cursor-pointer transition-all shrink-0 ${
                    name.trim().length >= 2
                      ? 'bg-neon-pink text-white hover:scale-105 active:scale-95'
                      : 'bg-surface-overlay text-text-muted cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  SEARCH
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Hall of Fame link */}
        <div className="fade-in-up text-center mb-16" style={{ animationDelay: '400ms' }}>
          <button
            onClick={onLeaderboard}
            className="text-gold text-xs font-bold tracking-wide bg-transparent border-0 cursor-pointer hover:text-gold/80 transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            🏆 View the Hall of Fame
          </button>
        </div>

        {/* Example cards */}
        <div className="fade-in-up" style={{ animationDelay: '500ms' }}>
          <p
            className="text-center text-text-muted text-[10px] uppercase tracking-[0.3em] mb-6"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Example classifications
          </p>
          <ExampleCards />
        </div>

        {/* How it works */}
        <div className="fade-in-up mt-16 stagger" style={{ animationDelay: '600ms' }}>
          <p
            className="text-center text-text-muted text-[10px] uppercase tracking-[0.3em] mb-8"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'SEARCH', desc: 'Enter your name to search Reddit' },
              { step: '02', title: 'DISCOVER', desc: 'See if you\'ve been featured' },
              { step: '03', title: 'COLLECT', desc: 'Generate your trading card' },
            ].map((item) => (
              <div
                key={item.step}
                className="fade-in-up border border-surface-overlay rounded-xl p-5 bg-surface-raised/50 text-center"
              >
                <span
                  className="text-neon-blue text-[10px] font-bold tracking-[0.3em] block mb-2"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {item.step}
                </span>
                <h3
                  className="text-base font-extrabold tracking-wide mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-text-muted text-xs"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
