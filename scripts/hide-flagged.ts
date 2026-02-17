/**
 * Bulk-hide flagged posts that can't be visually verified.
 *
 * Hides posts matching SENSITIVE_PATTERNS when ANY of:
 *   - image_url is NULL (no image to verify)
 *   - extracted_name is NULL or empty (name not extractable)
 *   - image URL returns HTTP 404 (image deleted by Reddit)
 *
 * Posts with an accessible image AND an extracted name are left for manual review.
 *
 * Usage:
 *   npx tsx scripts/hide-flagged.ts
 *   npx tsx scripts/hide-flagged.ts --dry-run   # preview without hiding
 *
 * Env vars:
 *   SUPABASE_SERVICE_KEY — Supabase service role JWT
 */

const SUPABASE_URL = 'https://bnpdkhivrgtdayxqzihv.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''

const DRY_RUN = process.argv.includes('--dry-run')

// Same patterns as review-flagged.ts
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

interface FlaggedPost {
  id: string
  title: string
  url: string
  image_url: string | null
  extracted_name: string | null
  score: number
  hidden: boolean | null
}

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
}

async function supabaseQuery(queryString: string): Promise<FlaggedPost[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reddit_posts?${queryString}`, {
    headers: HEADERS,
  })
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function hidePost(id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reddit_posts?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ hidden: true }),
  })
  if (!res.ok) {
    throw new Error(`PATCH failed for ${id}: ${res.status} ${await res.text()}`)
  }
}

async function checkImageAccessible(imageUrl: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl, { method: 'HEAD', redirect: 'follow' })
    return res.ok
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchFlaggedPosts(): Promise<FlaggedPost[]> {
  const allFlagged: FlaggedPost[] = []
  const seenIds = new Set<string>()

  console.log('Fetching flagged posts by title and extracted_name patterns...')

  for (const pattern of SENSITIVE_PATTERNS) {
    const encoded = encodeURIComponent(`%${pattern}%`)

    // Search by title
    const titlePosts = await supabaseQuery(
      `title=ilike.${encoded}&hidden=not.eq.true&select=id,title,url,image_url,extracted_name,score,hidden&order=score.desc&limit=100`
    )
    for (const post of titlePosts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id)
        allFlagged.push(post)
      }
    }

    // Search by extracted_name
    const namePosts = await supabaseQuery(
      `extracted_name=ilike.${encoded}&hidden=not.eq.true&select=id,title,url,image_url,extracted_name,score,hidden&order=score.desc&limit=100`
    )
    for (const post of namePosts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id)
        allFlagged.push(post)
      }
    }
  }

  allFlagged.sort((a, b) => b.score - a.score)
  return allFlagged
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY env var')
    process.exit(1)
  }

  if (DRY_RUN) console.log('*** DRY RUN — no posts will be hidden ***\n')

  const posts = await fetchFlaggedPosts()
  console.log(`Found ${posts.length} flagged posts (excluding already-hidden).\n`)

  if (posts.length === 0) return

  let hiddenCount = 0
  let manualReviewCount = 0
  let imageCheckCount = 0
  const manualReviewPosts: FlaggedPost[] = []

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const progress = `[${i + 1}/${posts.length}]`

    // No image → hide
    if (!post.image_url) {
      console.log(`${progress} HIDE (no image): ${post.title.slice(0, 60)}`)
      if (!DRY_RUN) await hidePost(post.id)
      hiddenCount++
      continue
    }

    // No extracted name → hide
    if (!post.extracted_name || post.extracted_name.trim() === '') {
      console.log(`${progress} HIDE (no name): ${post.title.slice(0, 60)}`)
      if (!DRY_RUN) await hidePost(post.id)
      hiddenCount++
      continue
    }

    // Has image + name → check if image is still accessible
    imageCheckCount++
    const accessible = await checkImageAccessible(post.image_url)

    // Rate limit HEAD requests to ~10/sec
    if (imageCheckCount % 10 === 0) await sleep(1000)

    if (!accessible) {
      console.log(`${progress} HIDE (image 404): ${post.title.slice(0, 60)}`)
      if (!DRY_RUN) await hidePost(post.id)
      hiddenCount++
      continue
    }

    // Has accessible image + name → leave for manual review
    console.log(`${progress} KEEP (needs review): ${post.extracted_name} — ${post.title.slice(0, 50)}`)
    manualReviewCount++
    manualReviewPosts.push(post)
  }

  console.log('\n--- Summary ---')
  console.log(`  Hidden:         ${hiddenCount}`)
  console.log(`  Manual review:  ${manualReviewCount}`)
  console.log(`  Image checks:   ${imageCheckCount}`)
  console.log(`  Total flagged:  ${posts.length}`)
  if (DRY_RUN) console.log('  (dry run — nothing was actually hidden)')

  if (manualReviewPosts.length > 0) {
    console.log(`\n--- Posts needing manual review (${manualReviewPosts.length}) ---`)
    for (const p of manualReviewPosts) {
      console.log(`  [score=${p.score}] ${p.extracted_name}: ${p.url}`)
    }
  }
}

main().catch(console.error)
