import { useState, useEffect } from 'react'
import type { LeaderboardEntry } from '../lib/types'
import { fetchLeaderboard, type LeaderboardSort } from '../lib/leaderboard'
import { trackEvent } from '../lib/analytics'

interface LeaderboardProps {
  onSearch: (name: string) => void
  onBack: () => void
}

const SORT_TABS: { key: LeaderboardSort; label: string }[] = [
  { key: 'peak_score', label: 'Top Score' },
  { key: 'frequency', label: 'Most Posted' },
  { key: 'recent', label: 'Recent' },
]

const RANK_STYLES: Record<number, { badge: string; color: string; glow: string }> = {
  1: { badge: '🥇', color: 'text-gold', glow: 'shadow-[0_0_20px_rgba(255,183,0,0.3)]' },
  2: { badge: '🥈', color: 'text-[#c0c0c0]', glow: '' },
  3: { badge: '🥉', color: 'text-[#cd7f32]', glow: '' },
}

export default function Leaderboard({ onSearch, onBack }: LeaderboardProps) {
  const [sort, setSort] = useState<LeaderboardSort>('peak_score')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [totalPeople, setTotalPeople] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('leaderboard-viewed')
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLeaderboard(sort, 50).then((res) => {
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      }
      setEntries(res.entries)
      setTotalPeople(res.totalPeople)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [sort])

  const handleNameClick = (name: string) => {
    trackEvent('leaderboard-name-clicked', { name })
    onSearch(name)
  }

  return (
    <div className="min-h-screen bg-surface noise relative">
      <div className="relative z-10 max-w-3xl mx-auto px-5 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary text-xs mb-8 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ← Back
        </button>

        {/* Header */}
        <div className="text-center mb-10 fade-in-up">
          <span className="text-4xl mb-3 block">🏆</span>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            HALL OF <span className="text-gold">FAME</span>
          </h1>
          <p
            className="text-text-muted text-sm"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {totalPeople > 0
              ? `${totalPeople.toLocaleString()} people featured on r/LinkedInLunatics`
              : 'The most featured people on r/LinkedInLunatics'
            }
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-1 p-1 bg-surface-raised rounded-xl mb-8 max-w-sm mx-auto fade-in-up" style={{ animationDelay: '100ms' }}>
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide border-0 cursor-pointer transition-all ${
                sort === tab.key
                  ? 'bg-surface-overlay text-text-primary shadow-sm'
                  : 'bg-transparent text-text-muted hover:text-text-primary'
              }`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full" style={{ animation: 'searchSpin 1s linear infinite' }} />
            <p className="text-text-muted text-xs mt-4" style={{ fontFamily: 'var(--font-mono)' }}>
              Loading Hall of Fame...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-danger text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
              Failed to load leaderboard. Try refreshing.
            </p>
          </div>
        )}

        {/* Entries */}
        {!loading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = i + 1
              const style = RANK_STYLES[rank]
              const isTop3 = rank <= 3
              const isFirst = rank === 1

              return (
                <div
                  key={`${entry.name}-${i}`}
                  className={`
                    leaderboard-row relative rounded-xl p-4 transition-all cursor-pointer group
                    ${isFirst ? 'holo-border-subtle' : ''}
                    ${isTop3
                      ? 'border border-gold/20 bg-gold/5 hover:border-gold/40'
                      : 'border border-surface-overlay bg-surface-raised/50 hover:border-text-muted/30'
                    }
                    ${style?.glow || ''}
                  `}
                  onClick={() => handleNameClick(entry.name)}
                  style={{ animationDelay: `${150 + i * 40}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-10 text-center shrink-0">
                      {style ? (
                        <span className="text-xl">{style.badge}</span>
                      ) : (
                        <span
                          className="text-text-muted text-sm font-bold tabular-nums"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Name + peak post */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-bold truncate group-hover:text-neon-pink transition-colors ${
                          isTop3 ? 'text-gold' : 'text-text-primary'
                        }`}
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {entry.name}
                      </p>
                      <p
                        className="text-[10px] text-text-muted truncate mt-0.5"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {entry.peak_post_title}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold tabular-nums ${isTop3 ? 'text-gold' : 'text-text-primary'}`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {sort === 'frequency'
                          ? `${entry.post_count}×`
                          : sort === 'recent'
                            ? new Date(entry.latest_post_date * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : `↑${entry.peak_score.toLocaleString()}`
                        }
                      </p>
                      <p
                        className="text-[10px] text-text-muted"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {sort === 'frequency'
                          ? `peak ↑${entry.peak_score.toLocaleString()}`
                          : `${entry.post_count} post${entry.post_count !== 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-muted text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
              No entries found. The leaderboard may still be loading.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
