/**
 * 合约工具函数
 */

import { BrowserProvider, Contract, type Eip1193Provider, type Signer } from 'ethers'
import token1Abi from '@/abi/Token1.json'
import token2Abi from '@/abi/Token2.json'
import stakingRewardsAbi from '@/abi/StakingRewards.json'
import { useWalletStore } from '@/stores/walletStore'

// 缓存对象
interface ContractCache {
  provider: BrowserProvider | null
  signer: Signer | null
  address: string | null
  contracts: {
    token1: Contract | null
    token2: Contract | null
    stakingReward: Contract | null
  }
}

const cache: ContractCache = {
  provider: null,
  signer: null,
  address: null,
  contracts: {
    token1: null,
    token2: null,
    stakingReward: null,
  },
}

/**
 * 清除缓存（在钱包断开连接时调用）
 */
export function clearContractCache() {
  cache.provider = null
  cache.signer = null
  cache.address = null
  cache.contracts = {
    token1: null,
    token2: null,
    stakingReward: null,
  }
}

/**
 * 获取或初始化 Provider 和 Signer
 * 使用缓存避免重复创建
 */
async function ensureProviderAndSigner() {
  const walletStore = useWalletStore()

  if (!walletStore.connected || !walletStore.address) {
    clearContractCache()
    console.error('[Contract Utils] Wallet not connected. connected:', walletStore.connected, 'address:', walletStore.address)
    throw new Error('Wallet not connected')
  }

  // 如果缓存有效，直接返回
  if (
    cache.provider &&
    cache.signer &&
    cache.address === walletStore.address
  ) {
    // console.log('[Contract Utils] Using cached provider and signer for:', cache.address)
    return { provider: cache.provider, signer: cache.signer }
  }

  try {
    if (!window.ethereum) {
      throw new Error('No wallet provider available (window.ethereum not found)')
    }

    cache.provider = new BrowserProvider(window.ethereum as unknown as Eip1193Provider)
    cache.signer = await cache.provider.getSigner()
    cache.address = walletStore.address

    // console.log('[Contract Utils] Provider and signer initialized for address:', cache.address)

    return { provider: cache.provider, signer: cache.signer }
  } catch (error) {
    clearContractCache()
    console.error('[Contract Utils] Error initializing provider/signer:', error)
    throw error
  }
}

/**
 * 获取所有合约实例
 * 提供缓存机制，避免重复创建实例
 */
export async function getContracts() {
  const { signer } = await ensureProviderAndSigner()

  // 检查缓存
  if (
    cache.contracts.token1 &&
    cache.contracts.token2 &&
    cache.contracts.stakingReward
  ) {
    return {
      address: cache.address,
      token1: cache.contracts.token1,
      token2: cache.contracts.token2,
      stakingReward: cache.contracts.stakingReward,
    }
  }

  try {
    const token1Address = import.meta.env.VITE_TOKEN1_ADDRESS
    const token2Address = import.meta.env.VITE_TOKEN2_ADDRESS
    const stakingRewardAddress = import.meta.env.VITE_STAKING_REWARD_ADDRESS

    // 验证地址有效性
    validateAddress(token1Address, 'VITE_TOKEN1_ADDRESS')
    validateAddress(token2Address, 'VITE_TOKEN2_ADDRESS')
    validateAddress(stakingRewardAddress, 'VITE_STAKING_REWARD_ADDRESS')

    // 创建合约实例
    cache.contracts.token1 = new Contract(
      token1Address,
      extractAbi(token1Abi),
      signer
    )
    cache.contracts.token2 = new Contract(
      token2Address,
      extractAbi(token2Abi),
      signer
    )
    cache.contracts.stakingReward = new Contract(
      stakingRewardAddress,
      extractAbi(stakingRewardsAbi),
      signer
    )

    // console.log('[Contract Utils] Contract instances created and cached')

  return {
      address: cache.address,
      token1: cache.contracts.token1,
      token2: cache.contracts.token2,
      stakingReward: cache.contracts.stakingReward,
  }
  } catch (error) {
    clearContractCache()
    console.error('[Contract Utils] Error creating contracts:', error)
    throw error
}
}

/**
 * 获取质押代币合约（Token1）
 */
export async function getStakingContract() {
  const { token1 } = await getContracts()
  return token1
}

/**
 * 获取质押收益合约
 */
export async function getStakingRewardContract() {
  const { stakingReward } = await getContracts()
  return stakingReward
}

/**
 * 获取奖励代币合约（Token2）
 */
export async function getRewardContract() {
  const { token2 } = await getContracts()
  return token2
}

/**
 * 获取用户地址
 */
export async function getUserAddress() {
  const walletStore = useWalletStore()
  
  if (!walletStore.connected || !walletStore.address) {
    throw new Error('Wallet not connected')
  }
  
  return walletStore.address
}

/**
 * 获取用户在 Token1 中的余额
 * @param userAddress - 用户地址
 * @returns 余额（wei 单位的字符串）
 */
export async function getStakedBalance(userAddress: string) {
  try {
    const token1Contract = await getStakingContract()
    const balance = await token1Contract.balanceOf(userAddress)
    return balance.toString()
  } catch (error) {
    console.error('[Contract Utils] Error getting token balance:', error)
    throw error
  }
}

/**
 * 获取用户的未领取奖励
 * @param userAddress - 用户地址
 * @returns 未领取奖励（wei 单位的字符串）
 */
export async function getEarned(userAddress: string) {
  try {
    const stakingRewardContract = await getStakingRewardContract()
    const earned = await stakingRewardContract.earned(userAddress)
    return earned.toString()
  } catch (error) {
    console.error('[Contract Utils] Error getting earned rewards:', error)
    throw error
  }
}

/**
 * 用户提取收益
 */
export async function getReward() {
  try {
    const stakingRewardContract = await getStakingRewardContract()
    const tx = await stakingRewardContract.getReward()
    const receipt = await tx.wait()
    console.log('[Contract Utils] Reward claimed successfully')
    return receipt
  } catch (error) {
    console.error('[Contract Utils] Error claiming reward:', error)
    throw error
  }
}

/**
 * 用户查看收益余额
 * @param userAddress - 用户地址
 * @returns 未领取奖励（wei 单位的字符串）
 */
export async function viewReward(userAddress: string) {
  try {
    const rewardContract = await getRewardContract()
    const reward = await rewardContract.balanceOf(userAddress)
    return reward.toString()
  } catch (error) {
    console.error('[Contract Utils] Error viewing reward:', error)
    throw error
  }
}

/**
 * 验证合约地址有效性
 */
function validateAddress(address: string | undefined, envVarName: string) {
  if (!address) {
    throw new Error(`Environment variable ${envVarName} is not set`)
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid address format for ${envVarName}: ${address}`)
  }
}

/**
 * 从 ABI 文件中提取 abi 数组
 * 处理 Hardhat 工件格式
 */
function extractAbi(abiSource: any): any[] {
  // 如果是数组，直接返回
  if (Array.isArray(abiSource)) {
    return abiSource
  }
  // 如果是对象，尝试获取 abi 字段
  if (abiSource.abi && Array.isArray(abiSource.abi)) {
    return abiSource.abi
  }
  // 如果没有找到有效的 abi，抛出错误
  throw new Error('Invalid ABI format: cannot extract abi array from source')
}

export { clearContractCache as resetContractCache }
