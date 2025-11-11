<template>
  <div class="wallet-actions">
    <!-- 未连接状态 -->
    <a-button v-if="!walletStore.connected" type="primary" @click="walletStore.connectWallet()">
      <i class="anticon anticon-wallet mr-2"></i>Connect Wallet
    </a-button>

    <!-- 已连接状态 -->
    <div v-else class="connected-wallet">
      <div class="wallet-balance">{{ walletStore.balance }} ETH</div>

      <div
        class="wallet-menu-trigger"
        @click="showWalletMenu = !showWalletMenu"
        ref="walletTriggerRef"
      >
        <div class="wallet-address">
          {{ walletStore.formattedAddress }}
        </div>
        <i class="anticon anticon-down" :class="{ rotate: showWalletMenu }"></i>
      </div>

      <!-- 钱包下拉菜单 -->
      <div class="wallet-menu" v-if="showWalletMenu" ref="walletMenuRef">
        <div class="wallet-menu-item">
          <i class="anticon anticon-idcard mr-2"></i>
          <span>Copy Address</span>
          <i class="anticon anticon-copy" @click.stop="copyAddress"></i>
        </div>

        <div class="wallet-menu-divider"></div>

        <div class="wallet-menu-item">
          <i class="anticon anticon-link mr-2"></i>
          <span>View on Explorer</span>
        </div>

        <div class="wallet-menu-item">
          <i class="anticon anticon-exchange mr-2"></i>
          <span>Switch Network</span>
        </div>

        <div class="wallet-menu-divider"></div>

        <div class="wallet-menu-item danger" @click="disconnectWallet">
          <i class="anticon anticon-poweroff mr-2"></i>
          <span>Disconnect</span>
        </div>
      </div>
    </div>
    <!-- 复制成功提示 -->
    <a-tooltip
      v-if="showCopyTooltip"
      title="Copied!"
      placement="bottom"
      :open="showCopyTooltip"
      @close="showCopyTooltip = false"
    >
      <span></span>
    </a-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useWalletStore } from '@/stores/walletStore'
import { message } from 'ant-design-vue'

// 状态
const showWalletMenu = ref(false)
const showCopyTooltip = ref(false)
const walletMenuRef = ref<HTMLElement | null>(null)
const walletTriggerRef = ref<HTMLElement | null>(null)

// 存储
const walletStore = useWalletStore()

// 方法 - 复制地址
const copyAddress = () => {
  if (walletStore.address) {
    navigator.clipboard
      .writeText(walletStore.address)
      .then(() => {
        showCopyTooltip.value = true
        setTimeout(() => {
          showCopyTooltip.value = false
        }, 2000)
      })
      .catch((err) => {
        console.error('Could not copy address: ', err)
        message.error('Failed to copy address')
      })
  }
}

// 方法 - 断开钱包连接
const disconnectWallet = () => {
  walletStore.disconnectWallet()
  showWalletMenu.value = false
  message.success('Wallet disconnected')
}

// 点击外部关闭菜单
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  const clickedInsideMenu = walletMenuRef.value?.contains(target) ?? false
  const clickedOnTrigger = walletTriggerRef.value?.contains(target) ?? false
  if (!clickedInsideMenu && !clickedOnTrigger) {
    showWalletMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style lang="less" scoped>
.wallet-actions {
  .connected-wallet {
    display: flex;
    align-items: center;
    position: relative;

    .wallet-balance {
      margin-right: 16px;
      font-weight: 500;
    }

    .wallet-menu-trigger {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: @border-radius-base;
      background-color: @hover-bg;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: #e5e6eb;
      }

      .wallet-address {
        font-weight: 500;
        margin-right: 8px;
      }

      .rotate {
        transform: rotate(180deg);
        transition: transform 0.2s ease;
      }
    }

    .wallet-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      width: 220px;
      background-color: white;
      border-radius: @border-radius-base;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      z-index: 100;
      overflow: hidden;

      .wallet-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: @hover-bg;
        }

        &.danger {
          color: @error-color;

          &:hover {
            background-color: rgba(255, 77, 79, 0.05);
          }
        }

        i.anticon-copy {
          color: @text-secondary;
          cursor: pointer;

          &:hover {
            color: @primary-color;
          }
        }
      }

      .wallet-menu-divider {
        height: 1px;
        background-color: @border-color;
      }
    }
  }
}
</style>
