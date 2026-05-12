const KNOWN_SAFE_HOSTS = new Set([
  'app.uniswap.org',
  'opensea.io',
  'etherscan.io',
  'arbiscan.io',
  'polygonscan.com',
  'mempool.space',
  'solscan.io',
  'tether.to',
  'tether.io',
  'docs.wdk.tether.io'
])

const BLOCKED_HOST_FRAGMENTS = ['metamask-', 'walletconnect-', 'tether-airdrop', 'xn--']

export function getOriginWarning(origin?: string): string | undefined {
  if (!origin) return undefined

  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return `Non-HTTPS origin: ${origin}`
    }

    const hostname = url.hostname.toLowerCase()
    if (KNOWN_SAFE_HOSTS.has(hostname)) return undefined

    if (BLOCKED_HOST_FRAGMENTS.some((fragment) => hostname.includes(fragment))) {
      return `Potential phishing origin: ${origin}`
    }

    return `Unknown requesting origin: ${origin}`
  } catch {
    return `Invalid requesting origin: ${origin}`
  }
}

export function assertAddressLooksValid(kind: string, to: string): void {
  const value = to.trim()
  if (!value) throw new Error('Recipient address is required.')

  if (kind === 'evm' && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error('Recipient must be an EVM hex address.')
  }

  if (kind === 'btc' && !/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/.test(value)) {
    throw new Error('Recipient must be a Bitcoin mainnet address.')
  }

  if (kind === 'spark' && !/^spark1[ac-hj-np-z02-9]{20,}$/i.test(value)) {
    throw new Error('Recipient must be a Spark address.')
  }

  if (kind === 'solana' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    throw new Error('Recipient must be a Solana base58 address.')
  }
}
