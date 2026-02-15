import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const name = url.searchParams.get('name')

  if (!name || name.trim().length < 2 || name.trim().length > 100) {
    return new Response(
      JSON.stringify({ posts: [], searched: true, error: 'Invalid name parameter' }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  }

  const sanitized = name.trim().replace(/[^\w\s.-]/g, '')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fuzzy search on extracted_name using pg_trgm similarity
    const { data, error } = await supabase
      .rpc('search_reddit_posts', { query: sanitized })

    if (error) {
      // Fallback: ilike on both extracted_name and title
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('reddit_posts')
        .select('title, url, score, created_utc')
        .or(`extracted_name.ilike.%${sanitized}%,title.ilike.%${sanitized}%`)
        .order('score', { ascending: false })
        .limit(10)

      if (fallbackError) {
        return new Response(
          JSON.stringify({ posts: [], searched: true, error: fallbackError.message }),
          {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        )
      }

      const posts = (fallbackData || []).map((row: { title: string; url: string; score: number; created_utc: number }) => ({
        title: row.title,
        url: row.url,
        score: row.score,
        created: row.created_utc,
      }))

      return new Response(
        JSON.stringify({ posts, searched: true }),
        {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      )
    }

    const posts = (data || []).map((row: { title: string; url: string; score: number; created_utc: number }) => ({
      title: row.title,
      url: row.url,
      score: row.score,
      created: row.created_utc,
    }))

    return new Response(
      JSON.stringify({ posts, searched: true }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ posts: [], searched: true, error: (err as Error).message }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  }
})
