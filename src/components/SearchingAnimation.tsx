export default function SearchingAnimation({ name }: { name: string }) {
  return (
    <div className="min-h-screen bg-surface noise relative flex items-center justify-center">
      <div className="relative z-10 text-center px-5">
        {/* Scanning rings */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-neon-pink/30"
            style={{ animation: 'searchPulse 2s ease-out infinite' }}
          />
          {/* Middle ring */}
          <div
            className="absolute inset-3 rounded-full border-2 border-neon-pink/50"
            style={{ animation: 'searchPulse 2s ease-out infinite 0.4s' }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-6 rounded-full border-2 border-neon-pink/70"
            style={{ animation: 'searchPulse 2s ease-out infinite 0.8s' }}
          />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl" style={{ animation: 'searchSpin 3s linear infinite' }}>
              🔍
            </span>
          </div>
        </div>

        {/* Search text */}
        <h2
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          SCANNING FOR{' '}
          <span className="text-neon-pink">{name.toUpperCase()}</span>
        </h2>

        <p
          className="text-text-muted text-sm loading-dots"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Searching 60,000+ posts on r/LinkedInLunatics
        </p>

        {/* Subtle progress bar */}
        <div className="mt-8 max-w-xs mx-auto">
          <div className="h-0.5 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-pink rounded-full"
              style={{ animation: 'searchProgress 2.5s ease-in-out infinite' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
