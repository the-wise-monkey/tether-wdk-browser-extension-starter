import type { ProviderResponse } from '../shared/types'

const REQUEST_EVENT = 'tether-wdk-wallet:request'
const RESPONSE_EVENT = 'tether-wdk-wallet:response'

type Listener = (...args: unknown[]) => void

const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
const listeners = new Map<string, Set<Listener>>()

function createId(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
  return `provider_${Date.now().toString(36)}_${random}`
}

function emit(event: string, ...args: unknown[]): void {
  listeners.get(event)?.forEach((listener) => listener(...args))
}

function request(args: { method: string; params?: unknown[] }): Promise<unknown> {
  const id = createId()
  window.postMessage(
    {
      type: REQUEST_EVENT,
      request: {
        id,
        origin: window.location.origin,
        method: args.method,
        params: args.params ?? []
      }
    },
    window.location.origin
  )

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    window.setTimeout(() => {
      if (!pending.has(id)) return
      pending.delete(id)
      reject(new Error(`Provider request timed out: ${args.method}`))
    }, 60_000)
  })
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return
  if (event.data?.type !== RESPONSE_EVENT) return

  const response = event.data.response as ProviderResponse
  const handler = pending.get(response.id)
  if (!handler) return

  pending.delete(response.id)
  if (response.error) {
    handler.reject(new Error(response.error))
    emit('message', { type: 'error', data: response.error })
    return
  }

  handler.resolve(response.result)
})

const ethereum = {
  isTetherWdk: true,
  isMetaMask: false,
  request,
  on(event: string, listener: Listener) {
    const bucket = listeners.get(event) ?? new Set()
    bucket.add(listener)
    listeners.set(event, bucket)
    return this
  },
  removeListener(event: string, listener: Listener) {
    listeners.get(event)?.delete(listener)
    return this
  }
}

const solana = {
  isTetherWdk: true,
  connect: () => request({ method: 'solana_connect' }),
  disconnect: () => Promise.resolve(),
  signMessage: (message: Uint8Array) =>
    request({ method: 'solana_signMessage', params: [Array.from(message)] }),
  on: ethereum.on,
  removeListener: ethereum.removeListener
}

Object.defineProperty(window, 'ethereum', {
  value: ethereum,
  configurable: true
})

Object.defineProperty(window, 'solana', {
  value: solana,
  configurable: true
})

window.dispatchEvent(new Event('tether-wdk-wallet#initialized'))
