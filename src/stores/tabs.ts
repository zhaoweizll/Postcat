import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tab, RequestItem, HttpMethod, BodyType } from '@/types'

function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createTabFromRequest(item: RequestItem, collectionId?: string): Tab {
  return {
    id: generateTabId(),
    requestId: item.id,
    collectionId: collectionId ?? null,
    title: item.name || '未命名',
    method: (item.method as HttpMethod) || 'GET',
    url: item.url || '',
    headers: { ...item.headers },
    queryParams: { ...item.queryParams },
    body: item.body || '',
    bodyType: (item.bodyType as BodyType) || 'raw',
    rawType: 'JSON',
    isDirty: false
  }
}

function createBlankTab(): Tab {
  return {
    id: generateTabId(),
    requestId: null,
    collectionId: null,
    title: '未命名',
    method: 'GET',
    url: '',
    headers: {},
    queryParams: {},
    body: '',
    bodyType: 'raw',
    rawType: 'JSON',
    isDirty: false
  }
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<string | null>(null)
  const maxTabs = ref(20)

  const activeTab = computed<Tab | null>(() => {
    return tabs.value.find(t => t.id === activeTabId.value) ?? null
  })

  const tabCount = computed(() => tabs.value.length)

  const canAddTab = computed(() => tabs.value.length < maxTabs.value)

  function openTab(request: RequestItem, collectionId?: string) {
    const existing = tabs.value.find(t => t.requestId === request.id)
    if (existing) {
      activeTabId.value = existing.id
      return
    }
    if (!canAddTab.value) return
    const tab = createTabFromRequest(request, collectionId)
    tabs.value.push(tab)
    activeTabId.value = tab.id
  }

  function createNewBlankTab() {
    if (!canAddTab.value) return
    const tab = createBlankTab()
    tabs.value.push(tab)
    activeTabId.value = tab.id
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return

    tabs.value.splice(index, 1)

    if (activeTabId.value === tabId) {
      if (tabs.value.length === 0) {
        activeTabId.value = null
      } else {
        const nextIndex = Math.min(index, tabs.value.length - 1)
        activeTabId.value = tabs.value[nextIndex].id
      }
    }
  }

  function activateTab(tabId: string) {
    if (tabs.value.some(t => t.id === tabId)) {
      activeTabId.value = tabId
    }
  }

  function reorderTabs(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= tabs.value.length ||
      toIndex < 0 ||
      toIndex >= tabs.value.length ||
      fromIndex === toIndex
    ) {
      return
    }
    const [moved] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, moved)
  }

  function updateTabField<K extends keyof Tab>(field: K, value: Tab[K]) {
    const tab = activeTab.value
    if (tab) {
      ;(tab as Record<K, Tab[K]>)[field] = value
      if (field !== 'isDirty') {
        tab.isDirty = true
      }
    }
  }

  return {
    tabs,
    activeTabId,
    maxTabs,
    activeTab,
    tabCount,
    canAddTab,
    openTab,
    createNewBlankTab,
    closeTab,
    activateTab,
    reorderTabs,
    updateTabField
  }
})
