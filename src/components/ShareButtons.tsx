import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import type { ScoreResult } from '../lib/types'
import { trackEvent } from '../lib/analytics'

interface ShareButtonsProps {
  cardRef: React.RefObject<HTMLDivElement | null>
  name: string
  score: ScoreResult
}

export default function ShareButtons({ cardRef, name, score }: ShareButtonsProps) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return
    setDownloading(true)

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })

      const link = document.createElement('a')
      link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-lunatic-card.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      trackEvent('card-downloaded')
    } catch (err) {
      console.error('Failed to export card:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyShareText = async () => {
    const redditFound = score.redditResult.posts.length > 0

    const url = 'https://jerrysoer.github.io/LinkedinLunatics/'
    const text = redditFound
      ? `I scored ${score.totalScore} on the LinkedIn Lunatic test and I'm ACTUALLY ON r/LinkedInLunatics 💀\n\nI'm a "${score.tier.name}" class "${score.lunaticClass}"\n\nFind out your score: ${url}`
      : `I scored ${score.totalScore} on the LinkedIn Lunatic test — I'm a "${score.tier.name}" class "${score.lunaticClass}" ${score.classEmoji}\n\nAt least I'm not on r/LinkedInLunatics... yet.\n\nFind out your score: ${url}`

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      trackEvent('share-copied')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mx-auto">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex-1 py-3 px-4 bg-neon-pink text-white font-bold text-sm rounded-xl border-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {downloading ? 'Exporting...' : '📸 Download PNG'}
      </button>
      <button
        onClick={handleCopyShareText}
        className="flex-1 py-3 px-4 bg-surface-overlay text-text-primary font-bold text-sm rounded-xl border-2 border-surface-overlay hover:border-neon-blue cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {copied ? '✓ Copied!' : '📋 Copy Share Text'}
      </button>
    </div>
  )
}
