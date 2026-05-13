export type ChainKind = 'evm' | 'btc' | 'spark' | 'solana'

export type ChainId =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'plasma'
  | 'bitcoin'
  | 'spark'
  | 'solana'

export type AssetId = 'BTC' | 'USDT' | 'XAUT' | 'ETH' | 'MATIC' | 'ARB' | 'XPL' | 'SOL'

export type TxStatus = 'queued' | 'broadcast' | 'confirmed' | 'failed'

export type TxDirection = 'incoming' | 'outgoing'

export type OpenMode = 'popup' | 'side-panel'

export interface AssetConfig {
  id: AssetId
  symbol: string
  name: string
  decimals: number
  tokenAddress?: string
  native?: boolean
  iconUrl?: string
  coingeckoId?: string
}

export interface NetworkConfig {
  id: ChainId
  label: string
  kind: ChainKind
  chainId?: number
  symbol: string
  decimals: number
  rpcUrl?: string
  explorerUrl?: string
  testnet?: boolean
  enabled: boolean
  iconUrl?: string
  assets: AssetConfig[]
}

export interface WalletSummary {
  id: string
  name: string
  createdAt: string
  accountCount: number
}

export interface AccountSummary {
  walletId: string
  accountIndex: number
  networkId: ChainId
  address: string
  path?: string
}

export interface BalanceSummary {
  networkId: ChainId
  assetId: AssetId
  symbol: string
  value: string
  formatted: string
  priceUsd?: number
  valueUsd?: number
  formattedValueUsd?: string
  stale?: boolean
  error?: string
}

export interface TxRecord {
  id: string
  walletId: string
  accountIndex: number
  networkId: ChainId
  assetId: AssetId
  direction: TxDirection
  status: TxStatus
  hash?: string
  from?: string
  to: string
  amount: string
  fee?: string
  origin?: string
  createdAt: string
  updatedAt: string
  error?: string
}

export interface SendDraft {
  walletId: string
  accountIndex: number
  networkId: ChainId
  assetId: AssetId
  to: string
  amount: string
  origin?: string
}

export interface WalletStateSnapshot {
  initialized: boolean
  locked: boolean
  selectedWalletId?: string
  selectedAccountIndex: number
  selectedNetworkId: ChainId
  wallets: WalletSummary[]
  accounts: AccountSummary[]
  balances: BalanceSummary[]
  txs: TxRecord[]
  networks: NetworkConfig[]
  lockTimeoutMinutes: number
  openMode: OpenMode
  warnings: string[]
}

export type WdkRequest =
  | { type: 'PING' }
  | { type: 'GET_STATE' }
  | { type: 'GENERATE_SEED' }
  | { type: 'CREATE_WALLET'; payload: { seedPhrase: string; password: string; walletName?: string } }
  | { type: 'RESTORE_WALLET'; payload: { seedPhrase: string; password: string; walletName?: string } }
  | { type: 'UNLOCK'; payload: { password: string } }
  | { type: 'LOCK' }
  | { type: 'SET_SELECTED_NETWORK'; payload: { networkId: ChainId } }
  | { type: 'SET_SELECTED_ACCOUNT'; payload: { accountIndex: number } }
  | { type: 'ADD_ACCOUNT' }
  | { type: 'REFRESH_ACCOUNTS' }
  | { type: 'REFRESH_BALANCES' }
  | { type: 'QUOTE_SEND'; payload: SendDraft }
  | { type: 'SEND'; payload: SendDraft }
  | { type: 'SET_LOCK_TIMEOUT'; payload: { minutes: number } }
  | { type: 'SET_OPEN_MODE'; payload: { mode: OpenMode } }
  | { type: 'PROVIDER_REQUEST'; payload: ProviderRequest }

export interface WdkResponse<T = unknown> {
  ok: boolean
  result?: T
  error?: string
}

export interface ProviderRequest {
  id: string
  origin: string
  method: string
  params?: unknown[]
}

export interface ProviderResponse {
  id: string
  result?: unknown
  error?: string
}
