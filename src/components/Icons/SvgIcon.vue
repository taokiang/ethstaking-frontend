<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  width: {
    type: [String, Number],
    default: 16,
  },
  height: {
    type: [String, Number],
    default: 16,
  },
  color: {
    type: String,
    default: 'currentColor',
  },
})

// SVG 图标类型
type SvgIconConfig = {
  viewBox: string
  content: string
}

// SVG 图标映射
const svgIcons: Record<string, SvgIconConfig> = {
  wallet: {
    viewBox: '0 0 20 20',
    content: `
          <path fill="currentColor" d="M13 11a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z"></path>
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M12.5 3A1.5 1.5 0 0 1 14 4.5H5.5V5H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.182A2.182 2.182 0 0 1 2 14.818V4.5c0 .16.026.276.074.36A.942.942 0 0 1 2 4.5C2 3.671 3.171 3 4 3h8.5ZM14 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
            clip-rule="evenodd"
          ></path>`,
  },
}

// 计算样式
const svgStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  color: props.color,
}))

// 获取 SVG 配置
const svgConfig = computed(() => {
  return svgIcons[props.type] || null
})
</script>

<template>
  <svg
    v-if="svgConfig"
    :width="width"
    :height="height"
    :viewBox="svgConfig.viewBox"
    :style="svgStyle"
    xmlns="http://www.w3.org/2000/svg"
    v-html="svgConfig.content"
  />
</template>
