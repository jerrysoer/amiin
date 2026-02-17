# Am I In? — LinkedIn Lunatic Trading Card Generator

Score your LinkedIn cringe level, get a shareable trading card, and find out if r/LinkedInLunatics has noticed you.

**Live:** [jerrysoer.github.io/LinkedinLunatics](https://jerrysoer.github.io/LinkedinLunatics/)

## How It Works

1. **Confess** — Enter your name, LinkedIn headline, and select your guilty behaviors
2. **Analyze** — The app scores your cringe level based on behavior points, headline analysis (pipes, buzzwords, emojis), and an optional Reddit lookup
3. **Collect** — Get a trading card with your tier (Normie → Mythic Lunatic), class (e.g. Hustle Bro, Thought Leader), and RPG-style stat bars

## Features

- 6 tiers with unique card designs (Common through Mythic with holographic border)
- 11 lunatic classes based on behavior patterns
- Headline analyzer that detects pipes, buzzwords, and emojis
- Reddit r/LinkedInLunatics search via Supabase Edge Functions + Claude Vision OCR
- Download card as PNG or copy share text
- Confetti animation for Mythic tier results
- 100% client-side scoring — no data stored

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- html2canvas for card export
- Supabase (Postgres + Edge Functions) for Reddit data
- Claude Vision API for OCR name extraction from Reddit screenshots
- GitHub Pages deployment via Actions

## Development

```bash
npm install
npm run dev     # Vite dev server on port 5173
npm run build   # TypeScript check + production build
npm run preview # Preview production build
```

## Environment Variables

```
VITE_SUPABASE_FUNCTION_URL=  # Supabase Edge Function URL for reddit-search
```

## Supabase Setup

1. Create a Supabase project
2. Run `supabase-schema.sql` in the SQL editor
3. Deploy edge functions: `supabase functions deploy sync-reddit` and `supabase functions deploy reddit-search`
4. Set secrets: `ANTHROPIC_API_KEY` (for OCR)
5. Optionally schedule `sync-reddit` via pg_cron for daily syncs
