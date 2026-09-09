<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTabsStore } from '@/stores/tabs'
import {
  ChevronRight, ChevronDown, Folder, Clock, Globe,
  Plus, Trash2, Play, Save, Settings, Upload, Download,
  MoreVertical, Pencil, Search, X
} from 'lucide-vue-next'

const store = useAppStore()
const tabsStore = useTabsStore()

const expandedSections = ref({
  environments: true,
  collections: true,
  history: true
})

const showEnvModal = ref(false)
const showCollectionModal = ref(false)
const editingEnv = ref<{ id: string; name: string; variables: Record<string, string> } | null>(null)
const newEnvName = ref('')
const newCollectionName = ref('')
const savingToCollectionId = ref<string | null>(null)
const saveRequestName = ref('')
const newVarKey = ref('')
const newVarValue = ref('')
const editingRequest = ref<{ collectionId: string; requestId: string; name: string } | null>(null)
const editingRequestName = ref('')
const editingVarIndex = ref<number | null>(null)
const editingVarKey = ref('')
const editingVarValue = ref('')

const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const hasAnyRequests = computed(() => store.collections.some((collection) => collection.requests.length > 0))

const filteredCollections = computed(() => {
  const q = searchQuery.value.trim().slice(0, 100).toLowerCase()
  if (!q) {
    return store.collections.map((collection) => ({ collection, requests: collection.requests }))
  }
  const result: {
    collection: (typeof store.collections)[number]
    requests: (typeof store.collections)[number]['requests']
  }[] = []
  for (const collection of store.collections) {
    const requests = collection.requests.filter((request) =>
      request.name.toLowerCase().includes(q) || request.url.toLowerCase().includes(q)
    )
    if (requests.length > 0) {
      result.push({ collection, requests })
    }
  }
  return result
})

watch(isSearchOpen, async (open) => {
  if (open) {
    await nextTick()
    searchInputRef.value?.focus()
  }
})

function toggleSearch() {
  if (isSearchOpen.value) {
    isSearchOpen.value = false
    searchQuery.value = ''
  } else {
    isSearchOpen.value = true
  }
}

function closeSearch() {
  isSearchOpen.value = false
  searchQuery.value = ''
}

function clearSearch() {
  searchQuery.value = ''
}

function toggleSection(section: 'environments' | 'collections' | 'history') {
  expandedSections.value[section] = !expandedSections.value[section]
}

function openEnvModal() {
  editingEnv.value = null
  newEnvName.value = ''
  showEnvModal.value = true
}

function openEditEnvModal(env: typeof store.environments[0]) {
  editingEnv.value = JSON.parse(JSON.stringify(env))
  newEnvName.value = ''
  showEnvModal.value = true
}

function saveEnvironment() {
  if (editingEnv.value) {
    store.updateEnvironment(editingEnv.value.id, editingEnv.value.name, editingEnv.value.variables)
  } else if (newEnvName.value.trim()) {
    store.addEnvironment(newEnvName.value.trim())
  }
  showEnvModal.value = false
}

function addVarToEnv() {
  if (editingEnv.value && newVarKey.value.trim()) {
    const key = newVarKey.value.trim()
    if (Object.prototype.hasOwnProperty.call(editingEnv.value.variables, key)) {
      return
    }
    editingEnv.value.variables[key] = newVarValue.value
    newVarKey.value = ''
    newVarValue.value = ''
  }
}

function startEditVar(index: number, key: string, value: string) {
  editingVarIndex.value = index
  editingVarKey.value = key
  editingVarValue.value = value
}

function saveVarEdit() {
  if (editingEnv.value && editingVarIndex.value !== null) {
    const entries = Object.entries(editingEnv.value.variables)
    const newKey = editingVarKey.value.trim()
    if (!newKey) return
    
    const newVariables: Record<string, string> = {}
    for (let i = 0; i < entries.length; i++) {
      if (i === editingVarIndex.value) {
        newVariables[newKey] = editingVarValue.value
      } else {
        const [k, v] = entries[i]
        if (k === newKey) return
        newVariables[k] = v
      }
    }
    editingEnv.value.variables = newVariables
    editingVarIndex.value = null
    editingVarKey.value = ''
    editingVarValue.value = ''
  }
}

function cancelVarEdit() {
  editingVarIndex.value = null
  editingVarKey.value = ''
  editingVarValue.value = ''
}

function removeVarFromEnv(key: string) {
  if (editingEnv.value) {
    const newVars: Record<string, string> = {}
    for (const [k, v] of Object.entries(editingEnv.value.variables)) {
      if (k !== key) {
        newVars[k] = v
      }
    }
    editingEnv.value.variables = newVars
  }
}

function openCollectionModal() {
  newCollectionName.value = ''
  showCollectionModal.value = true
}

function saveCollection() {
  if (newCollectionName.value.trim()) {
    store.addCollection(newCollectionName.value.trim())
  }
  showCollectionModal.value = false
}

function openSaveModal(collectionId: string) {
  savingToCollectionId.value = collectionId
  saveRequestName.value = ''
}

function saveCurrentRequest() {
  const tab = tabsStore.activeTab
  if (savingToCollectionId.value && saveRequestName.value.trim() && tab) {
    store.addRequestToCollection(savingToCollectionId.value, {
      name: saveRequestName.value.trim(),
      method: tab.method,
      url: tab.url,
      headers: { ...tab.headers },
      body: tab.body || null,
      queryParams: { ...tab.queryParams },
      bodyType: tab.bodyType
    })
    savingToCollectionId.value = null
    saveRequestName.value = ''
  }
}

function openEditRequest(collectionId: string, requestId: string, name: string) {
  editingRequest.value = { collectionId, requestId, name }
  editingRequestName.value = name
}

function saveRequestEdit() {
  if (editingRequest.value && editingRequestName.value.trim()) {
    store.updateRequestInCollection(
      editingRequest.value.collectionId,
      editingRequest.value.requestId,
      { name: editingRequestName.value.trim() }
    )
    editingRequest.value = null
    editingRequestName.value = ''
  }
}

async function updateRequestContent(collectionId: string, requestId: string) {
  const tab = tabsStore.activeTab
  if (!tab) return
  await store.updateRequestInCollection(collectionId, requestId, {
    method: tab.method,
    url: tab.url,
    headers: { ...tab.headers },
    body: tab.body || null,
    queryParams: { ...tab.queryParams },
    bodyType: tab.bodyType
  })
}

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

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const importFileRef = ref<HTMLInputElement | null>(null)

function triggerImport() {
  importFileRef.value?.click()
}

async function handleImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    await store.importPostmanCollectionFromJson(text)
  } catch (err) {
    alert('导入失败: ' + String(err))
  } finally {
    input.value = ''
  }
}

async function exportCollection(col: { id: string; name: string; requests: unknown[] }) {
  try {
    const jsonStr = await store.exportCollectionToJsonFile(col.id)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${col.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    alert('导出失败: ' + String(err))
  }
}

// 请求项的三点菜单（折叠 "更新当前请求" / "重命名" / "删除"）
const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: 0, left: 0 })

function toggleReqMenu(collectionId: string, requestId: string, event: MouseEvent) {
  const key = `${collectionId}::${requestId}`
  if (openMenuId.value === key) {
    openMenuId.value = null
    return
  }
  openMenuId.value = key
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  // 菜单宽度 144px，向下偏移 4px
  menuPosition.value = {
    top: rect.bottom + 4,
    left: Math.max(4, rect.right - 144)
  }
}

function closeReqMenu() {
  openMenuId.value = null
}

function isMenuOpen(collectionId: string, requestId: string) {
  return openMenuId.value === `${collectionId}::${requestId}`
}

async function menuUpdateRequest(collectionId: string, requestId: string) {
  closeReqMenu()
  await updateRequestContent(collectionId, requestId)
}

function menuRenameRequest(collectionId: string, requestId: string, name: string) {
  closeReqMenu()
  openEditRequest(collectionId, requestId, name)
}

function menuDeleteRequest(collectionId: string, requestId: string) {
  closeReqMenu()
  store.removeRequestFromCollection(collectionId, requestId)
  const tab = tabsStore.tabs.find(t => t.requestId === requestId)
  if (tab) {
    tabsStore.closeTab(tab.id)
  }
}

function onDocClickClose(e: MouseEvent) {
  if (!openMenuId.value) return
  const target = e.target as HTMLElement
  if (target && !target.closest('.req-menu-trigger') && !target.closest('.req-menu-popover')) {
    openMenuId.value = null
  }
}

function onScrollClose() {
  if (openMenuId.value) openMenuId.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocClickClose)
  window.addEventListener('scroll', onScrollClose, true)
  window.addEventListener('resize', onScrollClose)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClickClose)
  window.removeEventListener('scroll', onScrollClose, true)
  window.removeEventListener('resize', onScrollClose)
})
</script>

<template>
  <div class="w-full bg-[#1a1f36] flex flex-col h-full">
    <div class="p-4 border-b border-[#2d3548]">
      <h1 class="text-xl font-bold text-white flex items-center gap-2">
        <Globe class="w-6 h-6 text-blue-500" />
        Postcat
      </h1>
    </div>
    
    <div class="flex-1 overflow-y-auto p-2">
      <div class="mb-4">
        <div 
          class="flex items-center gap-2 px-2 py-2 text-gray-300 hover:bg-[#2d3548] rounded cursor-pointer"
          @click="toggleSection('environments')"
        >
          <component 
            :is="expandedSections.environments ? ChevronDown : ChevronRight" 
            class="w-4 h-4"
          />
          <Settings class="w-4 h-4" />
          <span class="text-sm">环境</span>
          <button 
            class="ml-auto p-1 hover:bg-blue-500 rounded"
            @click.stop="openEnvModal"
          >
            <Plus class="w-4 h-4 text-blue-400" />
          </button>
        </div>
        
        <div v-if="expandedSections.environments" class="ml-4 space-y-1">
          <div 
            v-for="env in store.environments" 
            :key="env.id"
            class="flex items-center gap-2 px-2 py-2 rounded cursor-pointer group"
            :class="store.currentEnvironmentId === env.id ? 'bg-[#2d3548] text-blue-400' : 'text-gray-400 hover:bg-[#252a3a]'"
            @click="store.currentEnvironmentId = env.id"
          >
            <Globe class="w-4 h-4" />
            <span class="text-sm flex-1 truncate">{{ env.name }}</span>
            <button 
              class="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-500 rounded"
              @click.stop="openEditEnvModal(env)"
              title="编辑环境"
            >
              <Settings class="w-3 h-3" />
            </button>
            <button 
              class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded"
              @click.stop="store.removeEnvironment(env.id)"
            >
              <Trash2 class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <div 
          class="flex items-center gap-2 px-2 py-2 text-gray-300 hover:bg-[#2d3548] rounded cursor-pointer"
          @click="toggleSection('collections')"
        >
          <component 
            :is="expandedSections.collections ? ChevronDown : ChevronRight" 
            class="w-4 h-4"
          />
          <Folder class="w-4 h-4" />
          <span class="text-sm">集合</span>
          <div class="ml-auto flex items-center gap-1">
            <button 
              v-if="hasAnyRequests"
              class="p-1 hover:bg-purple-500 rounded"
              @click.stop="toggleSearch"
              :title="isSearchOpen ? '关闭搜索' : '搜索请求'"
            >
              <Search class="w-4 h-4 text-purple-400" />
            </button>
            <button 
              class="p-1 hover:bg-green-500 rounded"
              @click.stop="triggerImport"
              title="导入 Postman 集合"
            >
              <Upload class="w-4 h-4 text-green-400" />
            </button>
            <button 
              class="p-1 hover:bg-blue-500 rounded"
              @click.stop="openCollectionModal"
              title="新建集合"
            >
              <Plus class="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
        
        <input 
          ref="importFileRef"
          type="file" 
          accept=".json,application/json"
          class="hidden"
          @change="handleImportFile"
        />
        
        <div v-if="isSearchOpen" class="ml-2 mt-2 flex items-center gap-2 bg-[#252a3a] border border-[#2d3548] rounded px-2 py-1">
          <Search class="w-3 h-3 text-gray-400 shrink-0" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="搜索接口名或 URL"
            class="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            @keyup.esc="closeSearch"
          />
          <button
            class="p-0.5 hover:bg-gray-500 rounded shrink-0"
            @click="clearSearch"
            title="清空"
          >
            <X class="w-3 h-3 text-gray-400" />
          </button>
        </div>
        
        <div v-if="expandedSections.collections" class="ml-4 space-y-1">
          <div 
            v-for="item in filteredCollections" 
            :key="item.collection.id"
            class="border-l-2 border-transparent hover:border-blue-500"
          >
            <div class="flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:bg-[#252a3a] rounded cursor-pointer">
              <Folder class="w-4 h-4" />
              <span class="text-sm flex-1 truncate">{{ item.collection.name }}</span>
              <button 
                class="p-1 hover:bg-blue-500 rounded"
                @click.stop="exportCollection(item.collection)"
                title="导出 JSON"
              >
                <Download class="w-3 h-3 text-blue-400" />
              </button>
              <button 
                class="p-1 hover:bg-red-500 rounded"
                @click.stop="store.removeCollection(item.collection.id)"
                title="删除集合"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
            
            <div v-if="item.requests.length" class="ml-6 space-y-0.5">
              <div
                v-for="req in item.requests"
                :key="req.id"
                class="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 hover:bg-[#252a3a] rounded cursor-pointer group"
                @click="tabsStore.openTab(req, item.collection.id)"
              >
                <Play class="w-3 h-3" />
                <span class="flex-1 truncate">{{ req.name }}</span>
                <span :class="['w-1.5 h-1.5 rounded-full', getMethodColor(req.method)]"></span>
                <div class="relative">
                  <button
                    class="req-menu-trigger opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#2d3548] rounded transition-opacity"
                    :class="{ '!opacity-100': isMenuOpen(item.collection.id, req.id) }"
                    @click.stop="toggleReqMenu(item.collection.id, req.id, $event)"
                    title="更多操作"
                  >
                    <MoreVertical class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              v-if="!isSearchOpen"
              class="ml-6 w-full flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-400 hover:bg-[#252a3a] rounded cursor-pointer"
              @click="openSaveModal(item.collection.id)"
            >
              <Plus class="w-3 h-3" />
              添加请求
            </button>
          </div>
          
          <div v-if="isSearchOpen && searchQuery.trim() && !filteredCollections.length" class="px-2 py-4 text-xs text-gray-600 text-center">
            未找到匹配的请求
          </div>
        </div>
      </div>

      <div>
        <div 
          class="flex items-center gap-2 px-2 py-2 text-gray-300 hover:bg-[#2d3548] rounded cursor-pointer"
          @click="toggleSection('history')"
        >
          <component 
            :is="expandedSections.history ? ChevronDown : ChevronRight" 
            class="w-4 h-4"
          />
          <Clock class="w-4 h-4" />
          <span class="text-sm">历史</span>
          <button 
            v-if="store.history.length"
            class="ml-auto p-1 hover:bg-red-500 rounded"
            @click.stop="store.clearHistoryData"
          >
            <Trash2 class="w-3 h-3 text-red-400" />
          </button>
        </div>
        
        <div v-if="expandedSections.history" class="ml-4 space-y-1">
          <div 
            v-for="item in store.history" 
            :key="item.id"
            class="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:bg-[#252a3a] rounded cursor-pointer"
            @click="tabsStore.openTab({ id: item.id, name: item.url, method: item.method, url: item.url, headers: {}, body: null, queryParams: {}, bodyType: null })"
          >
            <span :class="['px-1.5 py-0.5 rounded text-[10px] font-bold text-white', getMethodColor(item.method)]">
              {{ item.method }}
            </span>
            <span class="flex-1 truncate text-gray-400">{{ item.url }}</span>
            <span :class="item.status >= 200 && item.status < 300 ? 'text-green-400' : 'text-red-400'">
              {{ item.status }}
            </span>
            <span class="text-gray-600">{{ item.responseTime }}ms</span>
            <span class="text-gray-600">{{ formatTime(item.timestamp) }}</span>
          </div>
          
          <div v-if="!store.history.length" class="px-2 py-4 text-xs text-gray-600 text-center">
            暂无历史记录
          </div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="openMenuId"
      class="req-menu-popover fixed z-50 w-36 bg-[#1a1f36] border border-[#2d3548] rounded-md shadow-xl py-1"
      :style="{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }"
      @click.stop
    >
      <template v-for="col in store.collections" :key="col.id">
        <template v-for="req in col.requests" :key="req.id">
          <template v-if="isMenuOpen(col.id, req.id)">
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-[#252a3a] hover:text-white"
              @click="menuUpdateRequest(col.id, req.id)"
            >
              <Save class="w-3 h-3" />
              更新当前请求
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-[#252a3a] hover:text-white"
              @click="menuRenameRequest(col.id, req.id, req.name)"
            >
              <Pencil class="w-3 h-3" />
              重命名
            </button>
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-[#252a3a]"
              @click="menuDeleteRequest(col.id, req.id)"
            >
              <Trash2 class="w-3 h-3" />
              删除
            </button>
          </template>
        </template>
      </template>
    </div>

    <div v-if="showEnvModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[#1a1f36] border border-[#2d3548] rounded-lg p-4 w-96">
        <h3 class="text-white font-semibold mb-4">{{ editingEnv ? '编辑环境' : '新建环境' }}</h3>
        
        <input 
          :value="editingEnv ? editingEnv.name : newEnvName"
          @input="editingEnv ? (editingEnv.name = ($event.target as HTMLInputElement).value) : (newEnvName = ($event.target as HTMLInputElement).value)"
          type="text" 
          placeholder="环境名称"
          class="w-full bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm mb-4 focus:border-blue-500 focus:outline-none"
        />
        
        <div v-if="editingEnv" class="mb-4">
          <div class="text-gray-400 text-sm mb-2">变量（使用 <code class="text-blue-400">&#123;&#123;变量名&#125;&#125;</code> 在请求中引用）</div>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <template v-for="(value, key, index) in editingEnv.variables" :key="key">
              <div v-if="editingVarIndex === index" class="flex items-center gap-2">
                <input
                  v-model="editingVarKey"
                  type="text"
                  placeholder="变量名"
                  class="w-28 bg-[#252a3a] border border-blue-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                  @keyup.enter="saveVarEdit"
                  @keyup.esc="cancelVarEdit"
                />
                <input
                  v-model="editingVarValue"
                  type="text"
                  placeholder="变量值"
                  class="flex-1 bg-[#252a3a] border border-blue-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                  @keyup.enter="saveVarEdit"
                  @keyup.esc="cancelVarEdit"
                />
                <button 
                  class="p-1 hover:bg-green-500 rounded"
                  @click="saveVarEdit"
                  title="保存"
                >
                  <Save class="w-3 h-3" />
                </button>
                <button 
                  class="p-1 hover:bg-gray-500 rounded"
                  @click="cancelVarEdit"
                  title="取消"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
              <div v-else class="flex items-center gap-2 group">
                <span 
                  class="text-blue-400 text-sm w-28 truncate cursor-pointer hover:text-blue-300" 
                  :title="'点击编辑: ' + key"
                  @click="startEditVar(index, key, value)"
                >{{ key }}</span>
                <span 
                  class="flex-1 text-gray-300 text-sm truncate cursor-pointer hover:text-white"
                  :title="value"
                  @click="startEditVar(index, key, value)"
                >{{ value }}</span>
                <button 
                  class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded transition-opacity"
                  @click="removeVarFromEnv(key)"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </template>
            <div v-if="Object.keys(editingEnv.variables).length === 0" class="text-gray-600 text-xs text-center py-2">
              暂无变量，在下方添加
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <input
              v-model="newVarKey"
              type="text"
              placeholder="变量名"
              class="w-28 bg-[#252a3a] border border-[#2d3548] rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
              @keyup.enter="addVarToEnv"
            />
            <input
              v-model="newVarValue"
              type="text"
              placeholder="变量值"
              class="flex-1 bg-[#252a3a] border border-[#2d3548] rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
              @keyup.enter="addVarToEnv"
            />
            <button 
              class="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-1 text-sm transition-colors"
              @click="addVarToEnv"
            >
              <Plus class="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button 
            class="flex-1 bg-[#252a3a] text-gray-400 rounded px-3 py-2 text-sm hover:bg-[#2d3548]"
            @click="showEnvModal = false"
          >
            取消
          </button>
          <button 
            class="flex-1 bg-blue-500 text-white rounded px-3 py-2 text-sm hover:bg-blue-600"
            @click="saveEnvironment"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <div v-if="showCollectionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[#1a1f36] border border-[#2d3548] rounded-lg p-4 w-96">
        <h3 class="text-white font-semibold mb-4">新建集合</h3>
        
        <input 
          v-model="newCollectionName"
          type="text" 
          placeholder="集合名称"
          class="w-full bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm mb-4 focus:border-blue-500 focus:outline-none"
        />
        
        <div class="flex gap-2">
          <button 
            class="flex-1 bg-[#252a3a] text-gray-400 rounded px-3 py-2 text-sm hover:bg-[#2d3548]"
            @click="showCollectionModal = false"
          >
            取消
          </button>
          <button 
            class="flex-1 bg-blue-500 text-white rounded px-3 py-2 text-sm hover:bg-blue-600"
            @click="saveCollection"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <div v-if="savingToCollectionId" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[#1a1f36] border border-[#2d3548] rounded-lg p-4 w-96">
        <h3 class="text-white font-semibold mb-4">保存请求</h3>
        
        <input 
          v-model="saveRequestName"
          type="text" 
          placeholder="请求名称"
          class="w-full bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm mb-4 focus:border-blue-500 focus:outline-none"
        />
        
        <div class="flex gap-2">
          <button 
            class="flex-1 bg-[#252a3a] text-gray-400 rounded px-3 py-2 text-sm hover:bg-[#2d3548]"
            @click="savingToCollectionId = null"
          >
            取消
          </button>
          <button 
            class="flex-1 bg-blue-500 text-white rounded px-3 py-2 text-sm hover:bg-blue-600"
            @click="saveCurrentRequest"
          >
            <Save class="w-4 h-4 inline mr-1" />
            保存
          </button>
        </div>
      </div>
    </div>

    <div v-if="editingRequest" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[#1a1f36] border border-[#2d3548] rounded-lg p-4 w-96">
        <h3 class="text-white font-semibold mb-4">重命名请求</h3>
        
        <input 
          v-model="editingRequestName"
          type="text" 
          placeholder="请求名称"
          class="w-full bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm mb-4 focus:border-blue-500 focus:outline-none"
        />
        
        <div class="flex gap-2">
          <button 
            class="flex-1 bg-[#252a3a] text-gray-400 rounded px-3 py-2 text-sm hover:bg-[#2d3548]"
            @click="editingRequest = null"
          >
            取消
          </button>
          <button 
            class="flex-1 bg-blue-500 text-white rounded px-3 py-2 text-sm hover:bg-blue-600"
            @click="saveRequestEdit"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
