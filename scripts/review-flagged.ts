/**
 * Interactive content moderation script — review flagged posts and
 * keep or delete them from the database.
 *
 * Usage:
 *   npx tsx scripts/review-flagged.ts
 *
 * Env vars:
 *   SUPABASE_SERVICE_KEY — Supabase service role JWT
 */

import * as readline from 'readline'

const SUPABASE_URL = 'https://bnpdkhivrgtdayxqzihv.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY

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
  'Alex Pretti', // known misidentified name from plan
]

interface FlaggedPost {
  id: string
  title: string
  url: string
  extracted_name: string | null
  score: number
}

async function supabaseQuery(queryString: string): Promise<FlaggedPost[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reddit_posts?${queryString}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Query failed: ${res.status}`)
  return res.json()
}

async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reddit_posts?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Delete failed ${res.status}: ${text}`)
  }
}

function waitForKey(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
    process.stdin.resume()
    process.stdin.once('data', (data) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }
      process.stdin.pause()
      resolve(data.toString().toLowerCase())
    })
  })
}

async function fetchFlaggedPosts(): Promise<FlaggedPost[]> {
  const allFlagged: FlaggedPost[] = []
  const seenIds = new Set<string>()

  // Search by title patterns using Supabase ilike
  for (const pattern of SENSITIVE_PATTERNS) {
    const encoded = encodeURIComponent(`%${pattern}%`)
    const posts = await supabaseQuery(
      `title=ilike.${encoded}&select=id,title,url,extracted_name,score&order=score.desc&limit=50`
    )
    for (const post of posts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id)
        allFlagged.push(post)
      }
    }
  }

  // Also search by extracted_name patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    const encoded = encodeURIComponent(`%${pattern}%`)
    const posts = await supabaseQuery(
      `extracted_name=ilike.${encoded}&select=id,title,url,extracted_name,score&order=score.desc&limit=50`
    )
    for (const post of posts) {
      if (!seenIds.has(post.id)) {
        seenIds.add(post.id)
        allFlagged.push(post)
      }
    }
  }

  // Sort by score descending (most visible first)
  allFlagged.sort((a, b) => b.score - a.score)

  return allFlagged
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY env var')
    process.exit(1)
  }

  console.log('Fetching flagged posts...\n')
  const posts = await fetchFlaggedPosts()

  if (posts.length === 0) {
    console.log('No flagged posts found.')
    return
  }

  console.log(`Found ${posts.length} flagged posts.\n`)
  console.log('Controls: [K]eep  [D]elete  [S]kip  [Q]uit\n')

  let kept = 0
  let deleted = 0
  let skipped = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const progress = `[${i + 1}/${posts.length}]`

    console.log(`${progress} Score: ${post.score}`)
    console.log(`  Title: ${post.title}`)
    console.log(`  Name:  ${post.extracted_name || '(none)'}`)
    console.log(`  URL:   ${post.url}`)
    process.stdout.write('  Action? [K]eep / [D]elete / [S]kip / [Q]uit: ')

    const key = await waitForKey()
    console.log(key.toUpperCase())

    switch (key) {
      case 'k':
        kept++
        console.log('  -> Kept\n')
        break
      case 'd':
        try {
          await deletePost(post.id)
          deleted++
          console.log('  -> Deleted\n')
        } catch (err) {
          console.error(`  -> Delete failed: ${err}\n`)
        }
        break
      case 's':
        skipped++
        console.log('  -> Skipped\n')
        break
      case 'q':
      case '\u0003': // Ctrl+C
        console.log('\n\nQuitting early.')
        break
      default:
        skipped++
        console.log('  -> Skipped (unrecognized key)\n')
    }

    if (key === 'q' || key === '\u0003') break
  }

  console.log('\n--- Summary ---')
  console.log(`  Kept:    ${kept}`)
  console.log(`  Deleted: ${deleted}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Total:   ${posts.length}`)
}

main().catch(console.error)
