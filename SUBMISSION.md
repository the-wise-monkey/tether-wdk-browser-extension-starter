# Browser Extension Starter Submission

## Form Fields

| Field | Value |
| --- | --- |
| Full Name | Agustin Rodriguez |
| Email Address | agu@thewisemonkey.co.uk |
| Website | https://thewisemonkey.co.uk |
| Bounty | Browser Extension Starter |

## Relevant Experience

I'm Agustin Rodriguez, founder of TheWiseMonkey (TWM), a software studio that builds and operates products in crypto, fintech, and sports-data. TWM's team has shipped production work across EVM chains, Solana, and Bitcoin-adjacent tooling, including self-custodial flows where key handling, address validation, transaction preparation, and user-facing signing context matter.

My background includes founding and building MetaSoccer/Ephere Football, contributing to 0xFutbol, and maintaining open-source developer tooling under `agurod42`. TWM also works around RWA and stablecoin use cases, so WDK, Plasma, Spark, and Tether-issued assets are directly aligned with the ecosystem tooling we want to support.

For this bounty, the implementation is intentionally structured as a reusable starter rather than a one-off demo: Chrome/Brave MV3 extension architecture, React/Vite popup, background service worker wallet lifecycle, encrypted local seed storage, dApp provider injection, WDK wallet module registration, multi-network registry, and documentation that external developers can extend.

I can deliver the agreed scope with production-minded documentation and a clear security model: what is implemented, what is deliberately out of scope, and what a team must harden before shipping a real wallet to users.

## Scope Alignment Points

- Confirm reward amount: bounty page says 4,000 USDt, PDF payment section still says 2,500 USDt.
- Confirm PR target repository and expected folder: example, template, or main WDK repo.
- Confirm whether Plasma USDt/XAUt token contract addresses should be preconfigured by Tether or left as documented placeholders.
- Confirm Spark expectations for test/demo: current `@tetherto/wdk-wallet-spark` MAINNET address derivation works; TESTNET expects a local Spark stack.

## Demo Video Draft

1. Load unpacked extension from `dist/`.
2. Create wallet and show seed/password flow.
3. Inspect extension storage to show no plaintext seed.
4. Unlock and switch across EVM, BTC, Spark, and Solana networks.
5. Show receive QR and copy address.
6. Refresh balances.
7. Quote a send transaction.
8. Show injected provider from a web page console.
