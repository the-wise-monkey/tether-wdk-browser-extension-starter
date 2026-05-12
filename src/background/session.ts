import type {
  AccountSummary,
  ChainId,
  OpenMode,
  ProviderRequest,
  SendDraft,
  TxRecord,
  WalletStateSnapshot,
  WalletSummary
} from '../shared/types'
import { createId } from '../shared/runtime'
import { NETWORKS } from '../shared/networks'
import { decryptSeed, encryptSeed } from './crypto'
import { getOriginWarning } from './security'
import { loadStoredState, patchStoredState, saveStoredState, type StoredState } from './storage'
import { generateSeedPhrase, isValidSeedPhrase, WdkWalletClient } from './wdkClient'

class WalletSession {
  private seedPhrase?: string
  private client?: WdkWalletClient
  private lastActivity = Date.now()
  private lockAlarmName = 'wdk-wallet-lock'

  async getState(): Promise<WalletStateSnapshot> {
    const stored = await loadStoredState()
    const selectedWallet = stored.wallets.find((wallet) => wallet.id === stored.selectedWalletId)
    const accounts = await this.getAccounts(stored, selectedWallet)
    const warnings = this.getWarnings(stored)

    return {
      initialized: stored.wallets.length > 0,
      locked: !this.seedPhrase,
      selectedWalletId: stored.selectedWalletId,
      selectedAccountIndex: stored.selectedAccountIndex,
      selectedNetworkId: stored.selectedNetworkId,
      wallets: stored.wallets.map(stripEncryptedSeed),
      accounts,
      balances: [],
      txs: stored.txs,
      networks: NETWORKS,
      lockTimeoutMinutes: stored.lockTimeoutMinutes,
      openMode: stored.openMode,
      warnings
    }
  }

  generateSeedPhrase(): string {
    return generateSeedPhrase()
  }

  async createWallet(seedPhrase: string, password: string, walletName = 'Main wallet'): Promise<WalletStateSnapshot> {
    const cleanSeed = seedPhrase.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!isValidSeedPhrase(cleanSeed)) throw new Error('Invalid BIP-39 seed phrase.')

    const encryptedSeed = await encryptSeed(cleanSeed, password)
    const now = new Date().toISOString()
    const wallet = {
      id: createId('wallet'),
      name: walletName,
      createdAt: now,
      accountCount: 1,
      encryptedSeed
    }

    const previous = await loadStoredState()
    const stored: StoredState = {
      wallets: [wallet],
      selectedWalletId: wallet.id,
      selectedAccountIndex: 0,
      selectedNetworkId: 'ethereum',
      lockTimeoutMinutes: 15,
      openMode: previous.openMode,
      txs: []
    }

    await saveStoredState(stored)
    await this.unlock(password)
    return this.getState()
  }

  async unlock(password: string): Promise<WalletStateSnapshot> {
    const stored = await loadStoredState()
    const wallet = stored.wallets.find((item) => item.id === stored.selectedWalletId) ?? stored.wallets[0]
    if (!wallet) throw new Error('No wallet has been created yet.')

    this.seedPhrase = await decryptSeed(wallet.encryptedSeed, password)
    this.client?.dispose()
    this.client = new WdkWalletClient(this.seedPhrase)
    this.touch(stored.lockTimeoutMinutes)
    return this.getState()
  }

  async lock(): Promise<WalletStateSnapshot> {
    this.seedPhrase = undefined
    this.client?.dispose()
    this.client = undefined
    await chrome.alarms.clear(this.lockAlarmName)
    return this.getState()
  }

  async setSelectedNetwork(networkId: ChainId): Promise<WalletStateSnapshot> {
    await patchStoredState({ selectedNetworkId: networkId })
    await this.keepAlive()
    return this.getState()
  }

  async setSelectedAccount(accountIndex: number): Promise<WalletStateSnapshot> {
    await patchStoredState({ selectedAccountIndex: accountIndex })
    await this.keepAlive()
    return this.getState()
  }

  async addAccount(): Promise<WalletStateSnapshot> {
    const stored = await loadStoredState()
    const wallets = stored.wallets.map((wallet) =>
      wallet.id === stored.selectedWalletId ? { ...wallet, accountCount: wallet.accountCount + 1 } : wallet
    )
    await patchStoredState({ wallets, selectedAccountIndex: (wallets[0]?.accountCount ?? 1) - 1 })
    await this.keepAlive()
    return this.getState()
  }

  async setLockTimeout(minutes: number): Promise<WalletStateSnapshot> {
    const normalized = Math.max(1, Math.min(120, Math.round(minutes)))
    await patchStoredState({ lockTimeoutMinutes: normalized })
    this.touch(normalized)
    return this.getState()
  }

  async setOpenMode(mode: OpenMode): Promise<WalletStateSnapshot> {
    await patchStoredState({ openMode: mode })
    await this.keepAlive()
    return this.getState()
  }

  async refreshAccounts(): Promise<WalletStateSnapshot> {
    await this.requireClient()
    await this.keepAlive()
    return this.getState()
  }

  async refreshBalances(): Promise<WalletStateSnapshot> {
    const client = await this.requireClient()
    const stored = await loadStoredState()
    const snapshot = await this.getState()
    return {
      ...snapshot,
      balances: await client.getBalances(stored.selectedAccountIndex)
    }
  }

  async quoteSend(draft: SendDraft): Promise<{ fee: string; formattedFee: string }> {
    const client = await this.requireClient()
    await this.keepAlive()
    return client.quoteSend(draft)
  }

  async send(draft: SendDraft): Promise<WalletStateSnapshot> {
    const client = await this.requireClient()
    const stored = await loadStoredState()
    const now = new Date().toISOString()
    const tx: TxRecord = {
      id: createId('tx'),
      walletId: draft.walletId,
      accountIndex: draft.accountIndex,
      networkId: draft.networkId,
      assetId: draft.assetId,
      direction: 'outgoing',
      status: 'queued',
      to: draft.to,
      amount: draft.amount,
      origin: draft.origin,
      createdAt: now,
      updatedAt: now
    }

    await patchStoredState({ txs: [tx, ...stored.txs].slice(0, 100) })

    try {
      const result = await client.send(draft)
      const sentTx = { ...tx, status: 'broadcast' as const, hash: result.hash, fee: result.fee, updatedAt: new Date().toISOString() }
      const next = await loadStoredState()
      await patchStoredState({ txs: [sentTx, ...next.txs.filter((item) => item.id !== tx.id)].slice(0, 100) })
    } catch (error) {
      const failedTx = {
        ...tx,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Transaction failed.',
        updatedAt: new Date().toISOString()
      }
      const next = await loadStoredState()
      await patchStoredState({ txs: [failedTx, ...next.txs.filter((item) => item.id !== tx.id)].slice(0, 100) })
      throw error
    }

    await this.keepAlive()
    return this.getState()
  }

  async handleProviderRequest(request: ProviderRequest): Promise<unknown> {
    const client = await this.requireClient()
    const stored = await loadStoredState()
    const networkId = stored.selectedNetworkId
    const network = NETWORKS.find((item) => item.id === networkId)
    const selectedWallet = stored.wallets.find((item) => item.id === stored.selectedWalletId)
    if (!selectedWallet || !network) throw new Error('Wallet is not ready.')

    const account = await client.getAccountSummary(selectedWallet.id, stored.selectedAccountIndex, networkId)
    const warning = getOriginWarning(request.origin)
    if (warning?.startsWith('Potential phishing')) throw new Error(warning)

    switch (request.method) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return network.kind === 'evm' ? [account.address] : []
      case 'eth_chainId':
        return network.chainId ? `0x${network.chainId.toString(16)}` : undefined
      case 'net_version':
        return network.chainId?.toString()
      case 'personal_sign': {
        if (network.kind !== 'evm') throw new Error('personal_sign is only available for EVM networks.')
        const message = String(request.params?.[0] ?? '')
        const rawAccount = await (client as any).wdk.getAccount(networkId, stored.selectedAccountIndex)
        return rawAccount.sign(message)
      }
      default:
        throw new Error(`Provider method not implemented in starter: ${request.method}`)
    }
  }

  handleAlarm(name: string): void {
    if (name === this.lockAlarmName && this.seedPhrase) {
      void this.lock()
    }
  }

  private async requireClient(): Promise<WdkWalletClient> {
    if (!this.client) throw new Error('Wallet is locked.')
    return this.client
  }

  private async keepAlive(): Promise<void> {
    const stored = await loadStoredState()
    this.touch(stored.lockTimeoutMinutes)
  }

  private touch(timeoutMinutes: number): void {
    this.lastActivity = Date.now()
    void chrome.alarms.clear(this.lockAlarmName)
    void chrome.alarms.create(this.lockAlarmName, { delayInMinutes: timeoutMinutes })
  }

  private async getAccounts(stored: StoredState, selectedWallet?: { id: string; accountCount: number }): Promise<AccountSummary[]> {
    if (!selectedWallet || !this.client) return []
    try {
      return this.client.getAllAccountSummaries(selectedWallet.id, selectedWallet.accountCount)
    } catch {
      return []
    }
  }

  private getWarnings(stored: StoredState): string[] {
    const warnings: string[] = []
    if (stored.wallets.length > 0 && !this.seedPhrase) {
      warnings.push('Seed phrase is encrypted at rest. Unlock to derive accounts or sign.')
    }
    if (Date.now() - this.lastActivity > stored.lockTimeoutMinutes * 60_000 && this.seedPhrase) {
      warnings.push('Session timeout elapsed; lock is pending.')
    }
    warnings.push('Spark support uses the beta @tetherto/wdk-wallet-spark module; TESTNET currently expects a local Spark stack.')
    return warnings
  }
}

function stripEncryptedSeed(wallet: { id: string; name: string; createdAt: string; accountCount: number }): WalletSummary {
  return {
    id: wallet.id,
    name: wallet.name,
    createdAt: wallet.createdAt,
    accountCount: wallet.accountCount
  }
}

export const walletSession = new WalletSession()
