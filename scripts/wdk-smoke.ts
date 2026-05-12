import WDK from '@tetherto/wdk'
import WalletManagerBtc from '@tetherto/wdk-wallet-btc'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import WalletManagerSolana from '@tetherto/wdk-wallet-solana'
import WalletManagerSpark from '@tetherto/wdk-wallet-spark'

const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

async function main() {
  const generated = WDK.getRandomSeedPhrase(12)
  console.log(`Generated seed words: ${generated.split(' ').length}`)

  const wdk = new WDK(seedPhrase)
    .registerWallet('ethereum', WalletManagerEvm as any, { provider: 'https://ethereum-rpc.publicnode.com' })
    .registerWallet('bitcoin', WalletManagerBtc as any, {
      client: { type: 'blockbook-http', clientConfig: { url: 'https://btc1.trezor.io/api' } },
      network: 'bitcoin'
    })
    .registerWallet('spark', WalletManagerSpark as any, { network: 'MAINNET' })
    .registerWallet('solana', WalletManagerSolana as any, {
      provider: 'https://api.mainnet-beta.solana.com',
      commitment: 'confirmed'
    })

  for (const networkId of ['ethereum', 'bitcoin', 'spark', 'solana']) {
    const account = await wdk.getAccount(networkId, 0)
    console.log(`${networkId}: ${await account.getAddress()}`)
  }

  try {
    wdk.dispose(['ethereum', 'bitcoin', 'solana'])
  } catch (error) {
    console.warn(`Dispose warning: ${error instanceof Error ? error.message : String(error)}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
