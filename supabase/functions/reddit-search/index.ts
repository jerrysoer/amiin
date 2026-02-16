import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Check if two first names are compatible:
// - Exact match ("Ken" = "Ken")
// - One is a short form of the other ("Chris" → "Christopher")
//   Requires the shorter to be a prefix AND the longer to be 3+ chars longer
//   (prevents "Ken" matching "Kent" but allows "Chris" matching "Christopher")
function firstNameMatches(a: string, b: string): boolean {
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la === lb) return true
  const [shorter, longer] = la.length <= lb.length ? [la, lb] : [lb, la]
  return longer.startsWith(shorter) && (longer.length - shorter.length) >= 3
}

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
  const queryParts = sanitized.toLowerCase().split(/\s+/)
  const queryFirst = queryParts[0]
  const queryLast = queryParts[queryParts.length - 1]

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Search by last name in extracted_name (indexed via trigram)
    const { data } = await supabase
      .from('reddit_posts')
      .select('title, url, score, created_utc, extracted_name')
      .not('extracted_name', 'is', null)
      .neq('extracted_name', '')
      .ilike('extracted_name', `%${queryLast}%`)
      .order('score', { ascending: false })
      .limit(50)

    // Filter: exact last name + compatible first name
    let posts = (data || [])
      .filter((row: { extracted_name: string }) => {
        const parts = row.extracted_name.trim().toLowerCase().split(/\s+/)
        const extractedFirst = parts[0]
        const extractedLast = parts[parts.length - 1]
        return extractedLast === queryLast && firstNameMatches(queryFirst, extractedFirst)
      })
      .slice(0, 10)
      .map((row: { title: string; url: string; score: number; created_utc: number }) => ({
        title: row.title,
        url: row.url,
        score: row.score,
        created: row.created_utc,
      }))

    // Fallback: search title for full name (handles cases where OCR missed)
    if (posts.length === 0) {
      const { data: fallbackData } = await supabase
        .from('reddit_posts')
        .select('title, url, score, created_utc')
        .ilike('title', `%${sanitized}%`)
        .order('score', { ascending: false })
        .limit(10)

      if (fallbackData && fallbackData.length > 0) {
        posts = fallbackData.map((row: { title: string; url: string; score: number; created_utc: number }) => ({
          title: row.title,
          url: row.url,
          score: row.score,
          created: row.created_utc,
        }))
      }
    }

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
