/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string
  readonly VITE_YOUR_PROJECT_ID: string
  readonly VITE_TOKEN1_ADDRESS: string
  readonly VITE_TOKEN2_ADDRESS: string
  readonly VITE_STAKING_REWARD_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}