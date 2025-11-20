<template>
  <div class="staking-container">
    <div class="staking-header mb-30">
      <h1 class="staking-title">Stake Tokens</h1>
      <p class="staking-subtitle">Earn rewards by staking your tokens</p>
    </div>

    <!-- 钱包未连接状态 -->
    <div
      v-if="!walletStore.connected"
      class="no-wallet-state custom-card p-30 text-center slide-up"
    >
      <div class="no-wallet-icon mb-20">
        <i class="anticon anticon-wallet" style="font-size: 48px"></i>
      </div>
      <h3 class="mb-10">Connect Your Wallet</h3>
      <p class="mb-20 text-secondary">Connect your wallet to start staking and earning rewards</p>
      <a-button type="primary" @click="walletStore.connectWallet()">
        <i class="anticon anticon-link mr-2"></i>Connect Wallet
      </a-button>
    </div>

    <!-- 钱包已连接状态 -->
    <div v-else class="staking-content">
      <!-- 代币选择 -->
      <a-card class="custom-card mb-30">
        <h3 class="card-title mb-20">Select a Token to Stake</h3>
        <div class="tokens-grid">
          <div
            v-for="token in stakingStore.stakingTokens"
            :key="token.id"
            class="token-card"
            :class="{
              'token-card-selected': stakingStore.selectedTokenId === token.id,
              'token-card-disabled': !token.isActive,
            }"
            @click="handleTokenSelect(token.id)"
          >
            <div class="token-icon-container">
              <img :src="token.icon" :alt="token.name" class="token-icon" />
            </div>
            <div class="token-info">
              <div class="token-name">
                {{ token.name }}
                <span v-if="!token.isActive" class="token-disabled-badge">Inactive</span>
              </div>
              <div class="token-symbol">{{ token.symbol }}</div>
            </div>
            <div class="token-apy">
              <span class="apy-value">{{ token.apy }}%</span>
              <span class="apy-label">APY</span>
            </div>
          </div>
        </div>
      </a-card>

      <!-- 质押操作区域 -->
      <div v-if="stakingStore.selectedToken" class="staking-actions">
        <a-card class="custom-card">
          <a-tabs v-model:activeKey="stakingStore.activeTab" class="staking-tabs">
            <a-tab-pane tab="Stake" key="stake">
              <div class="tab-content">
                <div class="token-details mb-20">
                  <div class="token-details-header">
                    <img
                      :src="stakingStore.selectedToken.icon"
                      :alt="stakingStore.selectedToken.name"
                      class="detail-token-icon"
                    />
                    <div class="detail-token-info">
                      <h4>
                        {{ stakingStore.selectedToken.name }} ({{
                          stakingStore.selectedToken.symbol
                        }})
                      </h4>
                      <p class="token-description">{{ stakingStore.selectedToken.description }}</p>
                    </div>
                    <div class="detail-token-stats">
                      <div class="stat-item">
                        <div class="stat-label">APY</div>
                        <div class="stat-value">{{ stakingStore.selectedToken.apy }}%</div>
                      </div>
                      <div class="stat-item">
                        <div class="stat-label">Total Staked</div>
                        <div class="stat-value">
                          {{ stakingStore.selectedToken.totalStaked.toLocaleString() }}
                          {{ stakingStore.selectedToken.symbol }}
                        </div>
                      </div>
                      <div v-if="stakingStore.selectedToken.lockupPeriod" class="stat-item">
                        <div class="stat-label">Lockup Period</div>
                        <div class="stat-value">
                          {{ stakingStore.selectedToken.lockupPeriod }} days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="stake-form">
                  <div class="form-group mb-20">
                    <label class="form-label">Amount to Stake</label>
                    <div class="input-group">
                      <a-input-number
                        v-model:value="stakingStore.stakingAmount"
                        placeholder="Enter amount"
                        style="width: 100%"
                        :precision="6"
                        :step="0.001"
                        @change="validateStakeAmount"
                      />
                      <span class="input-suffix">{{ stakingStore.selectedToken.symbol }}</span>
                    </div>
                    <div class="amount-info mt-10">
                      <span class="available-balance"
                        >Available: {{ stakedBalance }}
                        {{ stakingStore.selectedToken.symbol }}</span
                      >
                      <a-button
                        type="text"
                        class="max-btn"
                        @click="stakingStore.stakingAmount = stakedBalance; validateStakeAmount(stakedBalance)"
                      >
                        Max
                      </a-button>
                    </div>
                  </div>

                  <div class="rewards-estimate mb-20 p-20 bg-gray-50 rounded-lg">
                    <h5 class="mb-10">Rewards Estimate</h5>
                    <div class="estimate-row">
                      <span class="estimate-label">Daily Rewards</span>
                      <span class="estimate-value"
                        >{{ dailyRewards.toFixed(6) }}
                        {{ stakingStore.selectedToken.rewardTokenSymbol }}</span
                      >
                    </div>
                    <div class="estimate-row">
                      <span class="estimate-label">Monthly Rewards</span>
                      <span class="estimate-value"
                        >{{ monthlyRewards.toFixed(6) }}
                        {{ stakingStore.selectedToken.rewardTokenSymbol }}</span
                      >
                    </div>
                    <div class="estimate-row">
                      <span class="estimate-label">Yearly Rewards</span>
                      <span class="estimate-value"
                        >{{ yearlyRewards.toFixed(6) }}
                        {{ stakingStore.selectedToken.rewardTokenSymbol }}</span
                      >
                    </div>
                  </div>

                  <a-button
                    type="primary"
                    class="primary-btn w-full"
                    size="large"
                    :loading="stakingStore.isLoading"
                    @click="handleStake"
                    :disabled="!isStakeAmountValid || !stakingStore.selectedToken.isActive"
                  >
                    Stake {{ stakingStore.stakingAmount }} {{ stakingStore.selectedToken.symbol }}
                  </a-button>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane tab="Unstake" key="unstake">
              <div class="tab-content">
                <div v-if="stakingStore.tokenStakedAmount > 0" class="unstake-content">
                  <div class="staked-info mb-20">
                    <h4 class="mb-10">Your Stake</h4>
                    <div class="staked-amount">
                      {{ stakingStore.tokenStakedAmount.toFixed(4) }}
                      {{ stakingStore.selectedToken.symbol }}
                    </div>
                    <div class="staked-date">Staked since: {{ earliestStakeDate }}</div>
                  </div>

                  <div class="form-group mb-20">
                    <label class="form-label">Amount to Unstake</label>
                    <div class="input-group">
                      <a-input-number
                        v-model:value="stakingStore.withdrawAmount"
                        placeholder="Enter amount"
                        style="width: 100%"
                        :precision="6"
                        :step="0.001"
                        :max="stakingStore.tokenStakedAmount"
                        @change="validateWithdrawAmount"
                      />
                      <span class="input-suffix">{{ stakingStore.selectedToken.symbol }}</span>
                    </div>
                    <div class="amount-info mt-10">
                      <span class="available-balance"
                        >Staked: {{ stakingStore.tokenStakedAmount.toFixed(4) }}
                        {{ stakingStore.selectedToken.symbol }}</span
                      >
                      <a-button
                        type="text"
                        class="max-btn"
                        @click="
                          stakingStore.withdrawAmount = stakingStore.tokenStakedAmount.toString()
                        "
                      >
                        Max
                      </a-button>
                    </div>
                  </div>

                  <a-button
                    type="primary"
                    class="primary-btn w-full"
                    size="large"
                    :loading="stakingStore.isLoading"
                    @click="handleUnstake"
                    :disabled="!isWithdrawAmountValid"
                  >
                    Unstake {{ stakingStore.withdrawAmount }}
                    {{ stakingStore.selectedToken.symbol }}
                  </a-button>
                </div>

                <div v-else class="no-stake-content text-center p-30">
                  <div class="no-stake-icon mb-20">
                    <i class="anticon anticon-inbox" style="font-size: 48px"></i>
                  </div>
                  <h3 class="mb-10">No Staked Tokens</h3>
                  <p class="mb-20 text-secondary">
                    You don't have any staked {{ stakingStore.selectedToken.symbol }} tokens
                  </p>
                  <a-button type="primary" @click="stakingStore.activeTab = 'stake'">
                    Stake {{ stakingStore.selectedToken.symbol }}
                  </a-button>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane tab="Rewards" key="rewards">
              <div class="tab-content">
                <div class="rewards-info mb-20">
                  <h4 class="mb-10">Your Rewards</h4>
                  <div class="rewards-amount">
                    {{ stakingStore.tokenRewards.toFixed(4) }}
                    {{ stakingStore.selectedToken.rewardTokenSymbol }}
                  </div>
                  <div class="rewards-date">Next estimated reward: {{ nextRewardEstimate }}</div>
                </div>

                <div class="rewards-history mb-20">
                  <h5 class="mb-10">Rewards History</h5>
                  <a-table
                    :columns="rewardsColumns"
                    :data-source="stakingStore.rewardsHistory"
                    row-key="id"
                    :pagination="{ pageSize: 5 }"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.dataIndex === 'date'">
                        {{ new Date(record.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
                      </template>
                      <template v-else-if="column.dataIndex === 'amount'">
                        {{ record.amount.toFixed(4) }}
                      </template>
                      <template v-else-if="column.dataIndex === 'transactionHash'">
                        <div :title="record.transactionHash">
                          {{ record.transactionHash ? `${record.transactionHash.slice(0, 8)}...${record.transactionHash.slice(-6)}` : '-' }}
                        </div>
                      </template>
                      <template v-else-if="column.dataIndex === 'status'">
                        <span class="tag tag-success">Completed</span>
                      </template>
                    </template>
                  </a-table>
                </div>

                <a-button
                  type="primary"
                  class="primary-btn w-full"
                  size="large"
                  :loading="stakingStore.isLoading"
                  @click="handleClaimRewards"
                  :disabled="stakingStore.tokenRewards <= 0"
                >
                  Claim {{ stakingStore.tokenRewards.toFixed(4) }}
                  {{ stakingStore.selectedToken.rewardTokenSymbol }}
                </a-button>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </div>

      <!-- 未选择代币状态 -->
      <div v-else class="no-token-selected custom-card p-30 text-center">
        <div class="no-token-icon mb-20">
          <i class="anticon anticon-exclamation-circle" style="font-size: 48px"></i>
        </div>
        <h3 class="mb-10">No Token Selected</h3>
        <p class="mb-20 text-secondary">
          Please select a token from the list above to start staking
        </p>
      </div>
    </div>

    <!-- 消息提示改为程序式 API -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { useStakingStore } from '@/stores/stakingStore'
import { message } from 'ant-design-vue'
import { getStakedBalance } from '@/utils/contract'
import { formatEther } from 'ethers'

// 质押代币
const stakedBalance = ref('0')

// 状态
const isStakeAmountValid = ref(false)
const isWithdrawAmountValid = ref(false)

// 存储
const walletStore = useWalletStore()
const stakingStore = useStakingStore()

// ✅ 奖励历史直接使用 store 中的数据，无需本地定义

// 奖励表格列定义
const rewardsColumns = [
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    width: 150,
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    width: 150,
    render: (amount: number) => `${amount.toFixed(6)} ${stakingStore.selectedToken?.rewardTokenSymbol || ''}`,
  },
  {
    title: 'Transaction',
    dataIndex: 'transactionHash',
    key: 'transactionHash',
    width: 200,
    render: (hash: string | undefined) => hash ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : '-',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
]

// 计算属性 - 奖励估算
const dailyRewards = computed(() => {
  const amount = parseFloat(stakingStore.stakingAmount)
  if (isNaN(amount) || !stakingStore.selectedToken) return 0

  return (amount * (stakingStore.selectedToken.apy / 100)) / 365
})

const monthlyRewards = computed(() => dailyRewards.value * 30)
const yearlyRewards = computed(() => dailyRewards.value * 365)

// 计算属性 - 最早质押日期
const earliestStakeDate = computed(() => {
  const stakes = stakingStore.userStakesByToken
  if (!stakes || stakes.length === 0) return 'N/A'
  const timestamps = stakes.map((stake) => stake.timestamp)
  const earliest = Math.min(...timestamps)
  return new Date(earliest).toLocaleDateString()
})

// 计算属性 - 下次奖励估算
const nextRewardEstimate = computed(() => {
  const now = new Date()
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
  return nextHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

// 方法 - 选择代币
const handleTokenSelect = (tokenId: string) => {
  stakingStore.selectToken(tokenId)
}

// 方法 - 验证质押数量
const validateStakeAmount = (value: string) => {
  const amount = parseFloat(value || '0')
  const balance = parseFloat(stakedBalance.value)
  isStakeAmountValid.value = !isNaN(amount) && amount > 0 && amount <= balance
}

// 方法 - 验证提取数量
const validateWithdrawAmount = (value: string) => {
  const amount = parseFloat(value)

  isWithdrawAmountValid.value =
    !isNaN(amount) && amount > 0 && amount <= stakingStore.tokenStakedAmount
}

// 方法 - 处理质押
const handleStake = async () => {
  const success = await stakingStore.stake()
  if (success) {
    // 质押成功后刷新奖励计算
    stakingStore.calculateRewards()
  }
}

// 方法 - 处理提取
const handleUnstake = async () => {
  await stakingStore.unstake()
}

// 方法 - 处理领取奖励
const handleClaimRewards = async () => {
  await stakingStore.claimRewards()
}
// 监听钱包地址变化，更新质押余额
watch(
  () => walletStore.address,
  async (newVal) => {
    stakedBalance.value = formatEther(
      await getStakedBalance(newVal as string),
    )
  },
)

// 页面加载时计算奖励
onMounted(async () => {
  stakingStore.calculateRewards()
  // 初始化验证
  validateStakeAmount(stakingStore.stakingAmount)
  validateWithdrawAmount(stakingStore.withdrawAmount)
})

// 监听并通过程序式 API 提示
watch(
  () => stakingStore.successMessage,
  (val) => {
    if (val) {
      message.success(val)
      stakingStore.clearMessages()
    }
  },
)

watch(
  () => stakingStore.errorMessage,
  (val) => {
    if (val) {
      message.error(val)
      stakingStore.clearMessages()
    }
  },
)
</script>

<style lang="less" scoped>
.staking-container {
  padding: 20px 0;
}

.staking-header {
  .staking-title {
    font-size: 28px;
    font-weight: 600;
    color: @text-primary;
    margin-bottom: 8px;
  }

  .staking-subtitle {
    font-size: 16px;
    color: @text-secondary;
  }
}

.no-wallet-state,
.no-token-selected {
  max-width: 600px;
  margin: 50px auto;

  .no-wallet-icon,
  .no-token-icon {
    color: @text-tertiary;
  }
}

.tokens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.token-card {
  border: 1px solid @border-color;
  border-radius: @border-radius-base;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;

  &:hover {
    border-color: @primary-color;
    background-color: rgba(22, 93, 255, 0.03);
  }

  &.token-card-selected {
    border-color: @primary-color;
    background-color: rgba(22, 93, 255, 0.05);
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 20px 20px 0;
      border-color: transparent @primary-color transparent transparent;
    }

    &::before {
      content: '✓';
      position: absolute;
      top: 2px;
      right: 2px;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
  }

  &.token-card-disabled {
    opacity: 0.7;
    cursor: not-allowed;

    &:hover {
      border-color: @border-color;
      background-color: transparent;
    }
  }
}

.token-icon-container {
  margin-right: 12px;

  .token-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
}

.token-info {
  flex: 1;

  .token-name {
    font-weight: 500;
    margin-bottom: 4px;
    display: flex;
    align-items: center;

    .token-disabled-badge {
      margin-left: 8px;
      font-size: 12px;
      color: @text-tertiary;
      background-color: @hover-bg;
      padding: 2px 6px;
      border-radius: 4px;
    }
  }

  .token-symbol {
    font-size: 13px;
    color: @text-secondary;
  }
}

.token-apy {
  text-align: right;

  .apy-value {
    display: block;
    font-weight: 600;
    color: @success-color;
  }

  .apy-label {
    font-size: 12px;
    color: @text-secondary;
  }
}

.staking-actions {
  max-width: 800px;
  margin: 0 auto;
}

.staking-tabs {
  .ant-tabs-content {
    padding-top: 20px;
  }
}

.tab-content {
  .card-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
  }
}

.token-details {
  .token-details-header {
    display: flex;
    align-items: flex-start;
    border-bottom: 1px solid @border-color;
    padding-bottom: 16px;

    .detail-token-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      margin-right: 16px;
    }

    .detail-token-info {
      flex: 1;

      h4 {
        margin: 0 0 8px 0;
        font-size: 18px;
      }

      .token-description {
        color: @text-secondary;
        font-size: 14px;
        margin: 0;
      }
    }

    .detail-token-stats {
      display: flex;
      gap: 20px;

      .stat-item {
        text-align: right;

        .stat-label {
          font-size: 13px;
          color: @text-secondary;
          margin-bottom: 4px;
          display: block;
        }

        .stat-value {
          font-weight: 500;
        }
      }
    }
  }
}

.form-group {
  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .input-group {
    position: relative;

    .input-suffix {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: @text-secondary;
    }
  }

  .amount-info {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .available-balance {
      font-size: 13px;
      color: @text-secondary;
    }

    .max-btn {
      color: @primary-color;
      padding: 0;
      height: auto;
    }
  }
}

.rewards-estimate {
  background-color: rgba(22, 93, 255, 0.03);

  h5 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .estimate-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;

    &:not(:last-child) {
      border-bottom: 1px dashed @border-color;
    }

    .estimate-label {
      color: @text-secondary;
    }

    .estimate-value {
      font-weight: 500;
    }
  }
}

.staked-info {
  .staked-amount {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .staked-date {
    font-size: 13px;
    color: @text-secondary;
  }
}

.rewards-info {
  .rewards-amount {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
    color: @success-color;
  }

  .rewards-date {
    font-size: 13px;
    color: @text-secondary;
  }
}

.no-stake-content {
  .no-stake-icon {
    color: @text-tertiary;
  }
}

.message-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}
</style>
