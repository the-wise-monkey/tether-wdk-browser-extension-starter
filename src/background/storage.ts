import type { ChainId, OpenMode, TxRecord, WalletSummary } from '../shared/types'

export interface EncryptedSeedEnvelope {
  version: 1
  algorithm: 'AES-GCM'
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

export interface StoredWallet extends WalletSummary {
  encryptedSeed: EncryptedSeedEnvelope
}

export interface StoredState {
  wallets: StoredWallet[]
  selectedWalletId?: string
  selectedAccountIndex: number
  selectedNetworkId: ChainId
  lockTimeoutMinutes: number
  openMode: OpenMode
  txs: TxRecord[]
}

const STORAGE_KEY = 'wdk_wallet_state_v1'

const DEFAULT_STATE: StoredState = {
  wallets: [],
  selectedAccountIndex: 0,
  selectedNetworkId: 'ethereum',
  lockTimeoutMinutes: 15,
  openMode: 'popup',
  txs: []
}

export async function loadStoredState(): Promise<StoredState> {
  const data = await chrome.storage.local.get(STORAGE_KEY)
  return {
    ...DEFAULT_STATE,
    ...(data[STORAGE_KEY] ?? {})
  }
}

export async function saveStoredState(state: StoredState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state })
}

export async function patchStoredState(patch: Partial<StoredState>): Promise<StoredState> {
  const current = await loadStoredState()
  const next = { ...current, ...patch }
  await saveStoredState(next)
  return next
}
