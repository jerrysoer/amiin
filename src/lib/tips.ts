import type { LunaticClass } from './types'

export const classTips: Record<LunaticClass, string[]> = {
  'Humble Bragger': [
    'Try starting your next post with "I\'m so blessed" — it\'s less obvious than "Just got promoted for the 3rd time this year"',
    'Pro tip: mention your salary range without mentioning your salary range',
    'Consider therapy. But make sure to post about it.',
  ],
  'Thought Leader': [
    'Your hot take of "be kind to people" really disrupted the industry',
    'Remember: if you haven\'t posted a framework with 4 circles and arrows, are you even leading thought?',
    'LinkedIn\'s algorithm rewards original thinking. Yours is... almost that.',
  ],
  'Hustle Bro': [
    'Your alarm goes off at 4:30 AM. You could sleep, but that\'s what losers do. (Losers also live longer.)',
    'Grind culture tip: replace sleep with cold showers and see how long you last',
    'You\'ve optimized your morning routine. Now optimize having friends.',
  ],
  'Grief Exploiter': [
    'Next time you lose a goldfish, remember: that\'s at least 500 likes',
    'Truly sorry about your loss. Even sorrier about your post about it.',
    'Emotional vulnerability is brave. Weaponized vulnerability is LinkedIn.',
  ],
  'Corporate Poet': [
    'Your 47-line post about a coffee shop interaction changed exactly zero lives',
    'Line breaks don\'t make it poetry. They make it... dramatic... pausing...',
    'Hemingway wrote in 6 words. You need 600. Different energy.',
  ],
  'Selfie CEO': [
    'That headshot-to-content ratio is concerning',
    'Your face is your brand. Unfortunately, so is everything else.',
    'Conference selfies: because the keynote is less important than proving you were there',
  ],
  'Recruiter Cringe': [
    '"Exciting opportunity" in your DM means $40K and unlimited PTO (2 weeks)',
    'Your candidate ghosted you? Maybe lead with the salary next time.',
    'You\'re not networking. You\'re cold-calling with extra steps.',
  ],
  'Engagement Farmer': [
    'Your "Agree?" posts are the participation trophies of LinkedIn',
    'The algorithm loves you. Actual humans? TBD.',
    'Repost if you agree. Like if you also agree. Comment if you super agree.',
  ],
  'Inspirational Liar': [
    'That "CEO who taught you everything in an elevator" was actually a janitor and you know it',
    'Your fabricated conversations have better dialogue than most TV shows',
    '"And then everybody clapped" — sure they did, champ.',
  ],
  'Reply Guy': [
    'You\'ve commented "Great point!" on 47 posts today. None of them were great points.',
    'Your reply-to-original-content ratio is... medically concerning',
    'First! (On every LinkedIn influencer\'s post)',
  ],
  'Generic Professional': [
    'You\'re barely on the radar. This is actually a compliment.',
    'Your LinkedIn is so normal it\'s almost suspicious',
    'Keep this up and you might actually use LinkedIn for... networking?',
  ],
}

export function getRandomTip(lunaticClass: LunaticClass): string {
  const tips = classTips[lunaticClass]
  return tips[Math.floor(Math.random() * tips.length)]
}

export function getAllTips(lunaticClass: LunaticClass): string[] {
  return classTips[lunaticClass]
}
