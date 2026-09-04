<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import Sidebar from '@/components/Sidebar.vue'
import RequestEditor from '@/components/RequestEditor.vue'
import ResponseViewer from '@/components/ResponseViewer.vue'

const store = useAppStore()

const containerRef = ref<HTMLElement | null>(null)
const requestPanelPx = ref(420)
const isDragging = ref(false)

// 左侧列表宽度（可拖动调整）
const sidebarWidth = ref(256)
const isSidebarDragging = ref(false)

function startDrag() {
  isDragging.value = true
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function onDrag(e: MouseEvent) {
  if (isSidebarDragging.value) {
    onSidebarDrag(e)
    return
  }
  if (!isDragging.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const y = e.clientY - rect.top
  const minHeight = 120
  const maxHeight = rect.height - minHeight
  if (y >= minHeight && y <= maxHeight) {
    requestPanelPx.value = y
  }
}

function stopDrag() {
  if (isDragging.value) {
    isDragging.value = false
  }
  if (isSidebarDragging.value) {
    isSidebarDragging.value = false
  }
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function startSidebarDrag() {
  isSidebarDragging.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onSidebarDrag(e: MouseEvent) {
  if (!isSidebarDragging.value) return
  const minWidth = 180
  const maxWidth = 560
  const x = e.clientX
  if (x >= minWidth && x <= maxWidth) {
    sidebarWidth.value = x
  }
}

onMounted(async () => {
  await store.loadEnvironments()
  await store.loadCollections()
  await store.loadHistory()
  window.addEventListener('mousemove', onSidebarDrag)
  window.addEventListener('mouseup', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onSidebarDrag)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div class="flex h-screen bg-[#0d1117] text-white overflow-hidden">
    <div
      class="flex-shrink-0 overflow-hidden"
      :style="{ width: `${sidebarWidth}px` }"
    >
      <Sidebar />
    </div>
    <div
      class="w-[1px] bg-[#2d3548] cursor-col-resize flex-shrink-0 relative group z-10 hover:bg-blue-500 transition-colors"
      :class="{ '!w-[3px] !bg-blue-500': isSidebarDragging }"
      @mousedown="startSidebarDrag"
    >
      <div class="absolute inset-y-0 inset-x-[-3px]"></div>
    </div>
    <div
      ref="containerRef"
      class="flex-1 flex flex-col relative min-h-0 min-w-0"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <div
        :style="{ height: `${requestPanelPx}px` }"
        class="overflow-hidden min-h-0 flex-shrink-0"
      >
        <RequestEditor />
      </div>
      <div
        class="h-[1px] bg-[#2d3548] cursor-row-resize flex items-center justify-center flex-shrink-0 group relative z-10"
        :class="{ '!h-[3px] !bg-blue-500': isDragging }"
        @mousedown="startDrag"
      >
        <div class="absolute inset-y-[-4px] inset-x-0"></div>
        <div
          class="w-16 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
          :class="isDragging ? 'bg-blue-400 opacity-100 scale-100' : 'bg-[#4a5568]'"
        ></div>
      </div>
      <div class="flex-1 overflow-hidden min-h-0">
        <ResponseViewer />
      </div>
    </div>
  </div>
</template>
