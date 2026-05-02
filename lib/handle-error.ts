import { toast } from 'sonner'
import { RateLimitError, NonIndianLawError } from '@/lib/api'

export function handleApiError(e: unknown, fallback = 'Something went wrong'): void {
  if (e instanceof NonIndianLawError) {
    window.dispatchEvent(new CustomEvent('nonIndianLawError'))
    return
  }

  if (e instanceof RateLimitError) {
    const mins = e.retryAfterMinutes
    toast.error(
      `Free tier API limit reached across all keys. Please try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
      {
        duration: 8000,
        description: 'LegalDoc runs on free API quotas. Thank you for your patience.',
      }
    )
    return
  }

  const msg = e instanceof Error ? e.message : fallback
  toast.error(msg)
}
