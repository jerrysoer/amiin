/**
 * Local sync script — fetches Reddit posts, inserts into Supabase, and
 * runs OCR on images to extract LinkedIn names.
 *
 * Usage:
 *   npx tsx scripts/local-sync.ts                    # full sync + OCR
 *   npx tsx scripts/local-sync.ts --ocr-only         # skip fetch, just OCR existing posts
 *   npx tsx scripts/local-sync.ts --fetch-only       # fetch 10k posts, skip OCR
 *   npx tsx scripts/local-sync.ts --ocr-all          # OCR all remaining (200/hr rate limit)
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
const PULLPUSH_TARGET = Infinity
const PULLPUSH_PAGE_SIZE = 100
const PULLPUSH_DELAY_MS = 6000 // 10 req/min to stay under 15/min soft limit
const OCR_RATE_LIMIT_DELAY_MS = 1800 // 2000/hr = 1 every 1.8s

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

async function fetchPullPushPage(before?: number): Promise<RedditPost[]> {
  const params = new URLSearchParams({
    subreddit: 'LinkedInLunatics',
    size: String(PULLPUSH_PAGE_SIZE),
    sort: 'desc',
    sort_type: 'created_utc',
  })
  if (before) params.set('before', String(before))

  const url = `https://api.pullpush.io/reddit/search/submission/?${params}`
  const response = await fetch(url)

  if (response.status === 429) {
    console.log('  Rate limited, waiting 30s...')
    await new Promise(r => setTimeout(r, 30000))
    return fetchPullPushPage(before)
  }

  if (!response.ok) throw new Error(`PullPush ${response.status}`)

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

async function fetchUnOcrdPosts(limit: number): Promise<{ id: string; image_url: string; title: string }[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reddit_posts?image_url=not.is.null&extracted_name=is.null&order=score.desc&limit=${limit}&select=id,image_url,title`,
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

// Skip posts unlikely to contain a person's name (memes, meta posts, etc.)
function likelyHasName(title: string): boolean {
  const skipPatterns = [
    /\bmeme\b/i,
    /\bstarterpack\b/i,
    /\bstarter pack\b/i,
    /\bmeta\b/i,
    /\bmod post\b/i,
    /\brule\s*\d/i,
    /\bannouncement\b/i,
    /\bsubreddit\b/i,
    /which one of you/i,
    /does anyone else/i,
    /am i the only/i,
    /what happened to this sub/i,
    /this sub has become/i,
  ]
  return !skipPatterns.some(p => p.test(title))
}

function detectImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png'
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'
  return null
}

async function extractNameFromImage(imageUrl: string): Promise<{ name: string | null; headline: string | null }> {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return { name: null, headline: null }

  const buffer = await imgRes.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Base64 inflates size ~33%, so cap raw bytes at 3.75MB to stay under 5MB API limit
  if (bytes.length > 3.75 * 1024 * 1024) return { name: null, headline: null }

  // Detect actual image type from magic bytes (don't trust Content-Type header)
  const mediaType = detectImageType(bytes)
  if (!mediaType) return { name: null, headline: null }

  const base64 = Buffer.from(bytes).toString('base64')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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

async function runOcr(processAll = false) {
  if (!ANTHROPIC_API_KEY) {
    console.log('Skipping OCR — ANTHROPIC_API_KEY not set')
    return
  }

  const delayMs = processAll ? OCR_RATE_LIMIT_DELAY_MS : 500
  const limit = processAll ? 1000 : OCR_BATCH_SIZE
  const label = processAll ? '(200/hr rate limit)' : '(fast batch)'

  console.log(`\nRunning OCR ${label}...`)

  let totalExtracted = 0
  let totalFailed = 0
  let totalSkipped = 0

  // Loop until no more posts need OCR
  while (true) {
    const posts = await fetchUnOcrdPosts(limit)
    if (posts.length === 0) break

    console.log(`  Fetched ${posts.length} posts needing OCR`)

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]

      // Skip posts unlikely to have a person's name
      if (!likelyHasName(post.title)) {
        await supabaseUpdate(post.id, { extracted_name: '' })
        totalSkipped++
        continue
      }

      const globalIdx = totalExtracted + totalFailed + totalSkipped + 1
      process.stdout.write(`\r  Processing #${globalIdx} (${totalExtracted} names, ${totalFailed} failed, ${totalSkipped} skipped)...`)

      try {
        const result = await extractNameFromImage(post.image_url)

        if (result.name) {
          await supabaseUpdate(post.id, {
            extracted_name: result.name,
            extracted_headline: result.headline,
          })
          totalExtracted++
        } else {
          await supabaseUpdate(post.id, { extracted_name: '' })
          totalFailed++
        }
      } catch (err) {
        console.error(`\n  Error on ${post.id}: ${err}`)
        totalFailed++
      }

      await new Promise(r => setTimeout(r, delayMs))
    }

    if (!processAll) break // Single batch in non-all mode
  }

  console.log(`\n  OCR complete: ${totalExtracted} names extracted, ${totalFailed} no name found, ${totalSkipped} skipped`)
}

async function upsertBatch(posts: RedditPost[]) {
  let upserted = 0
  for (let i = 0; i < posts.length; i += 50) {
    const batch = posts.slice(i, i + 50).map(post => ({
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
    process.stdout.write(`\r  Upserted: ${upserted}/${posts.length}`)
  }
}

async function syncPosts() {
  const existingIds = new Set<string>()
  let allPosts: RedditPost[] = []

  // Phase 1: Reddit API (up to ~1000 recent posts)
  console.log('Phase 1: Fetching from Reddit API...')
  try {
    let after: string | null = null
    for (let page = 0; page < 10; page++) {
      const result = await fetchRedditPage(after || undefined)
      allPosts.push(...result.posts)
      result.posts.forEach(p => existingIds.add(p.id))
      console.log(`  Page ${page + 1}: ${result.posts.length} posts (total: ${allPosts.length})`)
      after = result.after
      if (!after) break
      await new Promise(r => setTimeout(r, 1200))
    }
  } catch (err) {
    console.log(`  Reddit API failed: ${err}`)
  }

  // Phase 2: PullPush paginated (newest to oldest, up to target)
  console.log(`\nPhase 2: Fetching from PullPush (target: ${PULLPUSH_TARGET})...`)
  let before: number | undefined = undefined
  let pullpushTotal = 0
  let retries = 0
  let stalePages = 0

  while (allPosts.length < PULLPUSH_TARGET) {
    try {
      const posts = await fetchPullPushPage(before)

      if (posts.length === 0) {
        console.log('  PullPush exhausted — no more posts.')
        break
      }

      // Track the oldest timestamp for next page
      const oldestInBatch = Math.min(...posts.map(p => p.created_utc))
      before = oldestInBatch

      // Deduplicate
      const newPosts = posts.filter(p => !existingIds.has(p.id))
      newPosts.forEach(p => existingIds.add(p.id))
      allPosts.push(...newPosts)
      pullpushTotal += newPosts.length

      // Detect stale pages (no new unique posts — we've reached the bottom)
      if (newPosts.length === 0) {
        stalePages++
        if (stalePages >= 3) {
          console.log('\n  PullPush: 3 consecutive stale pages — reached bottom of subreddit.')
          break
        }
      } else {
        stalePages = 0
      }

      const oldestDate = new Date(oldestInBatch * 1000).toISOString().split('T')[0]
      process.stdout.write(`\r  PullPush: ${pullpushTotal} new posts (total: ${allPosts.length}, oldest: ${oldestDate})`)

      // Incremental upsert every 5000 posts to avoid data loss
      if (allPosts.length % 5000 < PULLPUSH_PAGE_SIZE && allPosts.length >= 5000) {
        console.log(`\n  Checkpoint: upserting ${allPosts.length} posts...`)
        const deduped = [...new Map(allPosts.map(p => [p.id, p])).values()]
        await upsertBatch(deduped)
        console.log(`  Checkpoint done.`)
      }

      retries = 0
      await new Promise(r => setTimeout(r, PULLPUSH_DELAY_MS))
    } catch (err) {
      retries++
      if (retries > 5) {
        console.log(`\n  Too many failures, stopping PullPush. Error: ${err}`)
        break
      }
      console.log(`\n  PullPush error (retry ${retries}/5): ${err}`)
      await new Promise(r => setTimeout(r, 30000))
    }
  }

  console.log(`\n  PullPush done: ${pullpushTotal} new posts`)

  if (allPosts.length === 0) {
    console.log('No posts fetched.')
    return
  }

  // Deduplicate by ID (PullPush can return dupes across pages)
  const deduped = [...new Map(allPosts.map(p => [p.id, p])).values()]
  console.log(`\nDeduplicated: ${allPosts.length} → ${deduped.length} unique posts`)
  allPosts = deduped

  // Report oldest post
  const oldest = allPosts.reduce((a, b) => a.created_utc < b.created_utc ? a : b)
  const oldestDate = new Date(oldest.created_utc * 1000)
  console.log(`Oldest post: ${oldestDate.toISOString()} — "${oldest.title}"`)

  // Final upsert
  console.log(`\nFinal upsert: ${allPosts.length} posts...`)
  await upsertBatch(allPosts)
  console.log(`\nSync done! ${allPosts.length} posts.`)
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY env var')
    process.exit(1)
  }

  const ocrOnly = process.argv.includes('--ocr-only')
  const ocrAll = process.argv.includes('--ocr-all')
  const fetchOnly = process.argv.includes('--fetch-only')

  if (!ocrOnly && !ocrAll) {
    await syncPosts()
  }

  if (!fetchOnly) {
    await runOcr(ocrOnly ? false : ocrAll || false)
  }
}

main().catch(console.error)
