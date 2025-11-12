import { createAppKit } from '@reown/appkit/vue'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet } from '@reown/appkit/networks'

// 1. Get projectId from https://dashboard.reown.com
const projectId = import.meta.env.VITE_YOUR_PROJECT_ID

// 2. Create your application's metadata object
const metadata = {
  name: 'My Website',
  description: 'My Website description',
  url: '', // 动态匹配当前应用地址
  icons: [],
}

// 3. Create a AppKit instance
const localNetwork = {
  id: 31337,
  name: 'LocalNet',
  nativeCurrency: { name: 'Ether', symbol: 'GO', decimals: 18 },
  blockTime: 12_000,
  rpcUrls: {
    default: {
      http: ['https://eth.merkle.io'],
    },
  },
}

try {
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [mainnet, localNetwork],
    defaultNetwork: localNetwork,
    metadata,
    projectId,
    features: {
      analytics: true, // Optional - defaults to your Cloud configuration
    },
  })
} catch (error) {
  console.error('Failed to initialize AppKit:', error)
  if (!projectId) {
    console.warn('projectId is missing! Set VITE_YOUR_PROJECT_ID in .env.local')
  }
}
