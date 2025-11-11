<script setup lang="ts">
import { ethers } from 'ethers'
import { ref, onMounted } from 'vue'
import { abi } from '@/abi/StakingRewards.json'

// 定义 ethereum provider 类型
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isMetaMask?: boolean
}

const activeKey = ref('1')

const ERROR = '未找到ethereum provider，请检查一下是否安装小狐狸钱包，或者还没有登陆钱包'
// 获取ethereum provider
function getEth(): EthereumProvider {
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum
  if (!eth) {
    throw new Error(ERROR)
  }
  return eth
}
// 请求用户授权
async function requestAccess() {
  const eth = getEth()

  const result = (await eth.request({
    method: 'eth_requestAccounts',
  })) as string[]

  return result && result.length > 0
}
// 检查用户是否有签名账户
async function hasSigners() {
  const metamask = getEth()
  const signers = (await metamask.request({
    method: 'eth_accounts',
  })) as string[]
  return signers.length > 0
}

// 获取合约实例
async function getContract() {
  if (!(await hasSigners()) && !(await requestAccess())) {
    throw new Error(ERROR)
  }
  const provider = new ethers.BrowserProvider(getEth())
  // console.log("provider", provider);
  const address = import.meta.env.VITE_STAKING_REWARD_ADDRESS as string
  console.log('address', address)
  const signer = await provider.getSigner()
  // 创建合约 需要一下三个参数
  // 1. 地址
  // 2. 方法名
  // 3. provider
  // 4. signer
  const contract = new ethers.Contract(address, abi, signer)

  return contract
}
const contract = ref<ethers.Contract | null>(null)

// 质押
async function stake(amount: number) {
  if (!contract.value) {
    throw new Error('合约未初始化')
  }
  await contract.value.stake(amount)
}

onMounted(async () => {
  try {
    contract.value = await getContract()
  } catch (error) {
    console.error('初始化合约失败:', error)
  }
})
</script>
<template>
  <div class="home">
    <a-tabs class="custom-tabs" v-model:activeKey="activeKey">
      <a-tab-pane key="1" tab="Staking Manager">Content of Tab Pane 1</a-tab-pane>
      <a-tab-pane key="2" tab="Rewards System" force-render>Content of Tab Pane 2</a-tab-pane>
    </a-tabs>
    <a-button @click="stake(100)">Stake</a-button>
  </div>
</template>
<style lang="less" scoped>
.home {
  max-width: 1140px;
  margin: 0 auto;
  padding-top: 24px;
  height: 100vh;
  box-sizing: border-box;
  .custom-tabs {
    margin-top: 20px;
    color: rgba(226, 228, 233, 0.7);
    :deep(.ant-tabs-tab) {
      font-size: 16px;
      padding: 12px 16px;
      &:hover {
        color: #fff;
      }
    }
    :deep(.ant-tabs-nav-wrap) {
      border-bottom: 1px solid #2b2f3b;
    }
    :deep(.ant-tabs-tab-active) {
      .ant-tabs-tab-btn {
        color: #fff;
      }
    }
  }
}
</style>
