import type { LeaderboardResponse } from './types'

const SUPABASE_LEADERBOARD_URL = import.meta.env.VITE_SUPABASE_LEADERBOARD_URL || ''

export type LeaderboardSort = 'peak_score' | 'frequency' | 'recent'

export async function fetchLeaderboard(
  sort: LeaderboardSort = 'peak_score',
  limit = 50
): Promise<LeaderboardResponse> {
  if (!SUPABASE_LEADERBOARD_URL) {
    return { entries: [], totalPeople: 0, error: 'Leaderboard URL not configured' }
  }

  try {
    const url = new URL(SUPABASE_LEADERBOARD_URL)
    url.searchParams.set('sort', sort)
    url.searchParams.set('limit', String(limit))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return { entries: [], totalPeople: 0, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    return {
      entries: data.entries || [],
      totalPeople: data.totalPeople || 0,
      error: data.error,
    }
  } catch (err) {
    return {
      entries: [],
      totalPeople: 0,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
