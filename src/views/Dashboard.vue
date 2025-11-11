<template>
  <div class="dashboard-container">
    <div class="dashboard-header mb-30">
      <h1 class="dashboard-title">Staking Dashboard</h1>
      <p class="dashboard-subtitle">Track your staking activities and rewards</p>
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
      <p class="mb-20 text-secondary">
        Connect your wallet to view your staking dashboard and start earning rewards
      </p>
      <a-button type="primary" @click="walletStore.connectWallet()">
        <i class="anticon anticon-link mr-2"></i>Connect Wallet
      </a-button>
    </div>

    <!-- 钱包已连接状态 -->
    <div v-else class="dashboard-content">
      <!-- 统计卡片 -->
      <div class="stats-grid mb-30">
        <a-card class="stat-card custom-card">
          <div class="stat-card-content">
            <div class="stat-label">Total Staked</div>
            <div class="stat-value">
              {{ userTotalStaked.toFixed(2) }} <span class="stat-token"> Tokens</span>
            </div>
            <div class="stat-change positive">
              <i class="anticon anticon-arrow-up"></i> 5.2% from last week
            </div>
          </div>
        </a-card>

        <a-card class="stat-card custom-card">
          <div class="stat-card-content">
            <div class="stat-label">Total Rewards</div>
            <div class="stat-value">
              {{ userTotalRewards.toFixed(4) }} <span class="stat-token"> REW</span>
            </div>
            <div class="stat-change positive">
              <i class="anticon anticon-arrow-up"></i> +2.45 REW today
            </div>
          </div>
        </a-card>

        <a-card class="stat-card custom-card">
          <div class="stat-card-content">
            <div class="stat-label">Active Stakes</div>
            <div class="stat-value">{{ activeStakesCount }}</div>
            <div class="stat-change neutral">
              <i class="anticon anticon-clock-circle"></i> Last updated: Just now
            </div>
          </div>
        </a-card>

        <a-card class="stat-card custom-card">
          <div class="stat-card-content">
            <div class="stat-label">Average APY</div>
            <div class="stat-value">{{ averageApy.toFixed(2) }}%</div>
            <div class="stat-change positive">
              <i class="anticon anticon-arrow-up"></i> 1.2% higher than market avg
            </div>
          </div>
        </a-card>
      </div>

      <!-- 图表和最近活动 -->
      <div class="dashboard-grid">
        <!-- 收益图表 -->
        <a-card class="custom-card dashboard-card">
          <div class="card-header">
            <h3>Earnings Overview</h3>
            <a-select v-model:value="chartTimeframe" style="width: 120px">
              <a-select-option value="7d">Last 7 days</a-select-option>
              <a-select-option value="30d">Last 30 days</a-select-option>
              <a-select-option value="90d">Last 90 days</a-select-option>
              <a-select-option value="1y">Last year</a-select-option>
            </a-select>
          </div>
          <div class="chart-container">
            <div class="chart-placeholder text-secondary">Chart unavailable in this build</div>
          </div>
        </a-card>

        <!-- 最近活动 -->
        <a-card class="custom-card dashboard-card">
          <div class="card-header">
            <h3>Recent Activity</h3>
            <router-link to="/transactions" class="view-all-link">View all</router-link>
          </div>
          <div class="activity-list">
            <div v-if="walletStore.transactionHistory.length === 0" class="no-activity">
              No recent staking activity
            </div>
            <div v-else>
              <div class="activity-item" v-for="item in recentTransactions" :key="item.id">
                <div class="activity-icon" :class="activityTypeClass(item.type)">
                  <i :class="activityTypeIcon(item.type)"></i>
                </div>
                <div class="activity-details">
                  <div class="activity-title">
                    {{ activityTypeText(item.type) }} {{ item.amount }} {{ item.token }}
                  </div>
                  <div class="activity-time">
                    {{ formatTime(item.timestamp) }}
                  </div>
                </div>
                <div class="activity-status">
                  <span class="tag" :class="activityStatusClass(item.status)">
                    {{ item.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a-card>
      </div>

      <!-- 我的质押 -->
      <a-card class="custom-card dashboard-card mt-30">
        <div class="card-header">
          <h3>My Stakes</h3>
          <router-link to="/staking" class="view-all-link">Manage Stakes</router-link>
        </div>
        <div v-if="stakingStore.userStakes.length === 0" class="no-stakes">
          <div class="no-stakes-icon">
            <i class="anticon anticon-inbox" style="font-size: 48px"></i>
          </div>
          <h4 class="mt-10">No active stakes</h4>
          <p class="text-secondary mt-5">Start staking to earn rewards</p>
          <a-button type="primary" class="mt-10" @click="$router.push('/staking')">
            <i class="anticon anticon-plus mr-2"></i>Stake Tokens
          </a-button>
        </div>
        <div v-else>
          <a-table
            :columns="stakesColumns"
            :data-source="stakingStore.userStakes"
            row-key="id"
            :pagination="{ pageSize: 5 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'token'">
                <div class="token-info">
                  <img :src="getTokenIcon(record.tokenId)" alt="Token icon" class="token-icon" />
                  <span>{{ getTokenSymbol(record.tokenId) }}</span>
                </div>
              </template>
              <template v-if="column.dataIndex === 'amount'">
                {{ record.amount.toFixed(4) }}
              </template>
              <template v-if="column.dataIndex === 'reward'">
                {{ record.reward.toFixed(4) }}
              </template>
              <template v-if="column.dataIndex === 'apy'">
                {{ getTokenApy(record.tokenId) }}%
              </template>
              <template v-if="column.dataIndex === 'actions'">
                <a-button size="small" type="text" @click="handleManageStake(record.tokenId)">
                  Manage
                </a-button>
              </template>
            </template>
          </a-table>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { useStakingStore } from '@/stores/stakingStore'

// 状态
const chartTimeframe = ref('30d')

// 存储
const walletStore = useWalletStore()
const stakingStore = useStakingStore()

// 计算属性
const userTotalStaked = computed(() => stakingStore.userTotalStaked)
const userTotalRewards = computed(() => stakingStore.userTotalRewards)
const activeStakesCount = computed(() => stakingStore.userStakes.length)
const recentTransactions = computed(() => {
  return [...walletStore.transactionHistory].slice(0, 5)
})

// 计算平均APY
const averageApy = computed(() => {
  if (stakingStore.userStakes.length === 0) return 0

  let totalApy = 0
  stakingStore.userStakes.forEach((stake) => {
    const token = stakingStore.stakingTokens.find((t) => t.id === stake.tokenId)
    if (token) {
      totalApy += token.apy
    }
  })

  return totalApy / stakingStore.userStakes.length
})

// Chart data removed with chart library

// 质押表格列定义
const stakesColumns = [
  {
    title: 'Token',
    dataIndex: 'token',
    key: 'token',
    width: 120,
  },
  {
    title: 'Staked Amount',
    dataIndex: 'amount',
    key: 'amount',
    width: 150,
  },
  {
    title: 'Rewards',
    dataIndex: 'reward',
    key: 'reward',
    width: 150,
  },
  {
    title: 'APY',
    dataIndex: 'apy',
    key: 'apy',
    width: 100,
  },
  {
    title: 'Staked On',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 180,
    render: (timestamp: number) => new Date(timestamp).toLocaleDateString(),
  },
  {
    title: 'Actions',
    dataIndex: 'actions',
    key: 'actions',
    width: 100,
  },
]

// 方法 - 获取代币图标
const getTokenIcon = (tokenId: string) => {
  const token = stakingStore.stakingTokens.find((t) => t.id === tokenId)
  return token?.icon || ''
}

// 方法 - 获取代币符号
const getTokenSymbol = (tokenId: string) => {
  const token = stakingStore.stakingTokens.find((t) => t.id === tokenId)
  return token?.symbol || 'Unknown'
}

// 方法 - 获取代币APY
const getTokenApy = (tokenId: string) => {
  const token = stakingStore.stakingTokens.find((t) => t.id === tokenId)
  return token?.apy || 0
}

// 方法 - 处理管理质押
const handleManageStake = (tokenId: string) => {
  stakingStore.selectToken(tokenId)
  stakingStore.activeTab = 'stake'
  window.location.href = '/staking'
}

// 方法 - 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// 方法 - 活动类型文本
const activityTypeText = (type: string) => {
  switch (type) {
    case 'stake':
      return 'Staked'
    case 'withdraw':
      return 'Withdrew'
    case 'reward':
      return 'Claimed'
    default:
      return 'Activity'
  }
}

// 方法 - 活动类型图标
const activityTypeIcon = (type: string) => {
  switch (type) {
    case 'stake':
      return 'anticon anticon-arrow-down'
    case 'withdraw':
      return 'anticon anticon-arrow-up'
    case 'reward':
      return 'anticon anticon-gift'
    default:
      return 'anticon anticon-exclamation-circle'
  }
}

// 方法 - 活动类型样式
const activityTypeClass = (type: string) => {
  switch (type) {
    case 'stake':
      return 'activity-icon-stake'
    case 'withdraw':
      return 'activity-icon-withdraw'
    case 'reward':
      return 'activity-icon-reward'
    default:
      return 'activity-icon-default'
  }
}

// 方法 - 活动状态样式
const activityStatusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'tag-success'
    case 'pending':
      return 'tag-warning'
    case 'failed':
      return 'tag-error'
    default:
      return ''
  }
}

// 页面加载时计算奖励
onMounted(() => {
  stakingStore.calculateRewards()
})
</script>

<style lang="less" scoped>
.dashboard-container {
  padding: 20px 0;
}

.dashboard-header {
  .dashboard-title {
    font-size: 28px;
    font-weight: 600;
    color: @text-primary;
    margin-bottom: 8px;
  }

  .dashboard-subtitle {
    font-size: 16px;
    color: @text-secondary;
  }
}

.no-wallet-state {
  max-width: 600px;
  margin: 50px auto;

  .no-wallet-icon {
    color: @text-tertiary;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  .stat-card-content {
    padding: 20px;

    .stat-label {
      font-size: 14px;
      color: @text-secondary;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;

      .stat-token {
        font-size: 16px;
        color: @text-secondary;
        font-weight: 400;
      }
    }

    .stat-change {
      font-size: 13px;
      display: flex;
      align-items: center;

      &.positive {
        color: @success-color;
      }

      &.negative {
        color: @error-color;
      }

      &.neutral {
        color: @text-secondary;
      }

      i {
        margin-right: 4px;
        font-size: 12px;
      }
    }
  }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.dashboard-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid @border-color;

    h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .view-all-link {
      color: @primary-color;
      font-size: 14px;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.chart-container {
  height: 300px;
  width: 100%;
}

.activity-list {
  .activity-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid @border-color;

    &:last-child {
      border-bottom: none;
    }
  }

  .activity-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    color: white;

    &.activity-icon-stake {
      background-color: @success-color;
    }

    &.activity-icon-withdraw {
      background-color: @error-color;
    }

    &.activity-icon-reward {
      background-color: @primary-color;
    }

    &.activity-icon-default {
      background-color: @text-tertiary;
    }
  }

  .activity-details {
    flex: 1;

    .activity-title {
      font-size: 14px;
      font-weight: 500;
    }

    .activity-time {
      font-size: 12px;
      color: @text-tertiary;
      margin-top: 2px;
    }
  }

  .activity-status {
    display: flex;
    align-items: center;
  }

  .no-activity {
    text-align: center;
    padding: 30px 0;
    color: @text-tertiary;
    font-size: 14px;
  }
}

.no-stakes {
  text-align: center;
  padding: 40px 0;

  .no-stakes-icon {
    color: @text-tertiary;
    margin-bottom: 10px;
  }
}

.token-info {
  display: flex;
  align-items: center;

  .token-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin-right: 8px;
  }
}

.tag-error {
  background-color: rgba(255, 77, 79, 0.1);
  color: @error-color;
}
</style>
