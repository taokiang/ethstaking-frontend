import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { getStakingContract, getStakingRewardContract, getUserAddress, getEarned, getReward } from '@/utils/contract'
import { parseEther, formatEther } from 'ethers'

// 定义质押代币类型
export interface StakingToken {
  id: string
  name: string
  symbol: string
  address: string
  icon: string
  apy: number
  totalStaked: number
  rewardToken: string
  rewardTokenSymbol: string
  lockupPeriod?: number // 锁仓周期（天）
  isActive: boolean
  description: string
}

// 定义用户质押信息
export interface UserStake {
  tokenId: string
  amount: number
  timestamp: number
  reward: number
  lastClaimed: number
  isLocked: boolean
  unlockTime?: number
}

// 定义奖励历史接口
export interface RewardHistory {
  id: string
  date: number // 时间戳
  amount: number // 奖励金额
  transactionHash?: string // 交易哈希
  status: 'completed' | 'pending' | 'failed'
}

// 模拟质押代币数据
const STAKING_TOKENS: StakingToken[] = [
  {
    id: '1',
    name: 'Ethereum',
    symbol: 'STAKE',
    address: import.meta.env.VITE_TOKEN1_ADDRESS,
    icon: 'https://picsum.photos/id/237/40/40',
    apy: 8.5,
    totalStaked: 12500,
    rewardToken: import.meta.env.VITE_TOKEN2_ADDRESS,
    rewardTokenSymbol: 'REWARD',
    isActive: true,
    description: 'Stake Ethereum to earn REWARD tokens as rewards. No lockup period.',
  },
  // {
  //   id: '2',
  //   name: 'Uniswap',
  //   symbol: 'UNI',
  //   address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  //   icon: 'https://picsum.photos/id/238/40/40',
  //   apy: 12.3,
  //   totalStaked: 45200,
  //   rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  //   rewardTokenSymbol: 'REW',
  //   lockupPeriod: 30,
  //   isActive: true,
  //   description: 'Stake UNI with a 30-day lockup for higher APY rewards.',
  // },
  // {
  //   id: '3',
  //   name: 'Aave',
  //   symbol: 'AAVE',
  //   address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  //   icon: 'https://picsum.photos/id/239/40/40',
  //   apy: 15.7,
  //   totalStaked: 8750,
  //   rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  //   rewardTokenSymbol: 'REW',
  //   lockupPeriod: 90,
  //   isActive: true,
  //   description: 'Stake AAVE with a 90-day lockup for maximum APY rewards.',
  // },
  // {
  //   id: '4',
  //   name: 'Chainlink',
  //   symbol: 'LINK',
  //   address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  //   icon: 'https://picsum.photos/id/240/40/40',
  //   apy: 7.2,
  //   totalStaked: 32400,
  //   rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  //   rewardTokenSymbol: 'REW',
  //   isActive: false,
  //   description: 'Staking paused for maintenance. Check back soon.',
  // },
]

export const useStakingStore = defineStore('staking', () => {
  const walletStore = useWalletStore()
  // 状态
  const stakingTokens = ref<StakingToken[]>(STAKING_TOKENS)
  const userStakes = ref<UserStake[]>([])
  const selectedTokenId = ref<string | null>(null)
  const stakingAmount = ref<string>('')
  const withdrawAmount = ref<string>('')
  const isLoading = ref<boolean>(false)
  const errorMessage = ref<string>('')
  const successMessage = ref<string>('')
  const activeTab = ref<'stake' | 'unstake' | 'rewards'>('stake')

  // 初始化 - 从本地存储加载用户质押数据
  const init = () => {
    const savedStakes = localStorage.getItem('userStakes')
    if (savedStakes) {
      try {
        userStakes.value = JSON.parse(savedStakes)
      } catch (error) {
        console.error('Failed to parse saved stakes:', error)
        userStakes.value = []
      }
    }
    
    // 从本地存储加载奖励历史
    const savedRewardsHistory = localStorage.getItem('rewardsHistory')
    if (savedRewardsHistory) {
      try {
        rewardsHistory.value = JSON.parse(savedRewardsHistory)
      } catch (error) {
        console.error('Failed to parse saved rewards history:', error)
        rewardsHistory.value = []
      }
    }
  }
  const tokenRewards = ref<number>(0);
  
  // 添加奖励历史状态
  const rewardsHistory = ref<RewardHistory[]>([])

  // 监听用户质押数据变化，保存到本地存储
  watch(
    userStakes,
    (newStakes) => {
      localStorage.setItem('userStakes', JSON.stringify(newStakes))
    },
    { deep: true },
  )
  
  // 监听奖励历史变化，保存到本地存储
  watch(
    rewardsHistory,
    (newHistory) => {
      localStorage.setItem('rewardsHistory', JSON.stringify(newHistory))
    },
    { deep: true },
  )

  // 监听钱包连接状态，当钱包连接时启动奖励计算
  let rewardCalculationInterval: ReturnType<typeof setInterval> | null = null

  watch(
    () => walletStore.connected,
    (isConnected) => {
      if (isConnected) {
        console.log('[StakingStore] Wallet connected, starting reward calculation...')
        // 立即计算一次
        calculateRewards()
        // 清除之前的定时器（如果有）
        if (rewardCalculationInterval) {
          clearInterval(rewardCalculationInterval)
        }
        // 启动定时器，每10秒更新一次
        rewardCalculationInterval = setInterval(() => {
          calculateRewards()
        }, 10000)
      } else {
        console.log('[StakingStore] Wallet disconnected, stopping reward calculation...')
        // 钱包断开连接时清除定时器
        if (rewardCalculationInterval) {
          clearInterval(rewardCalculationInterval)
          rewardCalculationInterval = null
        }
        // 清零奖励
        tokenRewards.value = 0
      }
    },
  )

  // 计算属性
  const selectedToken = computed(() => {
    return stakingTokens.value.find((token) => token.id === selectedTokenId.value) || null
  })

  const userTotalStaked = computed(() => {
    return userStakes.value.reduce((total, stake) => total + stake.amount, 0)
  })

  const userTotalRewards = computed(() => {
    return userStakes.value.reduce((total, stake) => total + stake.reward, 0)
  })

  const userStakesByToken = computed(() => {
    return userStakes.value.filter((stake) => stake.tokenId === selectedTokenId.value)
  })

  const tokenStakedAmount = computed(() => {
    return userStakesByToken.value.reduce((total, stake) => total + stake.amount, 0)
  })

  // const tokenRewards = computed(() => {
  //   return userStakesByToken.value.reduce((total, stake) => total + stake.reward, 0)
  // })
  

  // 方法 - 选择质押代币
  const selectToken = (tokenId: string) => {
    selectedTokenId.value = tokenId
    stakingAmount.value = ''
    withdrawAmount.value = ''
    clearMessages()
  }

  // 方法 - 质押
  const stake = async () => {
    // 第一层检查：钱包连接状态（同步检查）
    if (!walletStore.connected) {
      errorMessage.value = 'Please connect your wallet first'
      console.warn('[Staking] Wallet not connected')
      return false
    }

    // 第二层检查：钱包地址存在（同步检查）
    if (!walletStore.address) {
      errorMessage.value = 'Wallet address not available'
      console.warn('[Staking] Wallet address not available')
      return false
    }

    if (!selectedToken.value) {
      errorMessage.value = 'Please select a token to stake'
      return false
    }

    // 额外校验以满足类型收窄
    if (!selectedTokenId.value) {
      errorMessage.value = 'Please select a token to stake'
      return false
    }

    if (!selectedToken.value.isActive) {
      errorMessage.value = 'This token is not available for staking'
      return false
    }

    const amount = parseFloat(stakingAmount.value)
    if (isNaN(amount) || amount <= 0) {
      errorMessage.value = 'Please enter a valid amount'
      return false
    }

    isLoading.value = true
    clearMessages()

    try {
      // 在异步操作前再次确认钱包状态（防止用户在操作中断开连接）
      if (!walletStore.connected || !walletStore.address) {
        throw new Error('Wallet disconnected during operation')
      }

      const stakContract = await getStakingContract();
      const userAddress = await getUserAddress();

      const stakingRewardContract = await getStakingRewardContract()
      const tokenAmount = parseEther(amount.toString())
      
      // 获取质押合约地址
      const stakingRewardAddress = await stakingRewardContract.getAddress()
      // 1. 检查授权额度
      const allowance = await stakContract.allowance(userAddress, stakingRewardAddress)
      
      if (allowance < tokenAmount) {
        // 2. 如果需要，先授权
        console.log('Approving tokens for staking...')
        const approveTx = await stakContract.approve(stakingRewardAddress, tokenAmount)
        await approveTx.wait()
        console.log('Approval successful:', approveTx.hash)
      }
      
      // 3. 执行质押
      console.log('Staking tokens...', tokenAmount.toString())
      const stakeTx = await stakingRewardContract.stake(tokenAmount)
      const receipt = await stakeTx.wait()
      console.log('Staking successful:', receipt?.hash)

      // 4. 更新本地状态
      const currentTokenId = selectedTokenId.value
      const existingStakeIndex = userStakes.value.findIndex(
        (stake) => stake.tokenId === currentTokenId && !stake.isLocked,
      )
      
      if (existingStakeIndex >= 0) {
        userStakes.value[existingStakeIndex].amount += amount
      } else {
        userStakes.value.push({
          tokenId: currentTokenId,
          amount,
          timestamp: Date.now(),
          reward: 0,
          lastClaimed: Date.now(),
          isLocked: !!selectedToken.value?.lockupPeriod,
          unlockTime: selectedToken.value?.lockupPeriod
            ? Date.now() + selectedToken.value.lockupPeriod * 24 * 60 * 60 * 1000
            : undefined,
        })
      }
      
      // 5. 添加交易记录
      walletStore.addTransaction({
        type: 'stake',
        amount: amount.toString(),
        token: selectedToken.value?.symbol || 'UNKNOWN',
        status: 'completed',
        transactionHash: receipt?.hash,
      })
      
      successMessage.value = `Successfully staked ${amount} tokens`
      stakingAmount.value = ''
      return true
    } catch (error) {
      console.error('Staking error:', error)
      errorMessage.value = error instanceof Error ? error.message : 'Failed to stake tokens. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 方法 - 解除质押
  const unstake = async () => {
    if (!walletStore.connected) {
      errorMessage.value = 'Please connect your wallet first'
      return false
    }

    if (!walletStore.address) {
      errorMessage.value = 'Wallet address not available'
      return false
    }

    if (!selectedToken.value) {
      errorMessage.value = 'Please select a token to unstake'
      return false
    }

    isLoading.value = true
    clearMessages()

    try {
      // 从智能合约执行解除质押操作
      console.log('[Unstake] Unstaking tokens from smart contract...')
      const stakingRewardContract = await getStakingRewardContract();
      const withdrawAmountToken = parseEther(withdrawAmount.value.toString());
      console.log('withdrawAmountToken', withdrawAmountToken)
      const stakeTx = await stakingRewardContract.unstake(withdrawAmountToken )
      const receipt = await stakeTx.wait()
      console.log('[Unstake] Unstaking successful:', receipt?.hash)

      // 更新本地状态
      const currentTokenId = selectedTokenId.value
      const existingStakeIndex = userStakes.value.findIndex(
        (stake) => stake.tokenId === currentTokenId && !stake.isLocked,
      )
      const amount = parseFloat(withdrawAmount.value);
      if (existingStakeIndex >= 0) {
        userStakes.value[existingStakeIndex].amount -= amount
      } else {
        userStakes.value.push({
          tokenId: currentTokenId as string,
          amount,
          timestamp: Date.now(),
          reward: 0,
          lastClaimed: Date.now(),
          isLocked: !!selectedToken.value?.lockupPeriod,
          unlockTime: selectedToken.value?.lockupPeriod
            ? Date.now() + selectedToken.value.lockupPeriod * 24 * 60 * 60 * 1000
            : undefined,
        })
      }

      // 移除所有锁仓的质押记录
      userStakes.value = userStakes.value.filter(
        (stake) => !(stake.tokenId === selectedTokenId.value && stake.isLocked),
      )

      // 添加交易记录
      walletStore.addTransaction({
        type: 'unstake',
        amount: tokenStakedAmount.value.toString(),
        token: selectedToken.value.symbol,
        status: 'completed',
        transactionHash: receipt?.hash,
      })

      successMessage.value = `Successfully unstaked all locked ${selectedToken.value.symbol} tokens`
      withdrawAmount.value = ''
      return true
    } catch (error) {
      console.error('[Unstake] Unstaking error:', error)
      errorMessage.value = error instanceof Error ? error.message : 'Failed to unstake tokens. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 方法 - 领取奖励
  const claimRewards = async () => {
    if (!walletStore.connected) {
      errorMessage.value = 'Please connect your wallet first'
      return false
    }

    if (!walletStore.address) {
      errorMessage.value = 'Wallet address not available'
      return false
    }

    if (!selectedToken.value) {
      errorMessage.value = 'Please select a token'
      return false
    }

    if (tokenRewards.value <= 0) {
      errorMessage.value = 'No rewards available to claim'
      return false
    }

    isLoading.value = true
    clearMessages()

    try {
      // 从智能合约领取奖励
      console.log('[ClaimRewards] Claiming rewards from smart contract...')
      const rewardsToClaim = tokenRewards.value
      
      // 调用合约的 getReward 方法提取奖励
      const receipt = await getReward()
      console.log('[ClaimRewards] Rewards claimed successfully')

      // 将奖励记录添加到历史
      const rewardRecord: RewardHistory = {
        id: Date.now().toString(),
        date: Date.now(),
        amount: rewardsToClaim,
        transactionHash: receipt?.hash || undefined,
        status: 'completed',
      }
      rewardsHistory.value.unshift(rewardRecord)
      console.log('[ClaimRewards] Reward history recorded:', rewardRecord)

      // ✅ 清零本地状态中的奖励
      tokenRewards.value = 0

      // 清零用户质押记录中的奖励
      userStakes.value = userStakes.value.map((stake) => {
        if (stake.tokenId === selectedTokenId.value) {
          return {
            ...stake,
            reward: 0,
            lastClaimed: Date.now(),
          }
        }
        return stake
      })

      // 添加交易记录
      walletStore.addTransaction({
        type: 'reward',
        amount: rewardsToClaim.toFixed(4),
        token: selectedToken.value.rewardTokenSymbol,
        status: 'completed',
        transactionHash: receipt?.hash,
      })

      successMessage.value = `Successfully claimed ${rewardsToClaim.toFixed(4)} ${selectedToken.value.rewardTokenSymbol}`
      
      // 领取奖励后立即更新奖励
      await calculateRewards()

      return true
    } catch (error) {
      console.error('[ClaimRewards] Reward claim error:', error)
      errorMessage.value = error instanceof Error ? error.message : 'Failed to claim rewards. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 方法 - 计算奖励
  const calculateRewards = async () => {
    // 从智能合约获取用户的实时奖励
    try {
      // 只有钱包连接且地址存在时才更新奖励
      if (!walletStore.connected) {
        console.debug('[CalculateRewards] Wallet not connected, skipping reward calculation')
        return
      }

      if (!walletStore.address) {
        console.debug('[CalculateRewards] Wallet address not available, skipping reward calculation')
        return
      }

      // 从合约获取未领取的奖励
      const earnedToken = await getEarned(walletStore.address)
      const earnedFormatted = Number(formatEther(earnedToken))
      
      // 更新全局奖励状态
      tokenRewards.value = earnedFormatted
      console.log('[CalculateRewards] Updated rewards from contract:', earnedFormatted)

      // 同步更新本地质押记录中对应代币的奖励
      // 注意：这里只更新选中代币的奖励，如果需要所有代币的奖励，应遍历所有质押
      if (selectedTokenId.value) {
        userStakes.value = userStakes.value.map((stake) => {
          if (stake.tokenId === selectedTokenId.value) {
            return {
              ...stake,
              reward: earnedFormatted,
            }
          }
          return stake
        })
      }
    } catch (error) {
      console.error('[CalculateRewards] Error calculating rewards from contract:', error)
    }
  }

  // 方法 - 清除消息
  const clearMessages = () => {
    errorMessage.value = ''
    successMessage.value = ''
  }

  // 初始化
  init()

  return {
    stakingTokens,
    userStakes,
    selectedTokenId,
    stakingAmount,
    withdrawAmount,
    isLoading,
    errorMessage,
    successMessage,
    activeTab,
    selectedToken,
    userTotalStaked,
    userTotalRewards,
    userStakesByToken,
    tokenStakedAmount,
    tokenRewards,
    rewardsHistory,
    selectToken,
    stake,
    unstake,
    claimRewards,
    calculateRewards,
    clearMessages,
  }
})
