import type { WdkRequest, WdkResponse } from '../shared/types'
import { walletSession } from './session'

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
    case 'PROVIDER_REQUEST':
      return ok(await walletSession.handleProviderRequest(message.payload))
    default:
      return fail(new Error(`Unsupported message type: ${(message as WdkRequest).type}`))
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('wdk-wallet-background-ready', { delayInMinutes: 1 })
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
