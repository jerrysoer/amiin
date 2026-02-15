import type { ScoreResult } from '../lib/types'
import { getStarDisplay, isMythic } from '../lib/tiers'
import StatBar from './StatBar'

interface TradingCardProps {
  name: string
  headline: string
  score: ScoreResult
}

export default function TradingCard({ name, headline, score }: TradingCardProps) {
  const { tier, lunaticClass, classEmoji, stats, totalScore, redditResult } = score
  const mythic = isMythic(tier.name)
  const redditFound = redditResult.posts.length > 0

  return (
    <div
      className={`relative w-[320px] sm:w-[380px] mx-auto ${mythic ? 'holo-border' : ''} rounded-2xl ${mythic ? 'p-[3px]' : 'p-[3px]'}`}
      style={!mythic ? { background: tier.colors.border } : undefined}
    >
      {/* Inner card */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: tier.colors.bg }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: `${tier.colors.border}20` }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              fontFamily: 'var(--font-mono)',
              background: `${tier.colors.border}30`,
              color: tier.colors.border,
            }}
          >
            {tier.rarity}
          </span>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{
              fontFamily: 'var(--font-mono)',
              color: tier.colors.text,
            }}
          >
            SCORE: {totalScore}
          </span>
        </div>

        {/* Class emoji - big */}
        <div className="text-center py-4">
          <span className="text-7xl block" role="img" aria-label={lunaticClass}>
            {classEmoji}
          </span>
        </div>

        {/* Name + Class */}
        <div className="text-center px-4 pb-2">
          <h2
            className="text-xl font-extrabold tracking-tight leading-tight truncate"
            style={{
              fontFamily: 'var(--font-display)',
              color: tier.colors.text,
            }}
          >
            {name}
          </h2>
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] mt-1"
            style={{
              fontFamily: 'var(--font-display)',
              color: tier.colors.border,
            }}
          >
            {lunaticClass}
          </p>
        </div>

        {/* Headline */}
        {headline && (
          <div className="px-4 pb-3">
            <p
              className="text-[10px] text-center leading-snug opacity-60 line-clamp-2"
              style={{
                fontFamily: 'var(--font-mono)',
                color: tier.colors.text,
              }}
            >
              "{headline}"
            </p>
          </div>
        )}

        {/* Stat grid */}
        <div
          className="mx-4 p-3 rounded-lg space-y-1.5"
          style={{ background: `${tier.colors.border}10` }}
        >
          <StatBar label="CRG" value={stats.CRG} color={tier.colors.statBar} delay={200} />
          <StatBar label="ENG" value={stats.ENG} color={tier.colors.statBar} delay={400} />
          <StatBar label="DEL" value={stats.DEL} color={tier.colors.statBar} delay={600} />
          <StatBar label="HST" value={stats.HST} color={tier.colors.statBar} delay={800} />
        </div>

        {/* Tier + Stars */}
        <div className="text-center py-3">
          <p
            className="text-sm font-extrabold tracking-wide"
            style={{
              fontFamily: 'var(--font-display)',
              color: tier.colors.border,
            }}
          >
            {tier.name}
          </p>
          <p
            className="text-base tracking-wider"
            style={{ color: tier.colors.border }}
          >
            {getStarDisplay(tier.stars)}
          </p>
        </div>

        {/* Reddit status */}
        <div className="text-center pb-3">
          {redditFound ? (
            <span
              className="pulse-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255, 68, 68, 0.15)',
                color: '#ff4444',
                border: '1px solid rgba(255, 68, 68, 0.3)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
              ACTUALLY POSTED ON r/LinkedInLunatics
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'rgba(57, 255, 20, 0.1)',
                color: '#39ff14',
                border: '1px solid rgba(57, 255, 20, 0.2)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-safe inline-block" />
              NOT FOUND (YET)
            </span>
          )}
        </div>

        {/* Watermark */}
        <div
          className="text-center pb-2 text-[8px] uppercase tracking-[0.3em] opacity-30"
          style={{
            fontFamily: 'var(--font-mono)',
            color: tier.colors.text,
          }}
        >
          amiin.app
        </div>
      </div>
    </div>
  )
}
