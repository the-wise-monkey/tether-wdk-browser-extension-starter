import WDK from '@tetherto/wdk'
import WalletManagerBtc from '@tetherto/wdk-wallet-btc'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerSolana from '@tetherto/wdk-wallet-solana'
import WalletManagerSpark from '@tetherto/wdk-wallet-spark'

import { formatUnits, parseUnits } from '../shared/format'
import { getNetwork, NETWORKS } from '../shared/networks'
import type { AccountSummary, BalanceSummary, ChainId, SendDraft, TxRecord } from '../shared/types'
import { getPricesUsd } from './prices'
import { assertAddressLooksValid } from './security'

const WDK_TIMEOUT_MS = 18_000

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = WDK_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs))
  ])
}

export function generateSeedPhrase(): string {
  return WDK.getRandomSeedPhrase(12)
}

export function isValidSeedPhrase(seedPhrase: string): boolean {
  return WDK.isValidSeed(seedPhrase.trim())
}

export class WdkWalletClient {
  private readonly wdk: WDK

  constructor(private readonly seedPhrase: string) {
    this.wdk = new WDK(seedPhrase.trim())

    for (const network of NETWORKS) {
      if (network.kind === 'evm') {
        this.wdk.registerWallet(network.id, WalletManagerEvm as any, { provider: network.rpcUrl })
      }
    }

    this.wdk
      .registerWallet('bitcoin', WalletManagerBtc as any, {
        client: { type: 'blockbook-http', clientConfig: { url: 'https://btc1.trezor.io/api' } },
        network: 'bitcoin'
      })
      .registerWallet('spark', WalletManagerSpark as any, { network: 'MAINNET' })
      .registerWallet('solana', WalletManagerSolana as any, {
        provider: 'https://api.mainnet-beta.solana.com',
        commitment: 'confirmed'
      })
  }

  async getAccountSummary(walletId: string, accountIndex: number, networkId: ChainId): Promise<AccountSummary> {
    const account = await withTimeout(this.wdk.getAccount(networkId, accountIndex), `Derive ${networkId} account`)
    const address = await withTimeout(account.getAddress(), `Read ${networkId} address`)
    return {
      walletId,
      accountIndex,
      networkId,
      address,
      path: account.path
    }
  }

  async getAllAccountSummaries(walletId: string, accountCount: number): Promise<AccountSummary[]> {
    const summaries: AccountSummary[] = []
    for (let index = 0; index < accountCount; index += 1) {
      for (const network of NETWORKS.filter((item) => item.enabled)) {
        try {
          summaries.push(await this.getAccountSummary(walletId, index, network.id))
        } catch {
          summaries.push({
            walletId,
            accountIndex: index,
            networkId: network.id,
            address: 'unavailable'
          })
        }
      }
    }
    return summaries
  }

  async getBalances(accountIndex: number): Promise<BalanceSummary[]> {
    const balances: BalanceSummary[] = []

    for (const network of NETWORKS.filter((item) => item.enabled)) {
      for (const asset of network.assets) {
        try {
          if (network.kind === 'evm') {
            const account = await withTimeout(this.wdk.getAccount(network.id, accountIndex), `Derive ${network.id}`)
            const value = asset.tokenAddress
              ? await withTimeout(account.getTokenBalance(asset.tokenAddress), `Read ${asset.symbol} balance`)
              : await withTimeout(account.getBalance(), `Read ${network.symbol} balance`)

            balances.push({
              networkId: network.id,
              assetId: asset.id,
              symbol: asset.symbol,
              value: value.toString(),
              formatted: formatUnits(value, asset.decimals)
            })
            continue
          }

          if (asset.native) {
            const account = await withTimeout(this.wdk.getAccount(network.id, accountIndex), `Derive ${network.id}`)
            const value = await withTimeout(account.getBalance(), `Read ${network.id} balance`)
            balances.push({
              networkId: network.id,
              assetId: asset.id,
              symbol: asset.symbol,
              value: value.toString(),
              formatted: formatUnits(value, asset.decimals)
            })
            continue
          }

          balances.push({
            networkId: network.id,
            assetId: asset.id,
            symbol: asset.symbol,
            value: '0',
            formatted: '0',
            stale: true,
            error: 'Token contract not configured in this starter registry.'
          })
        } catch (error) {
          balances.push({
            networkId: network.id,
            assetId: asset.id,
            symbol: asset.symbol,
            value: '0',
            formatted: '0',
            stale: true,
            error: error instanceof Error ? error.message : 'Balance read failed.'
          })
        }
      }
    }

    return enrichWithPrices(balances)
  }

  async quoteSend(draft: SendDraft): Promise<{ fee: string; formattedFee: string }> {
    const network = getNetwork(draft.networkId)
    const asset = network.assets.find((item) => item.id === draft.assetId)
    if (!asset) throw new Error(`Asset ${draft.assetId} is not configured on ${network.label}.`)

    assertAddressLooksValid(network.kind, draft.to)

    if (!asset.native && !asset.tokenAddress) {
      throw new Error(`${asset.symbol} on ${network.label} needs a token contract configured before transfers are enabled.`)
    }

    const account = await withTimeout(this.wdk.getAccount(draft.networkId, draft.accountIndex), `Derive ${network.id}`)
    const value = parseUnits(draft.amount, asset.decimals)
    const quote = asset.tokenAddress
      ? await withTimeout(
          account.quoteTransfer({ token: asset.tokenAddress, recipient: draft.to, amount: value }),
          'Quote token transfer'
        )
      : await withTimeout(account.quoteSendTransaction({ to: draft.to, value }), 'Quote native transfer')

    const fee = BigInt(quote.fee ?? 0)
    return {
      fee: fee.toString(),
      formattedFee: formatUnits(fee, network.decimals)
    }
  }

  async send(draft: SendDraft): Promise<Pick<TxRecord, 'hash' | 'fee'>> {
    const network = getNetwork(draft.networkId)
    const asset = network.assets.find((item) => item.id === draft.assetId)
    if (!asset) throw new Error(`Asset ${draft.assetId} is not configured on ${network.label}.`)

    assertAddressLooksValid(network.kind, draft.to)

    if (!asset.native && !asset.tokenAddress) {
      throw new Error(`${asset.symbol} on ${network.label} needs a token contract configured before transfers are enabled.`)
    }

    const account = await withTimeout(this.wdk.getAccount(draft.networkId, draft.accountIndex), `Derive ${network.id}`)
    const value = parseUnits(draft.amount, asset.decimals)
    const result = asset.tokenAddress
      ? await withTimeout(
          account.transfer({ token: asset.tokenAddress, recipient: draft.to, amount: value }),
          'Send token transfer',
          60_000
        )
      : await withTimeout(account.sendTransaction({ to: draft.to, value }), 'Send native transfer', 60_000)

    return {
      hash: result.hash,
      fee: result.fee?.toString()
    }
  }

  dispose(): void {
    try {
      this.wdk.dispose()
    } catch {
      // Some beta modules currently throw on dispose after partial initialization.
      // Keep the extension usable and still drop our top-level references.
    }
  }
}

async function enrichWithPrices(balances: BalanceSummary[]): Promise<BalanceSummary[]> {
  const ids: string[] = []
  for (const balance of balances) {
    const network = NETWORKS.find((item) => item.id === balance.networkId)
    const asset = network?.assets.find((item) => item.id === balance.assetId)
    if (asset?.coingeckoId) ids.push(asset.coingeckoId)
  }
  if (ids.length === 0) return balances

  const prices = await getPricesUsd(ids)

  return balances.map((balance) => {
    const network = NETWORKS.find((item) => item.id === balance.networkId)
    const asset = network?.assets.find((item) => item.id === balance.assetId)
    const price = asset?.coingeckoId ? prices[asset.coingeckoId] : undefined
    if (typeof price !== 'number') return balance

    const formatted = Number(balance.formatted)
    const valueUsd = Number.isFinite(formatted) ? formatted * price : 0
    return {
      ...balance,
      priceUsd: price,
      valueUsd,
      formattedValueUsd: formatUsd(valueUsd)
    }
  })
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0.00'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}
