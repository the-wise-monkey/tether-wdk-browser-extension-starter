import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Activity,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  QrCode,
  RefreshCcw,
  Send,
  Settings,
  ShieldAlert,
  Wallet
} from 'lucide-react'
import QRCode from 'qrcode'

import { shortAddress } from '../shared/format'
import { sendMessage } from '../shared/runtime'
import type { AssetId, ChainId, SendDraft, WalletStateSnapshot } from '../shared/types'
import { setBusy, setError, setNotice, setSnapshot, type RootState } from './store'

type Tab = 'assets' | 'send' | 'receive' | 'activity' | 'settings'

export function App() {
  const dispatch = useDispatch()
  const { snapshot, busy, error, notice } = useSelector((state: RootState) => state.ui)
  const [tab, setTab] = useState<Tab>('assets')

  useEffect(() => {
    void run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'GET_STATE' }))
  }, [dispatch])

  if (!snapshot) {
    return <Shell busy={busy}>Loading wallet...</Shell>
  }

  if (!snapshot.initialized) {
    return (
      <Shell busy={busy} error={error} notice={notice}>
        <Onboarding />
      </Shell>
    )
  }

  if (snapshot.locked) {
    return (
      <Shell busy={busy} error={error} notice={notice}>
        <Unlock />
      </Shell>
    )
  }

  return (
    <Shell busy={busy} error={error} notice={notice} snapshot={snapshot}>
      <Header snapshot={snapshot} />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'assets' && <Assets snapshot={snapshot} />}
      {tab === 'send' && <SendPanel snapshot={snapshot} />}
      {tab === 'receive' && <ReceivePanel snapshot={snapshot} />}
      {tab === 'activity' && <ActivityPanel snapshot={snapshot} />}
      {tab === 'settings' && <SettingsPanel snapshot={snapshot} />}
    </Shell>
  )
}

function Shell({
  children,
  busy,
  error,
  notice,
  snapshot
}: {
  children: React.ReactNode
  busy: boolean
  error?: string
  notice?: string
  snapshot?: WalletStateSnapshot
}) {
  const warnings = snapshot?.warnings ?? []
  return (
    <main className="app">
      <div className="topline">
        <div className="brand">
          <img src="/icon.svg" alt="" />
          <span>WDK Wallet</span>
        </div>
        {busy && <span className="status-dot">Working</span>}
      </div>
      {error && <Banner tone="error" text={error} />}
      {notice && <Banner tone="info" text={notice} />}
      {warnings.map((warning) => (
        <Banner key={warning} tone="warning" text={warning} />
      ))}
      {children}
    </main>
  )
}

function Banner({ tone, text }: { tone: 'error' | 'info' | 'warning'; text: string }) {
  return (
    <div className={`banner banner-${tone}`}>
      <ShieldAlert size={15} />
      <span>{text}</span>
    </div>
  )
}

type DropdownOption<T extends string | number> = {
  value: T
  label: string
  detail?: string
  icon?: React.ReactNode
}

function Dropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  compact = false
}: {
  label: string
  value: T
  options: Array<DropdownOption<T>>
  onChange: (value: T) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) ?? options[0]
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={`dropdown-field${compact ? ' compact' : ''}`}
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <span className="dropdown-label">{label}</span>
      <button
        type="button"
        className={`dropdown-trigger${open ? ' open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dropdown-selected">
          {selected?.icon}
          <span>
            <strong>{selected?.label}</strong>
            {selected?.detail && <small>{selected.detail}</small>}
          </span>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="dropdown-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dropdown-option${option.value === selected?.value ? ' selected' : ''}`}
              role="option"
              aria-selected={option.value === selected?.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.icon}
              <span>
                <strong>{option.label}</strong>
                {option.detail && <small>{option.detail}</small>}
              </span>
              {option.value === selected?.value && <Check className="dropdown-check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChainIcon({ id }: { id: ChainId }) {
  if (id === 'solana') {
    return (
      <span className="chain-icon chain-icon-solana" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    )
  }

  const labels: Record<ChainId, string> = {
    ethereum: '◆',
    polygon: '⬡',
    arbitrum: 'A',
    plasma: 'P',
    bitcoin: '₿',
    spark: 'ϟ',
    solana: ''
  }

  return (
    <span className={`chain-icon chain-icon-${id}`} aria-hidden="true">
      {labels[id]}
    </span>
  )
}

function AssetIcon({ symbol }: { symbol: string }) {
  return (
    <span className="asset-icon" aria-hidden="true">
      {symbol.slice(0, 1)}
    </span>
  )
}

function Onboarding() {
  const dispatch = useDispatch()
  const [mode, setMode] = useState<'create' | 'restore'>('create')
  const [seed, setSeed] = useState('')
  const [password, setPassword] = useState('')
  const [showSeed, setShowSeed] = useState(true)

  async function generate() {
    const response = await sendMessage<string>({ type: 'GENERATE_SEED' })
    if (response.ok && response.result) setSeed(response.result)
  }

  useEffect(() => {
    if (mode === 'create' && !seed) void generate()
  }, [mode, seed])

  async function submit() {
    await run(dispatch, async () =>
      sendMessage<WalletStateSnapshot>({
        type: mode === 'restore' ? 'RESTORE_WALLET' : 'CREATE_WALLET',
        payload: { seedPhrase: seed, password }
      })
    )
  }

  return (
    <form
      className="screen"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="screen-title">
        <Wallet size={24} />
        <h1>{mode === 'create' ? 'Create wallet' : 'Restore wallet'}</h1>
      </div>
      <div className="segmented">
        <button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
          Create
        </button>
        <button type="button" className={mode === 'restore' ? 'active' : ''} onClick={() => setMode('restore')}>
          Restore
        </button>
      </div>
      <label className="field">
        <span>Seed phrase</span>
        <textarea
          rows={4}
          value={showSeed ? seed : seed.replace(/\S/g, '•')}
          onChange={(event) => setSeed(event.target.value)}
          readOnly={!showSeed}
          placeholder="twelve or twenty four BIP-39 words"
        />
      </label>
      <div className="inline-actions">
        <button type="button" onClick={() => setShowSeed((value) => !value)}>
          {showSeed ? <EyeOff size={16} /> : <Eye size={16} />}
          {showSeed ? 'Hide' : 'Show'}
        </button>
        {mode === 'create' && (
          <button type="button" onClick={generate}>
            <RefreshCcw size={16} />
            Regenerate
          </button>
        )}
      </div>
      <label className="field">
        <span>Password</span>
        <input
          value={password}
          type="password"
          autoComplete="new-password"
          minLength={10}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="10+ characters"
        />
      </label>
      <button className="primary" type="submit">
        <KeyRound size={17} />
        Encrypt and continue
      </button>
    </form>
  )
}

function Unlock() {
  const dispatch = useDispatch()
  const [password, setPassword] = useState('')

  return (
    <form
      className="screen"
      onSubmit={(event) => {
        event.preventDefault()
        void run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'UNLOCK', payload: { password } }))
      }}
    >
      <div className="screen-title">
        <Lock size={24} />
        <h1>Unlock</h1>
      </div>
      <label className="field">
        <span>Password</span>
        <input
          value={password}
          type="password"
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button className="primary" type="submit">
        <KeyRound size={17} />
        Unlock wallet
      </button>
    </form>
  )
}

function Header({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const dispatch = useDispatch()
  const selectedWallet = snapshot.wallets.find((wallet) => wallet.id === snapshot.selectedWalletId)
  const selectedNetwork = snapshot.networks.find((network) => network.id === snapshot.selectedNetworkId)

  return (
    <section className="wallet-head">
      <div>
        <div className="muted">{selectedWallet?.name ?? 'Wallet'}</div>
        <strong className="network-title">
          {selectedNetwork && <ChainIcon id={selectedNetwork.id} />}
          {selectedNetwork?.label}
        </strong>
      </div>
      <div className="header-actions">
        <button
          title="Refresh balances"
          type="button"
          onClick={() => run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'REFRESH_BALANCES' }))}
        >
          <RefreshCcw size={16} />
        </button>
        <button title="Lock" type="button" onClick={() => run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'LOCK' }))}>
          <Lock size={16} />
        </button>
      </div>
    </section>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<{ id: Tab; icon: React.ReactNode; label: string }> = [
    { id: 'assets', icon: <Wallet size={17} />, label: 'Assets' },
    { id: 'send', icon: <Send size={17} />, label: 'Send' },
    { id: 'receive', icon: <QrCode size={17} />, label: 'Receive' },
    { id: 'activity', icon: <Activity size={17} />, label: 'Activity' },
    { id: 'settings', icon: <Settings size={17} />, label: 'Settings' }
  ]

  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button key={tab.id} className={active === tab.id ? 'active' : ''} onClick={() => onChange(tab.id)}>
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

function Assets({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const dispatch = useDispatch()
  const selectedNetwork = snapshot.networks.find((network) => network.id === snapshot.selectedNetworkId)!
  const balances = snapshot.balances.filter((balance) => balance.networkId === selectedNetwork.id)

  return (
    <section className="panel">
      <NetworkAccountControls snapshot={snapshot} />
      <div className="list">
        {selectedNetwork.assets.map((asset) => {
          const balance = balances.find((item) => item.assetId === asset.id)
          return (
            <div className="row" key={asset.id}>
              <div>
                <strong>{asset.symbol}</strong>
                <span>{asset.name}</span>
              </div>
              <div className="right">
                <strong>{balance?.formatted ?? '0'}</strong>
                {balance?.error && <span className="tiny error-text">{balance.error}</span>}
              </div>
            </div>
          )
        })}
      </div>
      <button className="secondary" onClick={() => run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'REFRESH_BALANCES' }))}>
        <RefreshCcw size={16} />
        Refresh balances
      </button>
    </section>
  )
}

function NetworkAccountControls({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const dispatch = useDispatch()
  const networkOptions = snapshot.networks.map((network) => ({
    value: network.id,
    label: network.label,
    detail: `${network.symbol}${network.chainId ? ` · ${network.chainId}` : ''}`,
    icon: <ChainIcon id={network.id} />
  }))
  const accountOptions = Array.from({ length: snapshot.wallets[0]?.accountCount ?? 1 }).map((_, index) => ({
    value: index,
    label: `Account ${index + 1}`,
    detail: `Index ${index}`,
    icon: (
      <span className="account-icon" aria-hidden="true">
        {index + 1}
      </span>
    )
  }))

  return (
    <div className="controls-grid">
      <Dropdown
        compact
        label="Network"
        value={snapshot.selectedNetworkId}
        options={networkOptions}
        onChange={(networkId) =>
          run(dispatch, async () =>
            sendMessage<WalletStateSnapshot>({
              type: 'SET_SELECTED_NETWORK',
              payload: { networkId }
            })
          )
        }
      />
      <Dropdown
        compact
        label="Account"
        value={snapshot.selectedAccountIndex}
        options={accountOptions}
        onChange={(accountIndex) =>
          run(dispatch, async () =>
            sendMessage<WalletStateSnapshot>({
              type: 'SET_SELECTED_ACCOUNT',
              payload: { accountIndex }
            })
          )
        }
      />
    </div>
  )
}

function SendPanel({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const dispatch = useDispatch()
  const selectedNetwork = snapshot.networks.find((network) => network.id === snapshot.selectedNetworkId)!
  const [assetId, setAssetId] = useState<AssetId>(selectedNetwork.assets[0].id)
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<string>()

  useEffect(() => {
    setAssetId(selectedNetwork.assets[0].id)
    setQuote(undefined)
  }, [selectedNetwork.id])

  const draft = useMemo<SendDraft>(
    () => ({
      walletId: snapshot.selectedWalletId!,
      accountIndex: snapshot.selectedAccountIndex,
      networkId: snapshot.selectedNetworkId,
      assetId,
      to,
      amount
    }),
    [amount, assetId, snapshot.selectedAccountIndex, snapshot.selectedNetworkId, snapshot.selectedWalletId, to]
  )

  async function quoteSend() {
    await run(dispatch, async () => {
      const response = await sendMessage<{ formattedFee: string }>({ type: 'QUOTE_SEND', payload: draft })
      if (response.ok && response.result) setQuote(`${response.result.formattedFee} ${selectedNetwork.symbol}`)
      return response
    })
  }

  async function send() {
    await run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'SEND', payload: draft }))
    setQuote(undefined)
  }

  return (
    <section className="panel">
      <NetworkAccountControls snapshot={snapshot} />
      <Dropdown
        label="Asset"
        value={assetId}
        options={selectedNetwork.assets.map((asset) => ({
          value: asset.id,
          label: asset.symbol,
          detail: asset.name,
          icon: <AssetIcon symbol={asset.symbol} />
        }))}
        onChange={setAssetId}
      />
      <label className="field">
        <span>Recipient</span>
        <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="Address" />
      </label>
      <label className="field">
        <span>Amount</span>
        <input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
      </label>
      {quote && <div className="quote">Estimated fee: {quote}</div>}
      <div className="inline-actions fill">
        <button type="button" onClick={quoteSend}>
          <RefreshCcw size={16} />
          Quote
        </button>
        <button className="primary" type="button" onClick={send}>
          <Send size={16} />
          Send
        </button>
      </div>
    </section>
  )
}

function ReceivePanel({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const [qr, setQr] = useState('')
  const account = snapshot.accounts.find(
    (item) => item.accountIndex === snapshot.selectedAccountIndex && item.networkId === snapshot.selectedNetworkId
  )

  useEffect(() => {
    if (!account?.address || account.address === 'unavailable') {
      setQr('')
      return
    }
    void QRCode.toDataURL(account.address, { margin: 1, width: 180 }).then(setQr)
  }, [account?.address])

  return (
    <section className="panel">
      <NetworkAccountControls snapshot={snapshot} />
      <div className="receive">
        {qr ? <img src={qr} alt="Receive QR" /> : <div className="qr-placeholder">QR</div>}
        <code>{account?.address ?? 'Unlock account to derive address'}</code>
      </div>
      <button
        className="secondary"
        disabled={!account?.address || account.address === 'unavailable'}
        onClick={() => copy(account?.address ?? '')}
      >
        <Copy size={16} />
        Copy address
      </button>
    </section>
  )
}

function ActivityPanel({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const [status, setStatus] = useState('all')
  const txs = snapshot.txs.filter((tx) => status === 'all' || tx.status === status)
  const statusOptions = [
    { value: 'all', label: 'All', detail: 'Every status' },
    { value: 'queued', label: 'Queued', detail: 'Waiting to send' },
    { value: 'broadcast', label: 'Broadcast', detail: 'Sent to network' },
    { value: 'confirmed', label: 'Confirmed', detail: 'Finalized' },
    { value: 'failed', label: 'Failed', detail: 'Needs review' }
  ]

  return (
    <section className="panel">
      <Dropdown label="Status" value={status} options={statusOptions} onChange={setStatus} compact />
      <div className="list">
        {txs.length === 0 && <div className="empty">No transactions yet.</div>}
        {txs.map((tx) => (
          <div className="row" key={tx.id}>
            <div>
              <strong>
                {tx.amount} {tx.assetId}
              </strong>
              <span>
                {tx.networkId} to {shortAddress(tx.to)}
              </span>
            </div>
            <div className="right">
              <strong>{tx.status}</strong>
              {tx.hash && <span>{shortAddress(tx.hash)}</span>}
              {tx.error && <span className="tiny error-text">{tx.error}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SettingsPanel({ snapshot }: { snapshot: WalletStateSnapshot }) {
  const dispatch = useDispatch()
  const [minutes, setMinutes] = useState(snapshot.lockTimeoutMinutes)

  return (
    <section className="panel">
      <NetworkAccountControls snapshot={snapshot} />
      <button className="secondary" onClick={() => run(dispatch, async () => sendMessage<WalletStateSnapshot>({ type: 'ADD_ACCOUNT' }))}>
        <Plus size={16} />
        Add account
      </button>
      <label className="field">
        <span>Auto-lock timeout</span>
        <input min={1} max={120} type="number" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
      </label>
      <button
        className="secondary"
        onClick={() =>
          run(dispatch, async () =>
            sendMessage<WalletStateSnapshot>({
              type: 'SET_LOCK_TIMEOUT',
              payload: { minutes }
            })
          )
        }
      >
        <Settings size={16} />
        Save settings
      </button>
    </section>
  )
}

async function run(dispatch: ReturnType<typeof useDispatch>, fn: () => Promise<{ ok: boolean; result?: unknown; error?: string }>) {
  dispatch(setBusy(true))
  dispatch(setError(undefined))
  dispatch(setNotice(undefined))
  try {
    const response = await fn()
    if (!response.ok) throw new Error(response.error ?? 'Request failed.')
    if (response.result && typeof response.result === 'object' && 'initialized' in response.result) {
      dispatch(setSnapshot(response.result as WalletStateSnapshot))
    }
    dispatch(setNotice('Done.'))
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Unexpected error.'))
  } finally {
    dispatch(setBusy(false))
  }
}

async function copy(value: string) {
  await navigator.clipboard.writeText(value)
}
