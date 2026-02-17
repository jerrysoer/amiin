import { useState, useEffect } from 'react'
import type { RedditResult } from '../lib/types'

interface SearchResultsProps {
  name: string
  result: RedditResult
  onGenerateCard: () => void
  onLeaderboard: () => void
}

export default function SearchResults({ name, result, onGenerateCard, onLeaderboard }: SearchResultsProps) {
  const found = result.posts.length > 0
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (found) {
    return (
      <div className="min-h-screen bg-surface noise relative overflow-hidden">
        {/* Red flash overlay on reveal */}
        <div
          className="fixed inset-0 bg-danger/20 pointer-events-none z-20"
          style={{ animation: 'foundFlash 0.6s ease-out forwards' }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-5 py-12 sm:py-20">
          {/* FOUND verdict */}
          <div className={`text-center transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Holographic badge */}
            <div className="inline-block mb-6">
              <div className="holo-border rounded-2xl p-[2px]">
                <div className="bg-surface rounded-2xl px-6 py-3">
                  <span
                    className="text-danger text-[10px] font-bold uppercase tracking-[0.3em]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Match Found
                  </span>
                </div>
              </div>
            </div>

            <h1
              className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-danger">OH NO.</span>
            </h1>

            <p
              className="text-text-muted text-sm mb-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span className="text-neon-pink font-bold">{name}</span> has been spotted on
            </p>
            <p
              className="text-danger text-lg font-bold mb-8"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              r/LinkedInLunatics
            </p>
          </div>

          {/* Post list */}
          <div
            className="mb-10 space-y-3 transition-all duration-700 delay-300"
            style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-3"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Evidence ({result.posts.length} post{result.posts.length !== 1 ? 's' : ''})
            </p>
            {result.posts.slice(0, 5).map((post, i) => (
              <a
                key={i}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-danger/20 bg-danger/5 rounded-xl p-4 hover:border-danger/40 transition-colors group"
                style={{ animationDelay: `${400 + i * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-danger text-xs mt-0.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-danger pulse-badge inline-block" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm text-text-primary group-hover:text-white transition-colors line-clamp-2"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {post.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                        ↑ {post.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                        {new Date(post.created * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* CTA */}
          <div
            className="text-center transition-all duration-700 delay-500"
            style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)' }}
          >
            <button
              onClick={onGenerateCard}
              className="group relative px-8 py-4 bg-neon-pink text-white font-bold text-base rounded-xl border-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="relative z-10 tracking-wide">GENERATE YOUR CARD</span>
              <div className="absolute inset-0 rounded-xl bg-neon-pink opacity-50 blur-xl group-hover:opacity-80 transition-opacity" />
            </button>
            <p
              className="text-text-muted text-xs"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Your Reddit history unlocks a special badge
            </p>
          </div>
        </div>
      </div>
    )
  }

  // NOT FOUND state
  return (
    <div className="min-h-screen bg-surface noise relative">
      <div className="relative z-10 max-w-2xl mx-auto px-5 py-12 sm:py-20">
        <div className={`text-center transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Safe badge */}
          <div className="inline-block mb-6">
            <div className="rounded-2xl border-2 border-safe/30 bg-safe/5 px-6 py-3">
              <span
                className="text-safe text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Not Found
              </span>
            </div>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-safe">YOU'RE SAFE.</span>
          </h1>

          <p
            className="text-text-muted text-sm mb-2"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span className="text-neon-pink font-bold">{name}</span> was not found on
          </p>
          <p
            className="text-text-muted text-sm mb-10"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            r/LinkedInLunatics — <span className="text-safe">for now</span>.
          </p>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto transition-all duration-700 delay-300"
          style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <button
            onClick={onGenerateCard}
            className="flex-1 group relative px-6 py-4 bg-neon-pink text-white font-bold text-sm rounded-xl border-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="relative z-10 tracking-wide">GENERATE CARD ANYWAY</span>
            <div className="absolute inset-0 rounded-xl bg-neon-pink opacity-50 blur-xl group-hover:opacity-80 transition-opacity" />
          </button>
          <button
            onClick={onLeaderboard}
            className="flex-1 py-4 px-6 bg-surface-overlay text-gold font-bold text-sm rounded-xl border-2 border-gold/30 hover:border-gold/60 cursor-pointer transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            🏆 HALL OF FAME
          </button>
        </div>
      </div>
    </div>
  )
}
