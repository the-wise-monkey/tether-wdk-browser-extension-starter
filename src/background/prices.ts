const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
const CACHE_TTL_MS = 60_000

interface Cache {
  fetchedAt: number
  prices: Record<string, number>
}

let cache: Cache | undefined
let inFlight: Promise<Record<string, number>> | undefined

export async function getPricesUsd(coingeckoIds: string[]): Promise<Record<string, number>> {
  const uniqueIds = Array.from(new Set(coingeckoIds.filter(Boolean))).sort()
  if (uniqueIds.length === 0) return {}

  const now = Date.now()
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS && uniqueIds.every((id) => id in cache!.prices)) {
    return Object.fromEntries(uniqueIds.map((id) => [id, cache!.prices[id]]))
  }

  if (inFlight) return inFlight

  inFlight = fetch(`${COINGECKO_URL}?ids=${uniqueIds.join(',')}&vs_currencies=usd`)
    .then((response) => {
      if (!response.ok) throw new Error(`CoinGecko ${response.status}`)
      return response.json() as Promise<Record<string, { usd?: number }>>
    })
    .then((payload) => {
      const prices: Record<string, number> = {}
      for (const [id, entry] of Object.entries(payload)) {
        if (typeof entry?.usd === 'number') prices[id] = entry.usd
      }
      cache = { fetchedAt: Date.now(), prices: { ...(cache?.prices ?? {}), ...prices } }
      return prices
    })
    .catch(() => ({}))
    .finally(() => {
      inFlight = undefined
    })

  return inFlight
}
