import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import Dashboard from '@/views/Dashboard.vue'
import Staking from '@/views/Staking.vue'
import Transactions from '@/views/Transactions.vue'
import Home from '@/views/Home.vue'

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
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes,
  scrollBehavior() {
    // 始终滚动到顶部
    return { top: 0 }
  },
})

// 设置页面标题
router.beforeEach((to) => {
  document.title = to.meta.title as string
})

export default router
