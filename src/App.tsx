import { useState, useCallback, useRef } from 'react'
import type { AppStage, UserInput, ScoreResult, RedditResult } from './lib/types'
import { calculateScore } from './lib/scoring'
import { searchReddit } from './lib/reddit'
import { trackEvent } from './lib/analytics'
import LandingPage from './components/LandingPage'
import SearchingAnimation from './components/SearchingAnimation'
import SearchResults from './components/SearchResults'
import InputForm from './components/InputForm'
import LoadingSequence from './components/LoadingSequence'
import ResultsPage from './components/ResultsPage'
import Leaderboard from './components/Leaderboard'

function App() {
  const [stage, setStage] = useState<AppStage>('landing')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [userName, setUserName] = useState('')
  const [userHeadline, setUserHeadline] = useState('')
  const [searchResult, setSearchResult] = useState<RedditResult | null>(null)

  // Cache search result to avoid double API call when name hasn't changed
  const lastSearchedName = useRef('')

  const handleSearch = useCallback(async (name: string) => {
    setUserName(name)
    setStage('searching')
    trackEvent('name-searched', { name })

    const result = await searchReddit(name)
    lastSearchedName.current = name
    setSearchResult(result)

    if (result.posts.length > 0) {
      trackEvent('search-found', { name, postCount: result.posts.length })
    } else {
      trackEvent('search-not-found', { name })
    }

    setStage('search-results')
  }, [])

  const handleGenerateCard = useCallback(() => {
    setStage('form')
    trackEvent('form-started')
  }, [])

  const handleSubmit = useCallback(async (input: UserInput) => {
    setUserName(input.name)
    setUserHeadline(input.headline)
    setStage('processing')
    trackEvent('form-submitted', { behaviors: input.behaviors.length })

    // Reuse cached search result if name matches, otherwise search again
    let redditResult: RedditResult
    if (lastSearchedName.current.toLowerCase() === input.name.toLowerCase() && searchResult) {
      redditResult = searchResult
    } else {
      redditResult = await searchReddit(input.name)
      lastSearchedName.current = input.name
      setSearchResult(redditResult)
    }

    if (redditResult.posts.length > 0) {
      trackEvent('reddit-found')
    } else {
      trackEvent('reddit-not-found')
    }

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
  }, [searchResult])

  const handleLeaderboard = useCallback(() => {
    setStage('leaderboard')
  }, [])

  const handleLeaderboardSearch = useCallback(async (name: string) => {
    // Triggered when clicking a name on the leaderboard
    await handleSearch(name)
  }, [handleSearch])

  const handleReset = useCallback(() => {
    setStage('landing')
    setScoreResult(null)
    setUserName('')
    setUserHeadline('')
    setSearchResult(null)
    lastSearchedName.current = ''
    trackEvent('try-again')
  }, [])

  return (
    <div className="min-h-screen">
      {stage === 'landing' && (
        <LandingPage onSearch={handleSearch} onLeaderboard={handleLeaderboard} />
      )}
      {stage === 'searching' && (
        <SearchingAnimation name={userName} />
      )}
      {stage === 'search-results' && searchResult && (
        <SearchResults
          name={userName}
          result={searchResult}
          onGenerateCard={handleGenerateCard}
          onLeaderboard={handleLeaderboard}
        />
      )}
      {stage === 'form' && (
        <InputForm
          onSubmit={handleSubmit}
          onBack={() => searchResult ? setStage('search-results') : setStage('landing')}
          initialName={userName}
          wasFound={searchResult ? searchResult.posts.length > 0 : undefined}
        />
      )}
      {stage === 'processing' && <LoadingSequence />}
      {stage === 'results' && scoreResult && (
        <ResultsPage
          name={userName}
          headline={userHeadline}
          score={scoreResult}
          onReset={handleReset}
          onLeaderboard={handleLeaderboard}
        />
      )}
      {stage === 'leaderboard' && (
        <Leaderboard
          onSearch={handleLeaderboardSearch}
          onBack={() => setStage('landing')}
        />
      )}
    </div>
  )
}

export default App
