import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { getStakingContract, getStakingRewardContract, getUserAddress } from '@/utils/contract'
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

// 模拟质押代币数据
const STAKING_TOKENS: StakingToken[] = [
  {
    id: '1',
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    icon: 'https://picsum.photos/id/237/40/40',
    apy: 8.5,
    totalStaked: 12500,
    rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    rewardTokenSymbol: 'REW',
    isActive: true,
    description: 'Stake Ethereum to earn REW tokens as rewards. No lockup period.',
  },
  {
    id: '2',
    name: 'Uniswap',
    symbol: 'UNI',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    icon: 'https://picsum.photos/id/238/40/40',
    apy: 12.3,
    totalStaked: 45200,
    rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    rewardTokenSymbol: 'REW',
    lockupPeriod: 30,
    isActive: true,
    description: 'Stake UNI with a 30-day lockup for higher APY rewards.',
  },
  {
    id: '3',
    name: 'Aave',
    symbol: 'AAVE',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    icon: 'https://picsum.photos/id/239/40/40',
    apy: 15.7,
    totalStaked: 8750,
    rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    rewardTokenSymbol: 'REW',
    lockupPeriod: 90,
    isActive: true,
    description: 'Stake AAVE with a 90-day lockup for maximum APY rewards.',
  },
  {
    id: '4',
    name: 'Chainlink',
    symbol: 'LINK',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    icon: 'https://picsum.photos/id/240/40/40',
    apy: 7.2,
    totalStaked: 32400,
    rewardToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    rewardTokenSymbol: 'REW',
    isActive: false,
    description: 'Staking paused for maintenance. Check back soon.',
  },
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
  }

  // 监听用户质押数据变化，保存到本地存储
  watch(
    userStakes,
    (newStakes) => {
      localStorage.setItem('userStakes', JSON.stringify(newStakes))
    },
    { deep: true },
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

  const tokenRewards = computed(() => {
    return userStakesByToken.value.reduce((total, stake) => total + stake.reward, 0)
  })

  // 方法 - 选择质押代币
  const selectToken = (tokenId: string) => {
    selectedTokenId.value = tokenId
    stakingAmount.value = ''
    withdrawAmount.value = ''
    clearMessages()
  }

  // 方法 - 质押
  const stake = async () => {
    if (!walletStore.connected) {
      errorMessage.value = 'Please connect your wallet first'
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

    const stakContract = await getStakingContract();
    const address = await getUserAddress();
    const maxTokenStaking = formatEther(await stakContract.balanceOf(address));
    console.log('address', address);
    console.log('maxTokenStaking', maxTokenStaking);
    if(Number(maxTokenStaking) < amount) {
      errorMessage.value = 'Insufficient token balance for staking'
      return false
    };

    isLoading.value = true
    clearMessages()

    try {
      // 如果需要真实调用合约，可启用以下逻辑
      console.log(parseEther(amount.toString()))
      // const stakingRewardContract = await getStakingRewardContract();
      // const tokenStaking = parseEther(amount.toString());
      // // 质押合约授权给质押收益合约代币
      // const result = await stakContract.approve(
      //  await stakingRewardContract.getAddress(),
      //  tokenStaking
      // );
      // console.log('Approval result:', result);
      // // 质押
      // const tx = await stakingRewardContract.stake(tokenStaking)
      // await tx.wait()
      // console.log('Staking transaction:', tx)
      // 检查是否已有该代币的质押记录
      const currentTokenId = selectedTokenId.value
      const existingStakeIndex = userStakes.value.findIndex(
        (stake) => stake.tokenId === currentTokenId && !stake.isLocked,
      )

      if (existingStakeIndex >= 0) {
        // 更新现有质押
        userStakes.value[existingStakeIndex].amount += amount
      } else {
        // 添加新质押
        userStakes.value.push({
          tokenId: currentTokenId,
          amount,
          timestamp: Date.now(),
          reward: 0,
          lastClaimed: Date.now(),
          isLocked: !!selectedToken.value.lockupPeriod,
          unlockTime: selectedToken.value.lockupPeriod
            ? Date.now() + selectedToken.value.lockupPeriod * 24 * 60 * 60 * 1000
            : undefined,
        })
      }

      // 添加交易记录
      walletStore.addTransaction({
        type: 'stake',
        amount: amount.toString(),
        token: selectedToken.value.symbol,
        status: 'completed',
      })

      successMessage.value = `Successfully staked ${amount} ${selectedToken.value.symbol}`
      stakingAmount.value = ''
      return true
    } catch (error) {
      console.error('Staking error:', error)
      errorMessage.value = 'Failed to stake tokens. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 方法 - 提取
  const withdraw = async () => {
    if (!walletStore.connected) {
      errorMessage.value = 'Please connect your wallet first'
      return false
    }

    if (!selectedToken.value) {
      errorMessage.value = 'Please select a token to withdraw'
      return false
    }

    const amount = parseFloat(withdrawAmount.value)
    if (isNaN(amount) || amount <= 0) {
      errorMessage.value = 'Please enter a valid amount'
      return false
    }

    if (amount > tokenStakedAmount.value) {
      errorMessage.value = 'Withdrawal amount exceeds staked amount'
      return false
    }

    // 检查是否有锁仓
    const lockedStakes = userStakesByToken.value.filter((stake) => stake.isLocked)
    const totalLocked = lockedStakes.reduce((sum, stake) => sum + stake.amount, 0)

    if (totalLocked > 0 && amount > tokenStakedAmount.value - totalLocked) {
      errorMessage.value = 'Cannot withdraw locked funds before unlock period'
      return false
    }

    isLoading.value = true
    clearMessages()

    try {
      // 模拟区块链交易
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 先处理非锁仓的质押
      let remainingAmount = amount

      for (let i = userStakes.value.length - 1; i >= 0; i--) {
        const stake = userStakes.value[i]
        if (stake.tokenId === selectedTokenId.value && !stake.isLocked && remainingAmount > 0) {
          if (stake.amount <= remainingAmount) {
            remainingAmount -= stake.amount
            userStakes.value.splice(i, 1)
          } else {
            stake.amount -= remainingAmount
            remainingAmount = 0
          }
        }
      }

      // 添加交易记录
      walletStore.addTransaction({
        type: 'withdraw',
        amount: amount.toString(),
        token: selectedToken.value.symbol,
        status: 'completed',
      })

      successMessage.value = `Successfully withdrew ${amount} ${selectedToken.value.symbol}`
      withdrawAmount.value = ''
      return true
    } catch (error) {
      console.error('Withdrawal error:', error)
      errorMessage.value = 'Failed to withdraw tokens. Please try again.'
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
      // 模拟区块链交易
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const rewardsToClaim = tokenRewards.value

      // 清零奖励
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
      })

      successMessage.value = `Successfully claimed ${rewardsToClaim.toFixed(4)} ${selectedToken.value.rewardTokenSymbol}`
      return true
    } catch (error) {
      console.error('Reward claim error:', error)
      errorMessage.value = 'Failed to claim rewards. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 方法 - 计算奖励
  const calculateRewards = () => {
    // 模拟奖励计算 - 实际应用中应该从智能合约获取
    userStakes.value = userStakes.value.map((stake) => {
      const token = stakingTokens.value.find((t) => t.id === stake.tokenId)
      if (!token) return stake

      // 计算自上次领取奖励以来的时间（天）
      const timePassed = (Date.now() - stake.lastClaimed) / (1000 * 60 * 60 * 24)

      // 基于APY计算奖励
      const dailyRewardRate = token.apy / 100 / 365
      const newReward = stake.amount * dailyRewardRate * timePassed

      return {
        ...stake,
        reward: stake.reward + newReward,
      }
    })
  }

  // 方法 - 清除消息
  const clearMessages = () => {
    errorMessage.value = ''
    successMessage.value = ''
  }

  // 每30秒自动计算一次奖励
  const startRewardCalculation = () => {
    calculateRewards()
    setInterval(calculateRewards, 30000)
  }

  // 初始化
  init()
  startRewardCalculation()

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
    selectToken,
    stake,
    withdraw,
    claimRewards,
    calculateRewards,
    clearMessages,
  }
})
