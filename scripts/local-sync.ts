/**
 * Local sync script — fetches Reddit posts, inserts into Supabase, and
 * runs OCR on images to extract LinkedIn names.
 *
 * Usage:
 *   npx tsx scripts/local-sync.ts              # full sync + OCR
 *   npx tsx scripts/local-sync.ts --ocr-only   # skip fetch, just OCR existing posts
 *
 * Env vars:
 *   SUPABASE_SERVICE_KEY  — Supabase service role JWT
 *   ANTHROPIC_API_KEY     — For Claude Vision OCR
 */

const SUPABASE_URL = 'https://bnpdkhivrgtdayxqzihv.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const OCR_BATCH_SIZE = 100

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

async function fetchRedditPage(after?: string): Promise<{ posts: RedditPost[]; after: string | null }> {
  const params = new URLSearchParams({ limit: '100', raw_json: '1' })
  if (after) params.set('after', after)

  const url = `https://www.reddit.com/r/LinkedInLunatics/new.json?${params}`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AmIIn-LocalSync/1.0' },
  })

  if (!response.ok) throw new Error(`Reddit ${response.status}`)

  const data = await response.json()
  const children = data?.data?.children || []

  return {
    posts: children.map((c: { data: RedditPost }) => ({
      id: c.data.id,
      title: c.data.title,
      permalink: c.data.permalink,
      score: c.data.score,
      created_utc: c.data.created_utc,
      author: c.data.author,
      post_hint: c.data.post_hint,
      url_overridden_by_dest: c.data.url_overridden_by_dest,
    })),
    after: data?.data?.after || null,
  }
}

async function fetchPullPush(): Promise<RedditPost[]> {
  const url = 'https://api.pullpush.io/reddit/search/submission/?subreddit=LinkedInLunatics&size=500&sort=desc&sort_type=created_utc'
  const response = await fetch(url)
  if (!response.ok) return []

  const data = await response.json()
  return (data.data || []).map((p: RedditPost & { full_link?: string }) => ({
    id: p.id,
    title: p.title,
    permalink: p.permalink || p.full_link || '',
    score: p.score || 0,
    created_utc: p.created_utc || 0,
    author: p.author || '',
    post_hint: p.post_hint,
    url_overridden_by_dest: p.url_overridden_by_dest,
  }))
}

function getImageUrl(post: RedditPost): string | null {
  if (post.post_hint === 'image' && post.url_overridden_by_dest) return post.url_overridden_by_dest
  const dest = post.url_overridden_by_dest || ''
  if (/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(dest)) return dest
  if (dest.includes('i.redd.it') || dest.includes('i.imgur.com')) return dest
  return null
}

async function supabaseUpsert(rows: Record<string, unknown>[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reddit_posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase upsert ${res.status}: ${text}`)
  }
  return res
}

async function supabaseUpdate(id: string, fields: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reddit_posts?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(fields),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase update ${res.status}: ${text}`)
  }
}

async function fetchUnOcrdPosts(): Promise<{ id: string; image_url: string }[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reddit_posts?image_url=not.is.null&extracted_name=is.null&order=score.desc&limit=${OCR_BATCH_SIZE}&select=id,image_url`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  )
  if (!res.ok) throw new Error(`Fetch un-OCRd: ${res.status}`)
  return res.json()
}

async function extractNameFromImage(imageUrl: string): Promise<{ name: string | null; headline: string | null }> {
  // Fetch image
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return { name: null, headline: null }

  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  const buffer = await imgRes.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (bytes.length > 5 * 1024 * 1024) return { name: null, headline: null }

  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = contentType.split(';')[0].trim()

  // Call Claude Vision
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
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
            text: 'Look at this screenshot from LinkedIn. Extract:\n1. The person\'s full name (the main person being discussed/shown)\n2. Their LinkedIn headline (the text below their name)\n\nReturn ONLY valid JSON: {"name": "...", "headline": "..."}\nIf you can\'t find a name, return {"name": null, "headline": null}',
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    console.error(`  Claude API ${res.status}: ${await res.text()}`)
    return { name: null, headline: null }
  }

  const data = await res.json()
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

async function runOcr() {
  if (!ANTHROPIC_API_KEY) {
    console.log('Skipping OCR — ANTHROPIC_API_KEY not set')
    return
  }

  console.log('\nRunning OCR on images without extracted names...')
  const posts = await fetchUnOcrdPosts()
  console.log(`  Found ${posts.length} posts needing OCR`)

  let extracted = 0
  let failed = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    process.stdout.write(`\r  Processing ${i + 1}/${posts.length}...`)

    try {
      const result = await extractNameFromImage(post.image_url)

      if (result.name) {
        await supabaseUpdate(post.id, {
          extracted_name: result.name,
          extracted_headline: result.headline,
        })
        extracted++
      } else {
        // Mark as processed (empty string) so we don't retry
        await supabaseUpdate(post.id, { extracted_name: '' })
        failed++
      }
    } catch (err) {
      console.error(`\n  Error on ${post.id}: ${err}`)
      failed++
    }

    // Rate limit: 500ms between calls
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n  OCR complete: ${extracted} names extracted, ${failed} no name found`)
}

async function syncPosts() {
  let allPosts: RedditPost[] = []

  console.log('Fetching from Reddit API...')
  try {
    let after: string | null = null
    for (let page = 0; page < 10; page++) {
      const result = await fetchRedditPage(after || undefined)
      allPosts.push(...result.posts)
      console.log(`  Page ${page + 1}: ${result.posts.length} posts (total: ${allPosts.length})`)
      after = result.after
      if (!after) break
      await new Promise(r => setTimeout(r, 1200))
    }
  } catch (err) {
    console.log(`Reddit API failed: ${err}`)
  }

  console.log('Fetching from PullPush...')
  try {
    const ppPosts = await fetchPullPush()
    console.log(`  PullPush: ${ppPosts.length} posts`)
    const existingIds = new Set(allPosts.map(p => p.id))
    const newPosts = ppPosts.filter(p => !existingIds.has(p.id))
    allPosts.push(...newPosts)
    console.log(`  New unique: ${newPosts.length} (total: ${allPosts.length})`)
  } catch (err) {
    console.log(`PullPush failed: ${err}`)
  }

  if (allPosts.length === 0) {
    console.log('No posts fetched.')
    return
  }

  console.log(`\nUpserting ${allPosts.length} posts to Supabase...`)
  let upserted = 0
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

    await supabaseUpsert(batch)
    upserted += batch.length
    process.stdout.write(`\r  Upserted: ${upserted}/${allPosts.length}`)
  }

  console.log(`\nSync done! ${upserted} posts.`)
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY env var')
    process.exit(1)
  }

  const ocrOnly = process.argv.includes('--ocr-only')

  if (!ocrOnly) {
    await syncPosts()
  }

  await runOcr()
}

main().catch(console.error)
