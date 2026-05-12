# Extending

## Add an EVM Network

1. Add a `NetworkConfig` entry in `src/shared/networks.ts`.
2. Set `kind: "evm"`, `chainId`, `symbol`, `decimals`, `rpcUrl`, and `explorerUrl`.
3. Add native and token assets.
4. Rebuild. The background automatically registers every enabled EVM network with `@tetherto/wdk-wallet-evm`.

## Add a Token

Add an `AssetConfig` to the network's `assets` array:

```ts
{
  id: 'USDT',
  symbol: 'USDt',
  name: 'Tether USD',
  decimals: 6,
  tokenAddress: '0x...'
}
```

For EVM tokens, `tokenAddress` enables `getTokenBalance`, `quoteTransfer`, and `transfer`. Without a token contract, the UI keeps the asset visible but disables transfer with a clear error.

## Add a New Chain Module

1. Install the WDK module package.
2. Extend `ChainKind` and `ChainId` in `src/shared/types.ts`.
3. Add network metadata in `src/shared/networks.ts`.
4. Register the wallet manager in `src/background/wdkClient.ts`.
5. Add send, quote, balance, and address-validation branches.
6. Add provider methods in `src/background/session.ts` if dApp injection is needed.

## Customize Branding

- Replace `public/icon.svg`.
- Update manifest name/description in `public/manifest.json`.
- Adjust popup colors in `src/action/styles.css`.

## Submission Video Script

1. Load unpacked extension in Chrome.
2. Create a new wallet and show encrypted storage has no plaintext seed.
3. Unlock and derive EVM, BTC, Spark, and Solana addresses.
4. Refresh balances on one funded/dev account.
5. Show receive QR.
6. Quote a send transaction.
7. Show dApp provider presence from DevTools: `window.ethereum.isTetherWdk`.
