import { createAppKit } from '@reown/appkit/vue'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { mainnet, arbitrum, solana } from '@reown/appkit/networks'
// import type { AppKitNetwork } from '@reown/appkit/networks'

// 1. Get projectId from https://dashboard.reown.com
const projectId = import.meta.env.VITE_YOUR_PROJECT_ID

console.log('Project ID:', projectId);

// 动态获取当前应用的 URL（防止硬编码端口不匹配）
const appUrl = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.host}`
  : 'http://localhost:5173'

console.log('App URL:', appUrl);

// 2. Create your application's metadata object
const metadata = {
  name: 'My Website',
  description: 'My Website description',
  url: appUrl, // 动态匹配当前应用地址
  icons: ['https://avatars.mywebsite.com/'],
}

// 3. Create a AppKit instance
// const localNetwork = {
//   name: 'LocalNet',
//   chainId: 0x7a69, // 31337 的十六进制表示
//   currency: 'ETH',
//   explorerUrl: 'http://localhost:8545',
//   rpcUrl: 'http://localhost:8545',
// } as unknown as AppKitNetwork

try {
  createAppKit({
    adapters: [new EthersAdapter()],
    networks: [mainnet, arbitrum, solana],
    defaultNetwork: mainnet,
    metadata,
    projectId,
    features: {
      analytics: true, // Optional - defaults to your Cloud configuration
    },
  })
  console.log('AppKit initialized successfully')
} catch (error) {
  console.error('Failed to initialize AppKit:', error)
  if (!projectId) {
    console.warn('projectId is missing! Set VITE_YOUR_PROJECT_ID in .env.local')
  }
}
