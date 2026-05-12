export function formatUnits(value: bigint | string, decimals: number, maxFractionDigits = 6): string {
  const bigintValue = typeof value === 'bigint' ? value : BigInt(value)
  const negative = bigintValue < 0n
  const absolute = negative ? -bigintValue : bigintValue
  const base = 10n ** BigInt(decimals)
  const whole = absolute / base
  const fraction = absolute % base

  if (fraction === 0n) {
    return `${negative ? '-' : ''}${whole.toString()}`
  }

  const fractionText = fraction.toString().padStart(decimals, '0').slice(0, maxFractionDigits)
  const trimmed = fractionText.replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole.toString()}${trimmed ? `.${trimmed}` : ''}`
}

export function parseUnits(value: string, decimals: number): bigint {
  const clean = value.trim()
  if (!/^\d+(\.\d+)?$/.test(clean)) {
    throw new Error('Amount must be a positive decimal number.')
  }

  const [whole, fraction = ''] = clean.split('.')
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`)
  }

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')
}

export function shortAddress(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}
