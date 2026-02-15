import type { UserInput, ScoreResult, LunaticClass, StatBlock, RedditResult } from './types'
import { behaviors } from './behaviors'
import { analyzeHeadline } from './headlines'
import { getTierForScore } from './tiers'

const CLASS_EMOJIS: Record<LunaticClass, string> = {
  'Humble Bragger': '🏆',
  'Thought Leader': '🧠',
  'Hustle Bro': '💪',
  'Grief Exploiter': '😢',
  'Corporate Poet': '✍️',
  'Selfie CEO': '🤳',
  'Recruiter Cringe': '📞',
  'Engagement Farmer': '🌾',
  'Inspirational Liar': '🎭',
  'Reply Guy': '💬',
  'Generic Professional': '👔',
}

function assignClass(selectedBehaviorIds: string[]): LunaticClass {
  if (selectedBehaviorIds.length === 0) return 'Generic Professional'

  const tagCounts: Partial<Record<LunaticClass, number>> = {}

  for (const id of selectedBehaviorIds) {
    const behavior = behaviors.find((b) => b.id === id)
    if (!behavior) continue
    for (const tag of behavior.classTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
  }

  let maxCount = 0
  let winner: LunaticClass = 'Generic Professional'

  for (const [cls, count] of Object.entries(tagCounts) as [LunaticClass, number][]) {
    if (count > maxCount) {
      maxCount = count
      winner = cls
    }
  }

  return winner
}

function calculateStats(
  selectedBehaviorIds: string[],
  headlineBonus: number,
  redditFound: boolean
): StatBlock {
  const selected = behaviors.filter((b) => selectedBehaviorIds.includes(b.id))

  // CRG: based on highest-point behaviors selected
  const maxPossibleCringe = 20
  const highestBehaviorPoints = selected.reduce((max, b) => Math.max(max, b.points), 0)
  const CRG = Math.min(99, Math.round((highestBehaviorPoints / maxPossibleCringe) * 70 + (selected.length > 5 ? 20 : selected.length * 4)))

  // ENG: engagement bait score - emoji/hashtag behaviors + headline emoji
  const engagementIds = ['agree', 'emoji-bullets', 'fake-poll', 'hashtag-overload', 'reply-every']
  const engCount = selected.filter((b) => engagementIds.includes(b.id)).length
  const ENG = Math.min(99, engCount * 18 + headlineBonus * 2 + (selected.length * 3))

  // DEL: delusion score - self-importance behaviors
  const delusionIds = ['thought-leader', 'reject-offer', 'humble-brag', 'fake-convo', 'life-hack']
  const delCount = selected.filter((b) => delusionIds.includes(b.id)).length
  const DEL = Math.min(99, delCount * 20 + headlineBonus * 3)

  // HST: hustle score
  const hustleIds = ['hustle-grind', 'reject-offer', 'humble-brag', 'fired-post', 'airport-selfie']
  const hstCount = selected.filter((b) => hustleIds.includes(b.id)).length
  const HST = Math.min(99, hstCount * 18 + (redditFound ? 15 : 0) + (selected.length * 2))

  return { CRG, ENG, DEL, HST }
}

export function calculateScore(input: UserInput, redditResult: RedditResult): ScoreResult {
  // Sum behavior points
  let behaviorScore = 0
  for (const id of input.behaviors) {
    const behavior = behaviors.find((b) => b.id === id)
    if (behavior) behaviorScore += behavior.points
  }

  // Headline analysis (skip when headline is empty)
  const headlineAnalysis = input.headline.trim()
    ? analyzeHeadline(input.headline)
    : { pipeCount: 0, emojiCount: 0, buzzwordCount: 0, lengthBonus: 0, totalBonus: 0, flags: [] }

  // Reddit bonus
  const redditBonus = redditResult.posts.length > 0 ? 25 : 0

  // Total score
  const totalScore = behaviorScore + headlineAnalysis.totalBonus + redditBonus

  // Assignments
  const tier = getTierForScore(totalScore)
  const lunaticClass = assignClass(input.behaviors)
  const classEmoji = CLASS_EMOJIS[lunaticClass]
  const stats = calculateStats(input.behaviors, headlineAnalysis.totalBonus, redditResult.posts.length > 0)

  return {
    totalScore,
    tier,
    lunaticClass,
    classEmoji,
    stats,
    headlineAnalysis,
    redditResult,
    behaviorCount: input.behaviors.length,
  }
}
