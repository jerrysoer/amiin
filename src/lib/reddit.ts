import type { RedditResult } from './types'

const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || ''

export async function searchReddit(name: string): Promise<RedditResult> {
  if (!SUPABASE_FUNCTION_URL || !name.trim()) {
    return { posts: [], searched: false }
  }

  try {
    const url = new URL(SUPABASE_FUNCTION_URL)
    url.searchParams.set('name', name.trim())

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return { posts: [], searched: true, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    return {
      posts: data.posts || [],
      searched: true,
      error: data.error,
    }
  } catch (err) {
    return {
      posts: [],
      searched: true,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
