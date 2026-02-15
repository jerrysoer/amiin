import type { TierInfo, TierName } from './types'

export const tiers: TierInfo[] = [
  {
    name: 'Normie',
    rarity: 'Common',
    minScore: 0,
    maxScore: 25,
    stars: 1,
    colors: {
      border: '#6b7280',
      bg: '#f9fafb',
      accent: '#9ca3af',
      text: '#374151',
      statBar: '#9ca3af',
    },
  },
  {
    name: 'Aspiring Lunatic',
    rarity: 'Uncommon',
    minScore: 26,
    maxScore: 60,
    stars: 2,
    colors: {
      border: '#22c55e',
      bg: '#f0fdf4',
      accent: '#4ade80',
      text: '#166534',
      statBar: '#22c55e',
    },
  },
  {
    name: 'Certified Lunatic',
    rarity: 'Rare',
    minScore: 61,
    maxScore: 100,
    stars: 3,
    colors: {
      border: '#3b82f6',
      bg: '#eff6ff',
      accent: '#60a5fa',
      text: '#1e40af',
      statBar: '#3b82f6',
    },
  },
  {
    name: 'Mega Lunatic',
    rarity: 'Epic',
    minScore: 101,
    maxScore: 150,
    stars: 4,
    colors: {
      border: '#a855f7',
      bg: '#faf5ff',
      accent: '#c084fc',
      text: '#6b21a8',
      statBar: '#a855f7',
    },
  },
  {
    name: 'Ultra Lunatic',
    rarity: 'Legendary',
    minScore: 151,
    maxScore: 200,
    stars: 5,
    colors: {
      border: '#f59e0b',
      bg: '#fffbeb',
      accent: '#fbbf24',
      text: '#92400e',
      statBar: '#f59e0b',
    },
  },
  {
    name: 'Mythic Lunatic',
    rarity: 'Mythic',
    minScore: 201,
    maxScore: 999,
    stars: 5,
    colors: {
      border: '#ef4444',
      bg: '#0f0f0f',
      accent: '#f87171',
      text: '#fef2f2',
      statBar: '#ef4444',
    },
  },
]

export function getTierForScore(score: number): TierInfo {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (score >= tiers[i].minScore) return tiers[i]
  }
  return tiers[0]
}

export function getStarDisplay(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

export function isMythic(tierName: TierName): boolean {
  return tierName === 'Mythic Lunatic'
}
