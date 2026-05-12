import type { EncryptedSeedEnvelope } from './storage'

const ITERATIONS = 600_000

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const saltSource = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltSource,
      iterations: ITERATIONS
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptSeed(seedPhrase: string, password: string): Promise<EncryptedSeedEnvelope> {
  if (password.length < 10) {
    throw new Error('Password must be at least 10 characters.')
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
    key,
    new TextEncoder().encode(seedPhrase.trim())
  )

  return {
    version: 1,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext)
  }
}

export async function decryptSeed(envelope: EncryptedSeedEnvelope, password: string): Promise<string> {
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-GCM' || envelope.kdf !== 'PBKDF2-SHA-256') {
    throw new Error('Unsupported encrypted seed format.')
  }

  const salt = fromBase64(envelope.salt)
  const iv = fromBase64(envelope.iv)
  const ciphertext = fromBase64(envelope.ciphertext)
  const ivSource = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer
  const ciphertextSource = ciphertext.buffer.slice(
    ciphertext.byteOffset,
    ciphertext.byteOffset + ciphertext.byteLength
  ) as ArrayBuffer
  const key = await deriveKey(password, salt)

  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivSource }, key, ciphertextSource)
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new Error('Invalid password.')
  }
}
