export interface Behavior {
  id: string
  label: string
  emoji: string
  points: number
  classTags: LunaticClass[]
}

export type LunaticClass =
  | 'Humble Bragger'
  | 'Thought Leader'
  | 'Hustle Bro'
  | 'Grief Exploiter'
  | 'Corporate Poet'
  | 'Selfie CEO'
  | 'Recruiter Cringe'
  | 'Engagement Farmer'
  | 'Inspirational Liar'
  | 'Reply Guy'
  | 'Generic Professional'

export interface UserInput {
  name: string
  headline: string
  behaviors: string[] // behavior IDs
}

export interface HeadlineAnalysis {
  pipeCount: number
  emojiCount: number
  buzzwordCount: number
  lengthBonus: number
  totalBonus: number
  flags: string[]
}

export interface StatBlock {
  CRG: number // Cringe (0-99)
  ENG: number // Engagement Bait (0-99)
  DEL: number // Delusion (0-99)
  HST: number // Hustle (0-99)
}

export type TierName =
  | 'Normie'
  | 'Aspiring Lunatic'
  | 'Certified Lunatic'
  | 'Mega Lunatic'
  | 'Ultra Lunatic'
  | 'Mythic Lunatic'

export interface TierInfo {
  name: TierName
  rarity: string
  minScore: number
  maxScore: number
  stars: number
  colors: {
    border: string
    bg: string
    accent: string
    text: string
    statBar: string
  }
}

export interface RedditPost {
  title: string
  url: string
  score: number
  created: number
}

export interface RedditResult {
  posts: RedditPost[]
  searched: boolean
  error?: string
}

export interface ScoreResult {
  totalScore: number
  tier: TierInfo
  lunaticClass: LunaticClass
  classEmoji: string
  stats: StatBlock
  headlineAnalysis: HeadlineAnalysis
  redditResult: RedditResult
  behaviorCount: number
}

export interface CardData {
  name: string
  headline: string
  score: ScoreResult
}

export type AppStage = 'landing' | 'searching' | 'search-results' | 'form' | 'processing' | 'results' | 'leaderboard'

export interface LeaderboardEntry {
  name: string
  post_count: number
  peak_score: number
  peak_post_title: string
  peak_post_url: string
  latest_post_date: number
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  totalPeople: number
  error?: string
}
