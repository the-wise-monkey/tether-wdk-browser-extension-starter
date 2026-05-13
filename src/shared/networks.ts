import type { NetworkConfig } from './types'

export const USDT_ETHEREUM = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
export const XAUT_ETHEREUM = '0x68749665FF8D2d112Fa859AA293F07A622782F38'
export const USDT_POLYGON = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
export const USDT_ARBITRUM = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
export const USDT_PLASMA = '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb'

const ICON = {
  ethereum: '/assets/chains/ethereum.png',
  polygon: '/assets/chains/polygon.png',
  arbitrum: '/assets/chains/arbitrum.png',
  plasma: '/assets/chains/plasma.png',
  bitcoin: '/assets/chains/bitcoin.png',
  solana: '/assets/chains/solana.png',
  usdtEthereum: '/assets/tokens/usdt-ethereum.png',
  xautEthereum: '/assets/tokens/xaut-ethereum.png',
  usdtPolygon: '/assets/tokens/usdt-polygon.png',
  usdtArbitrum: '/assets/tokens/usdt-arbitrum.png',
  usdtPlasma: '/assets/tokens/usdt-plasma.png'
} as const

export const NETWORKS: NetworkConfig[] = [
  {
    id: 'ethereum',
    label: 'Ethereum',
    kind: 'evm',
    chainId: 1,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    explorerUrl: 'https://etherscan.io',
    enabled: true,
    iconUrl: ICON.ethereum,
    assets: [
      { id: 'ETH', symbol: 'ETH', name: 'Ether', decimals: 18, native: true, iconUrl: ICON.ethereum },
      { id: 'USDT', symbol: 'USDt', name: 'Tether USD', decimals: 6, tokenAddress: USDT_ETHEREUM, iconUrl: ICON.usdtEthereum },
      { id: 'XAUT', symbol: 'XAUt', name: 'Tether Gold', decimals: 6, tokenAddress: XAUT_ETHEREUM, iconUrl: ICON.xautEthereum }
    ]
  },
  {
    id: 'polygon',
    label: 'Polygon',
    kind: 'evm',
    chainId: 137,
    symbol: 'MATIC',
    decimals: 18,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    enabled: true,
    iconUrl: ICON.polygon,
    assets: [
      { id: 'MATIC', symbol: 'MATIC', name: 'Polygon', decimals: 18, native: true, iconUrl: ICON.polygon },
      { id: 'USDT', symbol: 'USDt', name: 'Tether USD', decimals: 6, tokenAddress: USDT_POLYGON, iconUrl: ICON.usdtPolygon }
    ]
  },
  {
    id: 'arbitrum',
    label: 'Arbitrum',
    kind: 'evm',
    chainId: 42161,
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://rpc.ankr.com/arbitrum',
    explorerUrl: 'https://arbiscan.io',
    enabled: true,
    iconUrl: ICON.arbitrum,
    assets: [
      { id: 'ETH', symbol: 'ETH', name: 'Ether', decimals: 18, native: true, iconUrl: ICON.arbitrum },
      { id: 'USDT', symbol: 'USDt', name: 'Tether USD', decimals: 6, tokenAddress: USDT_ARBITRUM, iconUrl: ICON.usdtArbitrum }
    ]
  },
  {
    id: 'plasma',
    label: 'Plasma',
    kind: 'evm',
    chainId: 9745,
    symbol: 'XPL',
    decimals: 18,
    rpcUrl: 'https://rpc.plasma.to',
    explorerUrl: 'https://plasmascan.to',
    enabled: true,
    iconUrl: ICON.plasma,
    assets: [
      { id: 'XPL', symbol: 'XPL', name: 'Plasma', decimals: 18, native: true, iconUrl: ICON.plasma },
      { id: 'USDT', symbol: 'USDt', name: 'Tether USD', decimals: 6, tokenAddress: USDT_PLASMA, iconUrl: ICON.usdtPlasma }
    ]
  },
  {
    id: 'bitcoin',
    label: 'Bitcoin',
    kind: 'btc',
    symbol: 'BTC',
    decimals: 8,
    explorerUrl: 'https://mempool.space',
    enabled: true,
    iconUrl: ICON.bitcoin,
    assets: [{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin', decimals: 8, native: true, iconUrl: ICON.bitcoin }]
  },
  {
    id: 'spark',
    label: 'Spark Lightning',
    kind: 'spark',
    symbol: 'BTC',
    decimals: 8,
    explorerUrl: 'https://sparkscan.io',
    enabled: true,
    assets: [{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin on Spark', decimals: 8, native: true, iconUrl: ICON.bitcoin }]
  },
  {
    id: 'solana',
    label: 'Solana',
    kind: 'solana',
    symbol: 'SOL',
    decimals: 9,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    enabled: true,
    iconUrl: ICON.solana,
    assets: [
      { id: 'SOL', symbol: 'SOL', name: 'Solana', decimals: 9, native: true, iconUrl: ICON.solana },
      { id: 'USDT', symbol: 'USDt', name: 'Tether USD', decimals: 6 }
    ]
  }
]

export function getNetwork(id: string): NetworkConfig {
  const network = NETWORKS.find((item) => item.id === id)
  if (!network) {
    throw new Error(`Unknown network: ${id}`)
  }
  return network
}
