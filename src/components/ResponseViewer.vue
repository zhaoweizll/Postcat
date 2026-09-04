<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { Copy, Check, Eye, EyeOff } from 'lucide-vue-next'

const store = useAppStore()

const activeTab = ref<'headers' | 'body'>('body')
const copied = ref(false)
const showRaw = ref(false)

const formattedBody = computed(() => {
  if (!store.response?.body) return ''
  try {
    return JSON.stringify(JSON.parse(store.response.body), null, 2)
  } catch {
    return store.response.body
  }
})

const bodySizeKb = computed(() => {
  if (!store.response?.body) return '0.00'
  const bytes = new TextEncoder().encode(store.response.body).length
  return (bytes / 1024).toFixed(2)
})

async function copyBody() {
  if (store.response?.body) {
    await navigator.clipboard.writeText(store.response.body)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function getStatusBgColor(status: number) {
  if (status >= 200 && status < 300) return 'bg-green-500'
  if (status >= 300 && status < 400) return 'bg-yellow-500'
  if (status >= 400 && status < 500) return 'bg-orange-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="flex-1 flex flex-col bg-[#0d1117] border-l border-[#2d3548]">
    <div v-if="store.response" class="flex items-center justify-between px-4 py-3 border-b border-[#2d3548]">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span :class="['px-2 py-1 rounded text-xs font-bold', getStatusBgColor(store.response.status), 'text-white']">
            {{ store.response.status }}
          </span>
          <span class="text-gray-400 text-sm">{{ store.response.statusText }}</span>
        </div>
        
        <div class="text-gray-500 text-sm">
          <span class="text-gray-400">耗时:</span>
          <span class="text-white ml-1">{{ store.response.responseTime }}ms</span>
        </div>
        
        <div class="text-gray-500 text-sm">
          <span class="text-gray-400">大小:</span>
          <span class="text-white ml-1">{{ bodySizeKb }} KB</span>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          class="text-gray-400 hover:text-white px-2 py-1 transition-colors"
          @click="showRaw = !showRaw"
          title="显示原始格式"
        >
          <component :is="showRaw ? EyeOff : Eye" class="w-4 h-4" />
        </button>
        
        <button 
          class="text-gray-400 hover:text-white px-2 py-1 transition-colors flex items-center gap-1"
          @click="copyBody"
        >
          <component :is="copied ? Check : Copy" class="w-4 h-4" />
          <span class="text-sm">{{ copied ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
    
    <div v-else class="flex items-center justify-center h-full text-gray-600">
      <div class="text-center">
        <div class="text-4xl mb-2">🚀</div>
        <div class="text-sm">发送请求后查看响应</div>
      </div>
    </div>

    <div v-if="store.response" class="flex border-b border-[#2d3548]">
      <button 
        v-for="tab in ['headers', 'body'] as const"
        :key="tab"
        class="px-4 py-2 text-sm font-medium transition-colors uppercase"
        :class="activeTab === tab ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'"
        @click="activeTab = tab"
      >
        {{ tab === 'headers' ? 'Headers' : 'Body' }}
      </button>
    </div>

    <div v-if="store.response" class="flex-1 overflow-y-auto p-4">
      <div v-if="activeTab === 'headers'" class="space-y-1">
        <div 
          v-for="(value, key) in store.response.headers" 
          :key="key"
          class="flex items-center gap-2 bg-[#161b22] rounded px-3 py-2"
        >
          <span class="text-blue-400 text-sm font-medium w-1/4 truncate">{{ key }}</span>
          <span class="text-gray-400 text-sm flex-1 truncate">{{ value }}</span>
        </div>
        
        <div v-if="!Object.keys(store.response.headers).length" class="text-gray-600 text-sm text-center py-8">
          无响应头
        </div>
      </div>

      <div v-if="activeTab === 'body'" class="font-mono text-sm">
        <pre 
          class="text-gray-300 whitespace-pre-wrap break-all"
          :class="showRaw ? 'text-gray-500' : ''"
        >
          {{ showRaw ? store.response.body : formattedBody || '(空响应体)' }}
        </pre>
      </div>
    </div>
  </div>
</template>
