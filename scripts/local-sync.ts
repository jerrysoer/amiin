/**
 * Local sync script — fetches Reddit posts and inserts into Supabase.
 * Run from your machine since Reddit/PullPush block cloud IPs.
 *
 * Usage: npx tsx scripts/local-sync.ts
 */

const SUPABASE_URL = 'https://bnpdkhivrgtdayxqzihv.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

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

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY env var')
    process.exit(1)
  }

  let allPosts: RedditPost[] = []

  // Fetch from Reddit API with pagination
  console.log('Fetching from Reddit API...')
  try {
    let after: string | null = null
    for (let page = 0; page < 10; page++) {
      const result = await fetchRedditPage(after || undefined)
      allPosts.push(...result.posts)
      console.log(`  Page ${page + 1}: ${result.posts.length} posts (total: ${allPosts.length})`)
      after = result.after
      if (!after) break
      await new Promise(r => setTimeout(r, 1200)) // Rate limit
    }
  } catch (err) {
    console.log(`Reddit API failed: ${err}`)
  }

  // Also fetch from PullPush for historical coverage
  console.log('Fetching from PullPush...')
  try {
    const ppPosts = await fetchPullPush()
    console.log(`  PullPush: ${ppPosts.length} posts`)
    // Deduplicate by ID
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

  // Upsert in batches
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

  console.log(`\nDone! ${upserted} posts synced.`)
}

main().catch(console.error)
