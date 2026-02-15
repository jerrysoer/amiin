declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number>) => void
    }
  }
}

type EventName =
  | 'form-started'
  | 'form-submitted'
  | 'card-generated'
  | 'reddit-found'
  | 'reddit-not-found'
  | 'card-downloaded'
  | 'share-copied'
  | 'try-again'

export function trackEvent(event: EventName, data?: Record<string, string | number>) {
  try {
    window.umami?.track(event, data)
  } catch {
    // Silently fail if Umami not loaded
  }
}
