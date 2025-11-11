<template>
  <div class="transactions-container">
    <div class="transactions-header mb-30">
      <h1 class="transactions-title">Transaction History</h1>
      <p class="transactions-subtitle">View all your staking activities and rewards</p>
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
      <p class="mb-20 text-secondary">Connect your wallet to view your transaction history</p>
      <a-button type="primary" @click="walletStore.connectWallet()">
        <i class="anticon anticon-link mr-2"></i>Connect Wallet
      </a-button>
    </div>

    <!-- 钱包已连接状态 -->
    <div v-else class="transactions-content">
      <!-- 过滤和搜索 -->
      <div class="transactions-filter mb-20">
        <div class="filter-group">
          <a-select v-model:value="filterType" placeholder="Transaction Type" style="width: 180px">
            <a-select-option value="all">All Types</a-select-option>
            <a-select-option value="stake">Stakes</a-select-option>
            <a-select-option value="withdraw">Withdrawals</a-select-option>
            <a-select-option value="reward">Rewards</a-select-option>
          </a-select>

          <a-select
            v-model:value="filterStatus"
            placeholder="Status"
            style="width: 180px; margin-left: 16px"
          >
            <a-select-option value="all">All Statuses</a-select-option>
            <a-select-option value="completed">Completed</a-select-option>
            <a-select-option value="pending">Pending</a-select-option>
            <a-select-option value="failed">Failed</a-select-option>
          </a-select>

          <a-range-picker
            v-model:value="dateRange"
            style="margin-left: 16px"
            @change="handleDateChange"
          />
        </div>

        <div class="search-group">
          <a-input
            v-model:value="searchQuery"
            placeholder="Search by token or transaction hash"
            style="width: 300px"
            @change="handleSearch"
          >
            <template #suffix>
              <i class="anticon anticon-search"></i>
            </template>
          </a-input>
        </div>
      </div>

      <!-- 交易记录表格 -->
      <a-card class="custom-card">
        <div v-if="filteredTransactions.length === 0" class="no-transactions">
          <div class="no-transactions-icon">
            <i class="anticon anticon-file-text" style="font-size: 48px"></i>
          </div>
          <h4 class="mt-10">No transactions found</h4>
          <p class="text-secondary mt-5">No transactions match your current filters</p>
          <a-button type="text" class="mt-10" @click="resetFilters"> Reset Filters </a-button>
        </div>

        <div v-else>
          <a-table
            :columns="columns"
            :data-source="filteredTransactions"
            row-key="id"
            :pagination="pagination"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'type'">
                <span class="transaction-type" :class="transactionTypeClass(record.type)">
                  <i :class="transactionTypeIcon(record.type)" class="mr-1"></i>
                  {{ transactionTypeText(record.type) }}
                </span>
              </template>
              <template v-if="column.dataIndex === 'amount'">
                {{ record.amount }} {{ record.token }}
              </template>
              <template v-if="column.dataIndex === 'date'">
                {{ formatDate(record.timestamp) }}
              </template>
              <template v-if="column.dataIndex === 'status'">
                <span class="tag" :class="transactionStatusClass(record.status)">
                  {{ record.status }}
                </span>
              </template>
              <template v-if="column.dataIndex === 'hash' && record.transactionHash">
                <a
                  :href="`https://etherscan.io/tx/${record.transactionHash}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hash-link"
                >
                  {{ formatHash(record.transactionHash) }}
                </a>
              </template>
            </template>
          </a-table>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/walletStore'

// 状态
const filterType = ref('all')
const filterStatus = ref('all')
type DateLike = { valueOf(): number }
type DateRangeValue = [DateLike, DateLike] | [] | null
const dateRange = ref<DateRangeValue>([])
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 存储
const walletStore = useWalletStore()

// 表格列定义
const columns = [
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    width: 120,
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    width: 150,
  },
  {
    title: 'Date & Time',
    dataIndex: 'date',
    key: 'date',
    width: 200,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Transaction Hash',
    dataIndex: 'hash',
    key: 'hash',
    ellipsis: true,
  },
]

// 分页配置
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: filteredTransactions.value.length,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `Total ${total} transactions`,
}))

// 过滤交易记录
const filteredTransactions = computed(() => {
  let filtered = [...walletStore.transactionHistory]

  // 按类型过滤
  if (filterType.value !== 'all') {
    filtered = filtered.filter((tx) => tx.type === filterType.value)
  }

  // 按状态过滤
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((tx) => tx.status === filterStatus.value)
  }

  // 按日期范围过滤
  if (dateRange.value && dateRange.value.length === 2) {
    const start = dateRange.value[0]!.valueOf()
    const end = dateRange.value[1]!.valueOf() + 24 * 60 * 60 * 1000 // 包含结束日期的全天
    filtered = filtered.filter((tx) => tx.timestamp >= start && tx.timestamp <= end)
  }

  // 按搜索查询过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (tx) =>
        tx.token.toLowerCase().includes(query) ||
        (tx.transactionHash && tx.transactionHash.toLowerCase().includes(query)),
    )
  }

  return filtered
})

// 方法 - 处理表格变化
type TablePagination = { current: number; pageSize: number }
const handleTableChange = (pg: TablePagination) => {
  currentPage.value = pg.current
  pageSize.value = pg.pageSize
}

// 方法 - 处理日期范围变化
const handleDateChange = (dates: DateRangeValue) => {
  dateRange.value = dates
  currentPage.value = 1 // 重置到第一页
}

// 方法 - 处理搜索
const handleSearch = () => {
  currentPage.value = 1 // 重置到第一页
}

// 方法 - 重置过滤器
const resetFilters = () => {
  filterType.value = 'all'
  filterStatus.value = 'all'
  dateRange.value = []
  searchQuery.value = ''
  currentPage.value = 1
}

// 方法 - 格式化日期
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 方法 - 格式化哈希
const formatHash = (hash: string) => {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

// 方法 - 交易类型文本
const transactionTypeText = (type: string) => {
  switch (type) {
    case 'stake':
      return 'Stake'
    case 'withdraw':
      return 'Withdrawal'
    case 'reward':
      return 'Reward'
    default:
      return type
  }
}

// 方法 - 交易类型图标
const transactionTypeIcon = (type: string) => {
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

// 方法 - 交易类型样式
const transactionTypeClass = (type: string) => {
  switch (type) {
    case 'stake':
      return 'type-stake'
    case 'withdraw':
      return 'type-withdraw'
    case 'reward':
      return 'type-reward'
    default:
      return ''
  }
}

// 方法 - 交易状态样式
const transactionStatusClass = (status: string) => {
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

// 监听交易历史变化，自动更新
watch(
  () => walletStore.transactionHistory.length,
  () => {
    // 可以在这里添加一些更新逻辑
  },
)
</script>

<style lang="less" scoped>
.transactions-container {
  padding: 20px 0;
}

.transactions-header {
  .transactions-title {
    font-size: 28px;
    font-weight: 600;
    color: @text-primary;
    margin-bottom: 8px;
  }

  .transactions-subtitle {
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

.transactions-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .filter-group {
    display: flex;
    align-items: center;
  }

  .search-group {
    display: flex;
  }
}

.transaction-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;

  &.type-stake {
    background-color: rgba(82, 196, 26, 0.1);
    color: @success-color;
  }

  &.type-withdraw {
    background-color: rgba(255, 77, 79, 0.1);
    color: @error-color;
  }

  &.type-reward {
    background-color: rgba(22, 93, 255, 0.1);
    color: @primary-color;
  }
}

.tag-error {
  background-color: rgba(255, 77, 79, 0.1);
  color: @error-color;
}

.hash-link {
  color: @primary-color;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.no-transactions {
  text-align: center;
  padding: 60px 0;

  .no-transactions-icon {
    color: @text-tertiary;
    margin-bottom: 10px;
  }
}
</style>
