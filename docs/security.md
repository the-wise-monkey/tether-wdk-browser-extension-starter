# Security

This starter demonstrates extension-specific wallet security patterns. It is not a completed third-party audit.

## Seed Storage

- Seed phrases are encrypted before being written to `chrome.storage.local`.
- The encryption envelope uses AES-GCM with a 256-bit key.
- The key is derived from the user password with PBKDF2-SHA-256 and 600,000 iterations.
- `chrome.storage.sync`, `localStorage`, and `sessionStorage` are not used for seed material.

## Session Handling

- The decrypted seed exists only in background service worker memory.
- Lock clears the seed reference and disposes WDK wallet managers.
- Auto-lock uses `chrome.alarms`; default timeout is 15 minutes and configurable from settings.
- The popup cannot sign directly. It must request signing/broadcast through background messages.

## Origin and Injection Controls

- The manifest uses MV3 and a strict extension page CSP.
- Page scripts communicate through a content bridge; they do not receive extension internals.
- Background records the requesting origin for provider requests.
- Non-HTTPS origins are warned, except localhost development origins.
- Obvious phishing markers such as punycode (`xn--`) and wallet-themed impersonation fragments are blocked.

## Transaction Confirmation

The send panel shows the selected network, asset, recipient, amount, and fee quote before broadcast. dApp-originated signing is intentionally minimal in this starter; production wallets should add a dedicated confirmation window that includes origin, method, decoded calldata, spending allowance deltas, and network fee.

## Known Beta Limitations

- `@tetherto/wdk-wallet-spark@1.0.0-beta.18` derives Spark MAINNET addresses, but TESTNET currently expects a local Spark stack on `localhost:8535-8537`.
- The Spark beta module can throw during `dispose()` after partial initialization. The background catches this during cleanup and drops top-level references.
- The background bundle is large because WDK modules pull Node/Bare compatibility dependencies. For production, split optional chain modules or create chain-specific starter variants.

## Production Hardening Checklist

- Add an audited phishing feed such as `eth-phishing-detect` or a signed internal allow/block feed.
- Move every dApp signature and transaction request through a full confirmation page.
- Add hardware-backed unlock with WebAuthn or platform passkeys.
- Add unit tests for crypto envelope compatibility and lock timeout behavior.
- Add e2e extension tests in Chrome and Brave.
- Replace public RPC/indexer endpoints with provider settings or documented project-owned infrastructure.
