import type { WdkRequest, WdkResponse } from './types'

export function sendMessage<T = unknown>(message: WdkRequest): Promise<WdkResponse<T>> {
  return chrome.runtime.sendMessage(message)
}

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
}
