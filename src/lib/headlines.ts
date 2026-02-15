import type { HeadlineAnalysis } from './types'

const BUZZWORDS = [
  'thought leader',
  'serial entrepreneur',
  'forbes',
  'tedx',
  'ted speaker',
  'keynote',
  'visionary',
  'disruptor',
  'change maker',
  'changemaker',
  'evangelist',
  'ninja',
  'rockstar',
  'guru',
  'maven',
  'wizard',
  'hacker',
  'unicorn',
  'alchemist',
  'storyteller',
  'top voice',
  'linkedin top',
  'award-winning',
  'award winning',
  'bestselling',
  'best-selling',
  'fortune 500',
  'inc 5000',
  'inc. 5000',
  '10x',
  'ex-google',
  'ex-meta',
  'ex-amazon',
  'ex-apple',
  'ex-microsoft',
  'ex-faang',
  'yc',
  'y combinator',
  'stanford',
  'harvard',
  'mit',
  'wharton',
]

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu

export function analyzeHeadline(headline: string): HeadlineAnalysis {
  const lower = headline.toLowerCase()
  const flags: string[] = []

  // Count pipes (the LinkedIn classic)
  const pipeCount = (headline.match(/\|/g) || []).length
  if (pipeCount >= 3) flags.push(`${pipeCount} pipes detected`)
  else if (pipeCount > 0) flags.push(`${pipeCount} pipe${pipeCount > 1 ? 's' : ''} detected`)

  // Count emojis in headline
  const emojiMatches = headline.match(EMOJI_REGEX) || []
  const emojiCount = emojiMatches.length
  if (emojiCount > 0) flags.push(`${emojiCount} emoji${emojiCount > 1 ? 's' : ''} in headline`)

  // Count buzzwords
  let buzzwordCount = 0
  for (const word of BUZZWORDS) {
    if (lower.includes(word)) {
      buzzwordCount++
      flags.push(`"${word}" detected`)
    }
  }

  // Length bonus (overly long headlines)
  const lengthBonus = headline.length > 100 ? Math.min(Math.floor((headline.length - 100) / 20), 5) : 0
  if (lengthBonus > 0) flags.push(`${headline.length} char headline`)

  const totalBonus =
    pipeCount * 3 +
    emojiCount * 2 +
    buzzwordCount * 5 +
    lengthBonus

  return {
    pipeCount,
    emojiCount,
    buzzwordCount,
    lengthBonus,
    totalBonus,
    flags,
  }
}
