<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const collectionName = computed(() => {
  const name = store.currentRequestContext.collection?.name?.trim()
  return name || '未分组'
})

const requestName = computed(() => {
  const name = store.currentRequestContext.request?.name?.trim()
  return name || '未命名'
})
</script>

<template>
  <div class="flex items-center gap-2 px-4 py-2 bg-[#1a1f36] border-b border-[#2d3548] flex-shrink-0">
    <span class="text-sm text-gray-500 truncate">{{ collectionName }}</span>
    <span class="text-sm text-gray-600 flex-shrink-0">/</span>
    <span class="text-sm text-white font-medium truncate">{{ requestName }}</span>
  </div>
</template>