<script setup lang="ts">
import { ref } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { useAppStore } from '@/stores/app'
import { Plus, X } from 'lucide-vue-next'

const tabsStore = useTabsStore()
const appStore = useAppStore()

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function getMethodColor(method: string) {
  const colors: Record<string, string> = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-yellow-500',
    DELETE: 'bg-red-500',
    PATCH: 'bg-orange-500',
    HEAD: 'bg-gray-500',
    OPTIONS: 'bg-purple-500'
  }
  return colors[method] || 'bg-gray-500'
}

function handleCreateTab() {
  if (!tabsStore.canAddTab) {
    appStore.error = '已达最大标签页数量'
    return
  }
  tabsStore.createNewBlankTab()
}

function handleCloseTab(tabId: string, event: MouseEvent) {
  event.stopPropagation()
  tabsStore.closeTab(tabId)
}

function handleActivateTab(tabId: string) {
  tabsStore.activateTab(tabId)
}

function handleDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

function handleDrop(toIndex: number, event: DragEvent) {
  event.preventDefault()
  if (dragIndex.value !== null && dragIndex.value !== toIndex) {
    tabsStore.reorderTabs(dragIndex.value, toIndex)
  }
  dragIndex.value = null
  dragOverIndex.value = null
}

function handleDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="flex items-center bg-[#111827] border-b border-[#2d3548] flex-shrink-0 overflow-x-auto">
    <div class="flex items-stretch h-full min-w-0">
      <div
        v-for="(tab, index) in tabsStore.tabs"
        :key="tab.id"
        class="group flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-[#2d3548] min-w-0 max-w-[180px] select-none transition-colors"
        :class="[
          tab.id === tabsStore.activeTabId
            ? 'bg-[#1a1f36] text-white border-t-2 border-t-blue-500'
            : 'text-gray-400 hover:bg-[#1a1f36]/60 border-t-2 border-t-transparent',
          dragOverIndex === index ? 'border-l-2 border-l-blue-400' : ''
        ]"
        draggable="true"
        @click="handleActivateTab(tab.id)"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @dragleave="handleDragEnd"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
      >
        <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', getMethodColor(tab.method)]"></span>
        <span class="text-xs truncate" :title="tab.title">{{ tab.title }}</span>
        <button
          class="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#2d3548] transition-opacity flex-shrink-0"
          @click="handleCloseTab(tab.id, $event)"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>

    <button
      class="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-white hover:bg-[#1a1f36]/60 transition-colors flex-shrink-0"
      @click="handleCreateTab"
      title="新建标签页"
    >
      <Plus class="w-4 h-4" />
    </button>
  </div>
</template>
