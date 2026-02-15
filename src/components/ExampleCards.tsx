import { getTierForScore, getStarDisplay } from '../lib/tiers'

const examples = [
  {
    name: 'Chad Hustleton',
    class: 'Hustle Bro',
    emoji: '💪',
    headline: 'Serial Entrepreneur | Forbes 30u30 | 5AM Club',
    score: 142,
  },
  {
    name: 'Karen Thoughtwell',
    class: 'Thought Leader',
    emoji: '🧠',
    headline: 'CEO | TEDx Speaker | Visionary | Keynote',
    score: 87,
  },
  {
    name: 'Dave Normal',
    class: 'Generic Professional',
    emoji: '👔',
    headline: 'Software Engineer at Acme Corp',
    score: 12,
  },
]

export default function ExampleCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {examples.map((ex) => {
        const tier = getTierForScore(ex.score)
        return (
          <div
            key={ex.name}
            className="rounded-xl p-[2px]"
            style={{ background: tier.colors.border }}
          >
            <div
              className="rounded-[10px] p-4 text-center"
              style={{ background: tier.colors.bg }}
            >
              <span className="text-4xl block mb-2">{ex.emoji}</span>
              <h3
                className="text-sm font-extrabold truncate"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: tier.colors.text,
                }}
              >
                {ex.name}
              </h3>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: tier.colors.border,
                }}
              >
                {ex.class}
              </p>
              <p
                className="text-[9px] mt-1 opacity-50 truncate"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: tier.colors.text,
                }}
              >
                {ex.headline}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: `${tier.colors.border}20`,
                    color: tier.colors.border,
                  }}
                >
                  {tier.rarity}
                </span>
                <span
                  className="text-xs tracking-wider"
                  style={{ color: tier.colors.border }}
                >
                  {getStarDisplay(tier.stars)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
