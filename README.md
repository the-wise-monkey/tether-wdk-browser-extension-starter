# Tether WDK Browser Extension Starter

Reference Chrome/Brave extension wallet starter built with Tether WDK. It follows the same MV3 shape as Tether's PearPass extension: separate Vite bundles for popup, background service worker, content script, and injected provider.

## Features

- Create or restore a BIP-39 seed phrase with WDK validation.
- Encrypt seed phrases in `chrome.storage.local` with AES-GCM and PBKDF2-SHA-256.
- Keep the decrypted seed only in background service worker memory while unlocked.
- Derive accounts through `@tetherto/wdk` and modules for EVM, Bitcoin, Spark, and Solana.
- Preconfigured networks: Ethereum, Polygon, Arbitrum, Plasma, Bitcoin, Spark, Solana.
- Popup flows for balances, send quote/send, receive QR, transaction activity, multi-account, and auto-lock timeout.
- Injected starter providers for dApps: `window.ethereum` and `window.solana`.

## Install

```bash
npm install
npm run build
```

Then load `dist/` as an unpacked extension in Chrome or Brave:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this repo's `dist/` directory.

## Development

Run each bundle watcher in its own terminal:

```bash
npm run dev:main
npm run dev:background
npm run dev:content
npm run dev:inject
```

Reload the unpacked extension after background/content changes.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:smoke
npm run build
```

`test:smoke` derives one account each for EVM, BTC, Spark, and Solana using the public WDK packages. It does not broadcast transactions.

## Current Scope Notes

This is a starter, not a production wallet. Send flows are wired to WDK APIs, but they require funded accounts and reliable RPC/indexer access. Spark support uses `@tetherto/wdk-wallet-spark`; `MAINNET` address derivation works, while `TESTNET` currently expects a local Spark stack.

## Docs

- [Architecture](./docs/architecture.md)
- [Security](./docs/security.md)
- [Extending](./docs/extending.md)
