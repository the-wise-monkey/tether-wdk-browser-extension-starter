import type { ProviderRequest, ProviderResponse, WdkResponse } from '../shared/types'

const REQUEST_EVENT = 'tether-wdk-wallet:request'
const RESPONSE_EVENT = 'tether-wdk-wallet:response'

window.addEventListener('message', async (event: MessageEvent) => {
  if (event.source !== window) return
  if (event.data?.type !== REQUEST_EVENT) return

  const request = event.data.request as ProviderRequest
  const response = await chrome.runtime.sendMessage({
    type: 'PROVIDER_REQUEST',
    payload: {
      ...request,
      origin: window.location.origin
    }
  })

  const normalized = normalizeProviderResponse(request.id, response)
  window.postMessage({ type: RESPONSE_EVENT, response: normalized }, window.location.origin)
})

function normalizeProviderResponse(id: string, response: WdkResponse): ProviderResponse {
  if (response.ok) {
    return { id, result: response.result }
  }

  return {
    id,
    error: response.error ?? 'Provider request failed.'
  }
}
