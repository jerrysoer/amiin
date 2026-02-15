import { useState, useCallback } from 'react'
import type { AppStage, UserInput, ScoreResult } from './lib/types'
import { calculateScore } from './lib/scoring'
import { searchReddit } from './lib/reddit'
import { trackEvent } from './lib/analytics'
import LandingPage from './components/LandingPage'
import InputForm from './components/InputForm'
import LoadingSequence from './components/LoadingSequence'
import ResultsPage from './components/ResultsPage'

function App() {
  const [stage, setStage] = useState<AppStage>('landing')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [userName, setUserName] = useState('')
  const [userHeadline, setUserHeadline] = useState('')

  const handleStart = useCallback(() => {
    setStage('form')
    trackEvent('form-started')
  }, [])

  const handleSubmit = useCallback(async (input: UserInput) => {
    setUserName(input.name)
    setUserHeadline(input.headline)
    setStage('processing')
    trackEvent('form-submitted', { behaviors: input.behaviors.length })

    // Search Reddit while showing loading animation
    const redditResult = await searchReddit(input.name)

    if (redditResult.posts.length > 0) {
      trackEvent('reddit-found')
    } else {
      trackEvent('reddit-not-found')
    }

    // Calculate score
    const result = calculateScore(input, redditResult)
    setScoreResult(result)

    // Small delay so loading animation feels intentional
    await new Promise((r) => setTimeout(r, 800))

    setStage('results')
    trackEvent('card-generated', {
      score: result.totalScore,
      tier: result.tier.name,
      class: result.lunaticClass,
    })
  }, [])

  const handleReset = useCallback(() => {
    setStage('landing')
    setScoreResult(null)
    setUserName('')
    setUserHeadline('')
    trackEvent('try-again')
  }, [])

  return (
    <div className="min-h-screen">
      {stage === 'landing' && <LandingPage onStart={handleStart} />}
      {stage === 'form' && <InputForm onSubmit={handleSubmit} onBack={() => setStage('landing')} />}
      {stage === 'processing' && <LoadingSequence />}
      {stage === 'results' && scoreResult && (
        <ResultsPage
          name={userName}
          headline={userHeadline}
          score={scoreResult}
          onReset={handleReset}
        />
      )}
    </div>
  )
}

export default App
