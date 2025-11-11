import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/vue'
import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers'
import token1Abi from '@/abi/Token1.json'
import token2Abi from '@/abi/Token2.json'
import stakingRewardsAbi from '@/abi/StakingRewards.json'

// Lazy-initialized accessors to avoid throwing during module import
export async function getContracts() {
  const account = useAppKitAccount()
  const isConnected = account.value.isConnected
  if (!isConnected) {
    throw new Error('Wallet not connected')
  }

  const { walletProvider } = useAppKitProvider('eip155')
  const ethersProvider = new BrowserProvider(walletProvider as Eip1193Provider)
  const signer = await ethersProvider.getSigner()

  // 代币合约
  const token1Address = import.meta.env.VITE_TOKEN1_ADDRESS as string
  const token1 = new Contract(token1Address, token1Abi.abi, signer)

  const token2Address = import.meta.env.VITE_TOKEN2_ADDRESS as string
  const token2 = new Contract(token2Address, token2Abi.abi, signer)

  // 质押收益合约
  const stakingRewardAddress = import.meta.env.VITE_STAKING_REWARD_ADDRESS as string
  const stakingReward = new Contract(stakingRewardAddress, stakingRewardsAbi.abi, signer)

  return {
    address: account.value.address,
    token1,
    token2,
    stakingReward,
  }
}

export async function getStakingRewardContract() {
  const { stakingReward } = await getContracts()
  return stakingReward
}

export async function getUserAddress() {
  const account = useAppKitAccount()
  return account.value.address
}
