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
  const sort = url.searchParams.get('sort') || 'peak_score'
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100)

  const validSorts = ['peak_score', 'frequency', 'recent']
  const sortBy = validSorts.includes(sort) ? sort : 'peak_score'

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase.rpc('get_leaderboard', {
      sort_by: sortBy,
      page_size: limit,
    })

    if (error) {
      return new Response(
        JSON.stringify({ entries: [], totalPeople: 0, error: error.message }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Get total unique people count
    const { count } = await supabase
      .from('reddit_posts')
      .select('extracted_name', { count: 'exact', head: true })
      .not('extracted_name', 'is', null)
      .neq('extracted_name', '')
      .not('hidden', 'eq', true)

    return new Response(
      JSON.stringify({
        entries: data || [],
        totalPeople: count || 0,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ entries: [], totalPeople: 0, error: (err as Error).message }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
