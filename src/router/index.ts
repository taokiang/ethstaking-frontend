import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

import Dashboard from '@/views/Dashboard.vue'
import Staking from '@/views/Staking.vue'
import Transactions from '@/views/Transactions.vue'
import Home from '@/views/Home.vue'
import Admin from '@/views/Admin.vue'
import { useWalletStore } from '@/stores/walletStore'
import { getStakingOwner } from '@/utils/contract'

const routes: RouteRecordRaw[] = [
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Home | StakeRewards',
    },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard | StakeRewards',
    },
  },
  {
    path: '/staking',
    name: 'Staking',
    component: Staking,
    meta: {
      title: 'Staking | StakeRewards',
    },
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: Transactions,
    meta: {
      title: 'Transactions | StakeRewards',
    },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: {
      title: 'Admin | StakeRewards',
      requiresOwner: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
const router = createRouter({
  history: createWebHashHistory(import.meta.env.VITE_BASE_URL),
  routes,
  scrollBehavior() {
    // 始终滚动到顶部
    return { top: 0 }
  },
})

// 设置页面标题 + owner 路由守卫（阻止非 owner 访问需要 owner 的路由）
router.beforeEach(async (to) => {
  document.title = (to.meta.title as string) || 'StakeRewards'

  // 如果路由不需要 owner，可以直接放行
  if (!to.meta.requiresOwner) return true

  try {
    const walletStore = useWalletStore()
    // 必须已连接且有地址
    if (!walletStore.connected || !walletStore.address) {
      // 未连接，重定向到首页
      return { path: '/' }
    }

    const owner = await getStakingOwner()
    console.log('[Router Guard] Staking owner address:', owner)
    if (!owner) return { path: '/' }

    const isOwner = owner.toLowerCase() === walletStore.address.toLowerCase()
    if (!isOwner) {
      return { path: '/' }
    }

    return true
  } catch (err) {
    console.error('[Router Guard] owner check failed:', err)
    return { path: '/' }
  }
})

export default router
