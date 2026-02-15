import { useRef, useEffect, useState } from 'react'
import type { ScoreResult } from '../lib/types'
import { isMythic } from '../lib/tiers'
import { getAllTips } from '../lib/tips'
import TradingCard from './TradingCard'
import ShareButtons from './ShareButtons'

interface ResultsPageProps {
  name: string
  headline: string
  score: ScoreResult
  onReset: () => void
}

function Confetti() {
  const colors = ['#ff2d95', '#ffd600', '#39ff14', '#00d4ff', '#bf5af2', '#ff4444']
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    size: 6 + Math.random() * 8,
  }))

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </>
  )
}

export default function ResultsPage({ name, headline, score, onReset }: ResultsPageProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [showCard, setShowCard] = useState(false)
  const mythic = isMythic(score.tier.name)
  const tips = getAllTips(score.lunaticClass)
  const redditFound = score.redditResult.posts.length > 0

  useEffect(() => {
    const timer = setTimeout(() => setShowCard(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-surface noise relative">
      {mythic && <Confetti />}

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-8 sm:py-12">
        {/* Verdict header */}
        <div className="text-center mb-8 fade-in-up">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted mb-2"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Your diagnosis is in
          </p>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              color: score.tier.colors.border,
            }}
          >
            {score.tier.name.toUpperCase()}
          </h1>
        </div>

        {/* Card */}
        <div className={`mb-8 ${showCard ? 'card-reveal' : 'opacity-0'}`}>
          <div ref={cardRef}>
            <TradingCard name={name} headline={headline} score={score} />
          </div>
        </div>

        {/* Share buttons */}
        <div className="fade-in-up mb-10" style={{ animationDelay: '300ms' }}>
          <ShareButtons cardRef={cardRef} name={name} score={score} />
        </div>

        {/* Reddit section */}
        {redditFound && (
          <div
            className="fade-in-up mb-8 border border-danger/30 bg-danger/5 rounded-xl p-4"
            style={{ animationDelay: '400ms' }}
          >
            <h3
              className="text-sm font-bold text-danger mb-2 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="w-2 h-2 rounded-full bg-danger pulse-badge inline-block" />
              FOUND ON r/LinkedInLunatics
            </h3>
            <div className="space-y-2">
              {score.redditResult.posts.slice(0, 3).map((post, i) => (
                <a
                  key={i}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-text-muted hover:text-text-primary transition-colors truncate"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  → {post.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Headline analysis */}
        {score.headlineAnalysis.flags.length > 0 && (
          <div
            className="fade-in-up mb-8 border border-surface-overlay rounded-xl p-4"
            style={{ animationDelay: '500ms' }}
          >
            <h3
              className="text-sm font-bold mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              HEADLINE ANALYSIS
            </h3>
            <div className="flex flex-wrap gap-2">
              {score.headlineAnalysis.flags.map((flag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-full bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-[10px]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {flag}
                </span>
              ))}
            </div>
            <p
              className="mt-2 text-[10px] text-text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Headline bonus: +{score.headlineAnalysis.totalBonus} points
            </p>
          </div>
        )}

        {/* Tips */}
        <div
          className="fade-in-up mb-10 border border-surface-overlay rounded-xl p-4"
          style={{ animationDelay: '600ms' }}
        >
          <h3
            className="text-sm font-bold mb-3 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {score.classEmoji} {score.lunaticClass} — PROFESSIONAL ADVICE
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="text-xs text-text-muted leading-relaxed pl-3 border-l-2 border-surface-overlay"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div
          className="fade-in-up flex flex-col sm:flex-row gap-3 max-w-sm mx-auto"
          style={{ animationDelay: '700ms' }}
        >
          <button
            onClick={onReset}
            className="flex-1 py-3 px-4 bg-surface-overlay text-text-primary font-bold text-sm rounded-xl border-2 border-surface-overlay hover:border-text-muted cursor-pointer transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ↻ Try Again
          </button>
          <button
            onClick={() => {
              const text = encodeURIComponent(
                `I just scored ${score.totalScore} on the LinkedIn Lunatic test. Find out your score: https://jsmacair.github.io/amiin/`
              )
              window.open(
                `https://twitter.com/intent/tweet?text=${text}`,
                '_blank'
              )
            }}
            className="flex-1 py-3 px-4 bg-neon-blue/10 text-neon-blue font-bold text-sm rounded-xl border-2 border-neon-blue/30 hover:border-neon-blue cursor-pointer transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Post on X
          </button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p
            className="text-[10px] text-text-muted/40 tracking-wider"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Built for laughs. No data stored. 100% client-side.
          </p>
        </div>
      </div>
    </div>
  )
}
