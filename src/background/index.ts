import type { OpenMode, WdkRequest, WdkResponse } from '../shared/types'
import { loadStoredState } from './storage'
import { walletSession } from './session'

const WALLET_UI_PATH = 'index.html'

async function applyOpenMode(mode: OpenMode): Promise<void> {
  if (mode === 'side-panel') {
    if (chrome.action?.setPopup) await chrome.action.setPopup({ popup: '' })
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    }
  } else {
    if (chrome.action?.setPopup) await chrome.action.setPopup({ popup: WALLET_UI_PATH })
    if (chrome.sidePanel?.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    }
  }
}

function ok<T>(result: T): WdkResponse<T> {
  return { ok: true, result }
}

function fail(error: unknown): WdkResponse {
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Unknown background error.'
  }
}

async function handleMessage(message: WdkRequest): Promise<WdkResponse> {
  switch (message.type) {
    case 'PING':
      return ok({ pong: true })
    case 'GET_STATE':
      return ok(await walletSession.getState())
    case 'GENERATE_SEED':
      return ok(walletSession.generateSeedPhrase())
    case 'CREATE_WALLET':
    case 'RESTORE_WALLET':
      return ok(
        await walletSession.createWallet(
          message.payload.seedPhrase,
          message.payload.password,
          message.payload.walletName ?? (message.type === 'RESTORE_WALLET' ? 'Restored wallet' : 'Main wallet')
        )
      )
    case 'UNLOCK':
      return ok(await walletSession.unlock(message.payload.password))
    case 'LOCK':
      return ok(await walletSession.lock())
    case 'SET_SELECTED_NETWORK':
      return ok(await walletSession.setSelectedNetwork(message.payload.networkId))
    case 'SET_SELECTED_ACCOUNT':
      return ok(await walletSession.setSelectedAccount(message.payload.accountIndex))
    case 'ADD_ACCOUNT':
      return ok(await walletSession.addAccount())
    case 'REFRESH_ACCOUNTS':
      return ok(await walletSession.refreshAccounts())
    case 'REFRESH_BALANCES':
      return ok(await walletSession.refreshBalances())
    case 'QUOTE_SEND':
      return ok(await walletSession.quoteSend(message.payload))
    case 'SEND':
      return ok(await walletSession.send(message.payload))
    case 'SET_LOCK_TIMEOUT':
      return ok(await walletSession.setLockTimeout(message.payload.minutes))
    case 'SET_OPEN_MODE': {
      const snapshot = await walletSession.setOpenMode(message.payload.mode)
      await applyOpenMode(message.payload.mode)
      return ok(snapshot)
    }
    case 'PROVIDER_REQUEST':
      return ok(await walletSession.handleProviderRequest(message.payload))
    default:
      return fail(new Error(`Unsupported message type: ${(message as WdkRequest).type}`))
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('wdk-wallet-background-ready', { delayInMinutes: 1 })
  void loadStoredState().then((state) => applyOpenMode(state.openMode))
})

chrome.runtime.onStartup.addListener(() => {
  void loadStoredState().then((state) => applyOpenMode(state.openMode))
})

void loadStoredState().then((state) => applyOpenMode(state.openMode))

chrome.action.onClicked.addListener((tab) => {
  void openWalletSurface(tab)
})

chrome.alarms.onAlarm.addListener((alarm) => {
  walletSession.handleAlarm(alarm.name)
})

chrome.runtime.onMessage.addListener((message: WdkRequest, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse(fail(error)))

  return true
})

async function openWalletSurface(tab: chrome.tabs.Tab): Promise<void> {
  if (chrome.sidePanel?.open && tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id })
      return
    } catch {
      // Fall through to a popup window for Chromium builds without side panel support.
    }
  }

  await chrome.windows.create({
    url: chrome.runtime.getURL(WALLET_UI_PATH),
    type: 'popup',
    width: 420,
    height: 720
  })
}
