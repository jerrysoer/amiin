import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MAX_PAGES = 40
const OCR_BATCH_SIZE = 100
const OCR_DELAY_MS = 500

const SENSITIVE_PATTERNS = [
  'firearm', 'gun', 'shooting', 'weapon',
  'protest', 'rally',
  'political', 'politics',
  'democrat', 'republican', 'conservative', 'liberal',
  'trump', 'biden', 'obama', 'maga',
  'immigration', 'immigrant', 'deportation',
  'abortion', 'pro-life', 'pro-choice',
  'vaccine', 'antivax', 'covid hoax',
  'racist', 'racism', 'white supremac', 'nazi',
  'terrorist', 'terrorism',
  'Alex Pretti',
]

interface RedditPost {
  id: string
  title: string
  permalink: string
  score: number
  created_utc: number
  author: string
  post_hint?: string
  url_overridden_by_dest?: string
}

// ── Reddit Fetching ──

async function fetchRedditPage(after?: string): Promise<{ posts: RedditPost[]; after: string | null }> {
  const params = new URLSearchParams({ limit: '25', raw_json: '1' })
  if (after) params.set('after', after)

  const response = await fetch(
    `https://www.reddit.com/r/LinkedInLunatics/new.json?${params}`,
    { headers: { 'User-Agent': 'LinkedinLunatics-DailySync/1.0' } }
  )
  if (!response.ok) throw new Error(`Reddit API ${response.status}`)

  const data = await response.json()
  const posts: RedditPost[] = (data?.data?.children || []).map((child: { data: RedditPost }) => ({
    id: child.data.id,
    title: child.data.title,
    permalink: child.data.permalink,
    score: child.data.score,
    created_utc: child.data.created_utc,
    author: child.data.author,
    post_hint: child.data.post_hint,
    url_overridden_by_dest: child.data.url_overridden_by_dest,
  }))

  return { posts, after: data?.data?.after || null }
}

async function fetchPullPushFallback(): Promise<RedditPost[]> {
  const response = await fetch(
    'https://api.pullpush.io/reddit/search/submission/?subreddit=LinkedInLunatics&size=500&sort=desc&sort_type=created_utc'
  )
  if (!response.ok) return []

  const data = await response.json()
  return (data.data || []).map((post: { id: string; title: string; permalink: string; full_link: string; score: number; created_utc: number; author: string; post_hint?: string; url_overridden_by_dest?: string }) => ({
    id: post.id,
    title: post.title,
    permalink: post.permalink || post.full_link,
    score: post.score || 0,
    created_utc: post.created_utc || 0,
    author: post.author || '',
    post_hint: post.post_hint,
    url_overridden_by_dest: post.url_overridden_by_dest,
  }))
}

// ── Image Helpers ──

function getImageUrl(post: RedditPost): string | null {
  if (post.post_hint === 'image' && post.url_overridden_by_dest) return post.url_overridden_by_dest
  const dest = post.url_overridden_by_dest || ''
  if (/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(dest)) return dest
  if (dest.includes('i.redd.it') || dest.includes('i.imgur.com')) return dest
  return null
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (bytes.length > 5 * 1024 * 1024) return null

    let base64 = ''
    const chunk = 8192
    for (let i = 0; i < bytes.length; i += chunk) {
      base64 += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    base64 = btoa(base64)

    const mediaType = contentType.split(';')[0].trim()
    return { base64, mediaType }
  } catch {
    return null
  }
}

// ── OCR ──

async function extractNameFromImage(
  base64: string,
  mediaType: string
): Promise<{ name: string | null; headline: string | null }> {
  if (!ANTHROPIC_API_KEY) return { name: null, headline: null }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: 'Look at this LinkedIn screenshot. Extract the name and headline of the POSTER — the person who wrote/shared this post. Their name appears at the TOP of the post, next to the circular profile photo, in a larger/bold font. This is typically in the format "Name · connection · time".\n\nIMPORTANT: Do NOT extract names of people mentioned IN the post content, in shared images, or in the body text. Only the poster\'s name at the top.\n\nReturn ONLY valid JSON: {"name": "...", "headline": "..."}\nIf you cannot identify the poster\'s name, return {"name": null, "headline": null}',
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    console.error(`Claude Vision API error: ${response.status}`)
    return { name: null, headline: null }
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text || ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { name: null, headline: null }
    const parsed = JSON.parse(jsonMatch[0])
    return { name: parsed.name || null, headline: parsed.headline || null }
  } catch {
    return { name: null, headline: null }
  }
}

// ── Content Moderation ──

function shouldAutoHide(post: { title: string; image_url: string | null; extracted_name: string | null }): boolean {
  const text = (post.title || '').toLowerCase()
  const matchesSensitive = SENSITIVE_PATTERNS.some(p => text.includes(p.toLowerCase()))
  if (!matchesSensitive) return false

  // Auto-hide if no image or no extracted name
  if (!post.image_url) return true
  if (!post.extracted_name || post.extracted_name.trim() === '') return true

  return false
}

// ── Main Handler ──

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const startTime = Date.now()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const errors: string[] = []
  let totalFetched = 0
  let totalUpserted = 0
  let totalOcrd = 0
  let totalHidden = 0
  let usedFallback = false

  try {
    // ── Phase 1: Fetch new posts from Reddit ──
    let allPosts: RedditPost[] = []

    try {
      let after: string | null = null
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = await fetchRedditPage(after || undefined)
        allPosts.push(...result.posts)
        after = result.after
        if (!after) break
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (err) {
      usedFallback = true
      errors.push(`Reddit API failed: ${(err as Error).message}, falling back to PullPush`)
      allPosts = await fetchPullPushFallback()
    }

    totalFetched = allPosts.length

    // ── Phase 2: Upsert posts ──
    // Track which post IDs are newly inserted
    const newPostIds = new Set<string>()

    // Get existing IDs to determine which are new
    const allIds = allPosts.map(p => p.id)
    const { data: existingRows } = await supabase
      .from('reddit_posts')
      .select('id')
      .in('id', allIds)
    const existingIds = new Set((existingRows || []).map(r => r.id))

    for (const post of allPosts) {
      if (!existingIds.has(post.id)) newPostIds.add(post.id)
    }

    for (let i = 0; i < allPosts.length; i += 50) {
      const batch = allPosts.slice(i, i + 50).map(post => ({
        id: post.id,
        title: post.title,
        url: post.permalink.startsWith('http') ? post.permalink : `https://reddit.com${post.permalink}`,
        score: post.score,
        created_utc: post.created_utc,
        author: post.author,
        image_url: getImageUrl(post),
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('reddit_posts')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        errors.push(`Upsert batch error: ${error.message}`)
      } else {
        totalUpserted += batch.length
      }
    }

    // ── Phase 3: OCR un-processed posts ──
    if (ANTHROPIC_API_KEY) {
      const { data: unOcrd, error: fetchError } = await supabase
        .from('reddit_posts')
        .select('id, image_url')
        .not('image_url', 'is', null)
        .is('extracted_name', null)
        .order('created_utc', { ascending: false })
        .limit(OCR_BATCH_SIZE)

      if (fetchError) {
        errors.push(`Fetch un-OCRd error: ${fetchError.message}`)
      } else if (unOcrd && unOcrd.length > 0) {
        for (const row of unOcrd) {
          const imageData = await fetchImageAsBase64(row.image_url)
          if (!imageData) continue

          const extracted = await extractNameFromImage(imageData.base64, imageData.mediaType)

          if (extracted.name) {
            const { error: updateError } = await supabase
              .from('reddit_posts')
              .update({
                extracted_name: extracted.name,
                extracted_headline: extracted.headline,
              })
              .eq('id', row.id)

            if (!updateError) totalOcrd++
          }

          await new Promise(r => setTimeout(r, OCR_DELAY_MS))
        }
      }
    }

    // ── Phase 4: Auto-hide flagged newly inserted posts ──
    if (newPostIds.size > 0) {
      const { data: newRows } = await supabase
        .from('reddit_posts')
        .select('id, title, image_url, extracted_name')
        .in('id', [...newPostIds])

      if (newRows) {
        const toHide = newRows.filter(shouldAutoHide).map(r => r.id)
        if (toHide.length > 0) {
          const { error: hideError } = await supabase
            .from('reddit_posts')
            .update({ hidden: true })
            .in('id', toHide)

          if (hideError) {
            errors.push(`Auto-hide error: ${hideError.message}`)
          } else {
            totalHidden = toHide.length
          }
        }
      }
    }

    // ── Phase 5: Log to sync_log ──
    const durationMs = Date.now() - startTime
    const source = req.headers.get('x-sync-source') || 'manual'

    await supabase.from('sync_log').insert({
      source,
      posts_fetched: totalFetched,
      posts_upserted: totalUpserted,
      posts_ocrd: totalOcrd,
      posts_hidden: totalHidden,
      errors: errors.length > 0 ? errors : null,
      duration_ms: durationMs,
    })

    return new Response(
      JSON.stringify({
        success: true,
        fetched: totalFetched,
        upserted: totalUpserted,
        ocrd: totalOcrd,
        hidden: totalHidden,
        fallback: usedFallback,
        duration_ms: durationMs,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const durationMs = Date.now() - startTime
    errors.push((err as Error).message)

    // Still log the failure
    try {
      await supabase.from('sync_log').insert({
        source: req.headers.get('x-sync-source') || 'manual',
        posts_fetched: totalFetched,
        posts_upserted: totalUpserted,
        posts_ocrd: totalOcrd,
        posts_hidden: totalHidden,
        errors,
        duration_ms: durationMs,
      })
    } catch { /* ignore logging failure */ }

    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message, errors }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
