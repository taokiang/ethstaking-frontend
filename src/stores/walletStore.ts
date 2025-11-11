import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/vue'
import { BrowserProvider, formatEther, type Eip1193Provider, toBeHex } from 'ethers'

// 定义交易状态
type TransactionStatus = 'idle' | 'pending' | 'success' | 'error'

// 定义交易历史项
interface TransactionHistoryItem {
  id: string
  type: 'stake' | 'withdraw' | 'reward'
  amount: string
  token: string
  timestamp: number
  status: 'completed' | 'failed' | 'pending'
  transactionHash?: string
}

export const useWalletStore = defineStore('wallet', () => {
  const account = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const modal = useAppKit()
  // 状态
  const balance = ref<string>('0')
  const transactionStatus = ref<TransactionStatus>('idle')
  const transactionMessage = ref<string>('')
  const transactionHistory = ref<TransactionHistoryItem[]>([])
  const chainId = ref<number | null>(null)
  const isLoading = ref<boolean>(false)
  const isConnecting = ref<boolean>(false)

  const address = computed(() => account.value.address)
  const connected = computed(() => account.value.isConnected)
  const formattedAddress = computed(() => {
    if (!address.value) return null
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  // 诊断日志：监听 account 的所有变化
  watch(
    () => account.value,
    (newAccount) => {
      console.log('walletStore: account.value changed', newAccount)
      console.log('  isConnected:', newAccount.isConnected)
      console.log('  address:', newAccount.address)
      console.log('  caipAddress:', (newAccount as any).caipAddress)
      console.log('  status:', (newAccount as any).status)
    },
    { deep: true }
  )

  // 初始化 ethers provider
  if (!window.ethereum) {
    throw new Error('Ethereum provider not found')
  }
  const ethersProvider = new BrowserProvider(window?.ethereum as unknown as Eip1193Provider)

  // 获取余额的方法
  const getBalance = async () => {
    if (!connected.value) throw Error('User disconnected')
    try {
      // 获取余额（单位为 wei）
      const balanceWei = await ethersProvider.getBalance(address.value as string)

      // 转换为数字类型存储
      balance.value = formatEther(balanceWei)
    } catch (err) {
      console.error('获取余额失败:', err)
    }
  }

  watch(
    () => connected.value,
    async (newVal) => {
      console.log('[walletStore] connected state changed to:', newVal)
      console.log('[walletStore] address:', address.value)
      console.log('[walletStore] account.isConnected:', account.value.isConnected)
      if (newVal) {
        try {
          await getBalance()
        } catch (err) {
          console.error('[walletStore] Error getting balance:', err)
        }
      }
    },
  )

  // 连接钱包
  const connectWallet = async () => {
    // 防止重复发起连接请求导致连接被拒绝
    if (isLoading.value || isConnecting.value) {
      console.log('connectWallet: already connecting or loading, ignoring duplicate request')
      return
    }

    isConnecting.value = true
    isLoading.value = true
    transactionStatus.value = 'idle'

    try {
      if (connected.value) {
        return
      }

      // 打开连接钱包弹窗（由 appkit 负责处理）
      // modal.open 有可能返回一个 promise，也有可能是同步的，保持兼容性
      try {
        const res = (modal as any).open?.()
        if (res && typeof res.then === 'function') {
          await res
        }
      } catch (err) {
        console.error('modal.open error:', err)
        transactionStatus.value = 'error'
        transactionMessage.value = 'Connection declined or failed'
      }
    } finally {
      // 由 isConnected 监听器最终关停 loading，但为避免长时间 pending，这里兜底
      // 延迟清除 isConnecting，防止短时间内重复点击
      setTimeout(() => {
        isConnecting.value = false
      }, 800)
      isLoading.value = false
    }
  }

  // 断开钱包连接
  const disconnectWallet = async () => {
    await disconnect()
    chainId.value = null
    transactionMessage.value = 'Wallet disconnected'
  }

  // 添加交易记录
  const addTransaction = (transaction: Omit<TransactionHistoryItem, 'id' | 'timestamp'>) => {
    const newTransaction: TransactionHistoryItem = {
      ...transaction,
      id: Date.now().toString(),
      timestamp: Date.now(),
    }
    transactionHistory.value.unshift(newTransaction)
    // 限制历史记录数量，避免内存增长
    if (transactionHistory.value.length > 50) {
      transactionHistory.value.pop()
    }
  }

  // 更新交易状态
  const updateTransactionStatus = (id: string, status: 'completed' | 'failed', hash?: string) => {
    const index = transactionHistory.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const item = transactionHistory.value[index]
    item.status = status
    if (hash) item.transactionHash = hash
  }

  // 切换链
  const switchChain = async (targetChainId: number) => {
    isLoading.value = true
    try {
      // 模拟链切换（实际项目中应调用钱包 API 切链）
      // await new Promise((resolve) => setTimeout(resolve, 1000))
      await ethersProvider.send('wallet_switchEthereumChain', [{ chainId: toBeHex(targetChainId) }])
      console.log('网络切换成功')
      chainId.value = targetChainId
      transactionStatus.value = 'success'
      transactionMessage.value = `Switched to chain ID: ${targetChainId}`
      return true
    } catch (error) {
      console.error('Chain switch error:', error)
      transactionStatus.value = 'error'
      transactionMessage.value = 'Failed to switch chain'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    address,
    balance,
    connected,
    transactionStatus,
    transactionMessage,
    transactionHistory,
    chainId,
    isLoading,
    formattedAddress,
    connectWallet,
    disconnectWallet,
    addTransaction,
    updateTransactionStatus,
    switchChain,
  }
})
