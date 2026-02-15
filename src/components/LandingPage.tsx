import ExampleCards from './ExampleCards'

interface LandingPageProps {
  onStart: () => void
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden noise">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-16 sm:pt-24 pb-16">
        {/* Badge */}
        <div className="fade-in-up text-center mb-6">
          <span
            className="inline-block px-3 py-1 rounded-full border border-neon-pink/30 bg-neon-pink/5 text-neon-pink text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            r/LinkedInLunatics Detector
          </span>
        </div>

        {/* Hero */}
        <h1
          className="fade-in-up glitch-text text-center text-5xl sm:text-7xl font-extrabold tracking-tighter leading-[0.9] mb-4"
          style={{ fontFamily: 'var(--font-display)', animationDelay: '100ms' }}
        >
          AM I A
          <br />
          <span className="text-neon-pink">LINKEDIN</span>
          <br />
          LUNATIC?
        </h1>

        <p
          className="fade-in-up text-center text-text-muted text-sm sm:text-base max-w-md mx-auto mb-10 leading-relaxed"
          style={{ fontFamily: 'var(--font-mono)', animationDelay: '200ms' }}
        >
          Score your LinkedIn cringe. Get your trading card.
          <br />
          Find out if Reddit has noticed you.
        </p>

        {/* CTA */}
        <div className="fade-in-up text-center mb-16" style={{ animationDelay: '300ms' }}>
          <button
            onClick={onStart}
            className="group relative px-8 py-4 bg-neon-pink text-white font-bold text-base rounded-xl border-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="relative z-10 tracking-wide">FIND OUT NOW</span>
            <div className="absolute inset-0 rounded-xl bg-neon-pink opacity-50 blur-xl group-hover:opacity-80 transition-opacity" />
          </button>
        </div>

        {/* Example cards */}
        <div className="fade-in-up" style={{ animationDelay: '400ms' }}>
          <p
            className="text-center text-text-muted text-[10px] uppercase tracking-[0.3em] mb-6"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Example classifications
          </p>
          <ExampleCards />
        </div>

        {/* How it works */}
        <div className="fade-in-up mt-16 stagger" style={{ animationDelay: '500ms' }}>
          <p
            className="text-center text-text-muted text-[10px] uppercase tracking-[0.3em] mb-8"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'CONFESS', desc: 'Tell us your LinkedIn sins' },
              { step: '02', title: 'ANALYZE', desc: 'We score your cringe level' },
              { step: '03', title: 'COLLECT', desc: 'Get your trading card' },
            ].map((item) => (
              <div
                key={item.step}
                className="fade-in-up border border-surface-overlay rounded-xl p-5 bg-surface-raised/50 text-center"
              >
                <span
                  className="text-neon-blue text-[10px] font-bold tracking-[0.3em] block mb-2"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {item.step}
                </span>
                <h3
                  className="text-base font-extrabold tracking-wide mb-1"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-text-muted text-xs"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
