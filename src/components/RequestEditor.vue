<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTabsStore } from '@/stores/tabs'
import { Send, Plus, Trash2, RotateCcw } from 'lucide-vue-next'
import RequestTitleBar from '@/components/RequestTitleBar.vue'
import TabBar from '@/components/TabBar.vue'

const store = useAppStore()
const tabsStore = useTabsStore()

const activeSection = ref<'params' | 'headers' | 'body'>('params')
const newHeaderKey = ref('')
const newHeaderValue = ref('')
const newParamKey = ref('')
const newParamValue = ref('')

const activeTab = computed(() => tabsStore.activeTab)

function addHeader() {
  if (newHeaderKey.value.trim() && activeTab.value) {
    activeTab.value.headers[newHeaderKey.value.trim()] = newHeaderValue.value.trim()
    activeTab.value.isDirty = true
    newHeaderKey.value = ''
    newHeaderValue.value = ''
  }
}

function removeHeader(key: string) {
  if (activeTab.value) {
    delete activeTab.value.headers[key]
    activeTab.value.isDirty = true
  }
}

function addParam() {
  if (newParamKey.value.trim() && activeTab.value) {
    activeTab.value.queryParams[newParamKey.value.trim()] = newParamValue.value.trim()
    activeTab.value.isDirty = true
    newParamKey.value = ''
    newParamValue.value = ''
  }
}

function removeParam(key: string) {
  if (activeTab.value) {
    delete activeTab.value.queryParams[key]
    activeTab.value.isDirty = true
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-[#151a28]">
    <TabBar />

    <template v-if="activeTab">
      <RequestTitleBar />
      <div class="flex items-center gap-3 px-4 py-3 border-b border-[#2d3548] flex-shrink-0">
        <select 
          :value="activeTab.method"
          class="bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm font-bold focus:border-blue-500 focus:outline-none cursor-pointer"
          @change="tabsStore.updateTabField('method', ($event.target as HTMLSelectElement).value as import('@/types').HttpMethod)"
        >
          <option v-for="method in store.httpMethods" :key="method" :value="method">
            {{ method }}
          </option>
        </select>
        
        <select 
          v-model="store.currentEnvironmentId"
          class="bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-gray-300 text-sm focus:border-blue-500 focus:outline-none cursor-pointer min-w-[100px]"
        >
          <option :value="null">无环境</option>
          <option v-for="env in store.environments" :key="env.id" :value="env.id">
            {{ env.name }}
          </option>
        </select>
        
        <input 
          :value="activeTab.url"
          type="text"
          placeholder="输入URL... 可用 {{变量名}} 引用环境变量"
          class="flex-1 bg-[#252a3a] border border-[#2d3548] rounded px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          @input="tabsStore.updateTabField('url', ($event.target as HTMLInputElement).value)"
        />
        
        <button 
          class="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 flex items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!activeTab.url.trim() || store.isLoading"
          @click="store.sendRequest"
        >
          <Send class="w-4 h-4" />
          {{ store.isLoading ? '发送中...' : '发送' }}
        </button>
        
        <button 
          class="bg-[#252a3a] hover:bg-[#2d3548] text-gray-400 rounded px-3 py-2 transition-colors"
          @click="tabsStore.createNewBlankTab"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>

      <div v-if="store.currentEnvironment" class="px-4 py-1.5 bg-[#1a1f36] border-b border-[#2d3548] text-xs flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-gray-500">当前环境:</span>
          <span class="text-blue-400 font-medium">{{ store.currentEnvironment.name }}</span>
        </div>
        <div v-if="Object.keys(store.currentEnvironment.variables).length > 0" class="flex items-center gap-2 flex-wrap">
          <span class="text-gray-500">变量:</span>
          <span 
            v-for="(value, key) in store.currentEnvironment.variables" 
            :key="key"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#252a3a] rounded"
          >
            <span class="text-blue-400 font-mono">{{ key }}</span>
            <span class="text-gray-500">=</span>
            <span class="text-green-400 font-mono">{{ value || '(空)' }}</span>
          </span>
        </div>
        <span v-else class="text-gray-600">无变量</span>
        <template v-if="activeTab.url !== store.resolvedUrl">
          <span class="text-gray-600">→</span>
          <span class="text-gray-500">实际请求:</span>
          <span class="text-green-400 font-mono">{{ store.resolvedUrl }}</span>
        </template>
      </div>

      <div class="flex border-b border-[#2d3548] flex-shrink-0">
        <button 
          v-for="tab in ['params', 'headers', 'body'] as const"
          :key="tab"
          class="px-4 py-2 text-sm font-medium transition-colors uppercase"
          :class="activeSection === tab ? 'text-blue-400 border-b-2 border-blue-500 bg-[#1a1f36]' : 'text-gray-500 hover:text-gray-300'"
          @click="activeSection = tab"
        >
          {{ tab === 'params' ? '参数' : tab === 'headers' ? 'Headers' : 'Body' }}
        </button>
      </div>

      <div class="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div v-if="activeSection === 'params'" class="flex-1 overflow-y-auto p-4 space-y-2">
          <div class="flex items-center gap-2">
            <input 
              v-model="newParamKey"
              type="text"
              placeholder="键"
              class="flex-1 bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <input 
              v-model="newParamValue"
              type="text"
              placeholder="值"
              class="flex-1 bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <button 
              class="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-2 transition-colors"
              @click="addParam"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          
          <div v-if="activeTab && Object.keys(activeTab.queryParams).length" class="space-y-1">
            <div 
              v-for="(value, key) in activeTab.queryParams" 
              :key="key"
              class="flex items-center gap-2 bg-[#252a3a] rounded px-3 py-2"
            >
              <span class="text-blue-400 text-sm font-medium w-1/4 truncate">{{ key }}</span>
              <span class="text-gray-400 text-sm flex-1 truncate">{{ value }}</span>
              <button 
                class="p-1 hover:bg-red-500 rounded transition-colors"
                @click="removeParam(key)"
              >
                <Trash2 class="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
          
          <div v-if="activeTab && !Object.keys(activeTab.queryParams).length" class="text-gray-600 text-sm text-center py-8">
            添加查询参数
          </div>
        </div>

        <div v-if="activeSection === 'headers'" class="flex-1 overflow-y-auto p-4 space-y-2">
          <div class="flex items-center gap-2">
            <input 
              v-model="newHeaderKey"
              type="text"
              placeholder="键"
              class="flex-1 bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <input 
              v-model="newHeaderValue"
              type="text"
              placeholder="值"
              class="flex-1 bg-[#252a3a] border border-[#2d3548] rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <button 
              class="bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-2 transition-colors"
              @click="addHeader"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
          
          <div v-if="activeTab && Object.keys(activeTab.headers).length" class="space-y-1">
            <div 
              v-for="(value, key) in activeTab.headers" 
              :key="key"
              class="flex items-center gap-2 bg-[#252a3a] rounded px-3 py-2"
            >
              <span class="text-blue-400 text-sm font-medium w-1/4 truncate">{{ key }}</span>
              <span class="text-gray-400 text-sm flex-1 truncate">{{ value }}</span>
              <button 
                class="p-1 hover:bg-red-500 rounded transition-colors"
                @click="removeHeader(key)"
              >
                <Trash2 class="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
          
          <div v-if="activeTab && !Object.keys(activeTab.headers).length" class="text-gray-600 text-sm text-center py-8">
            添加请求头
          </div>
        </div>

        <div v-if="activeSection === 'body'" class="flex-1 flex flex-col p-4 gap-3 min-h-0">
          <div class="flex items-center gap-2 flex-shrink-0">
            <select 
              :value="activeTab.bodyType"
              class="bg-[#252a3a] border border-[#2d3548] rounded px-3 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none cursor-pointer"
              @change="tabsStore.updateTabField('bodyType', ($event.target as HTMLSelectElement).value as import('@/types').BodyType)"
            >
              <option v-for="type in store.bodyTypes" :key="type" :value="type">
                {{ type === 'raw' ? 'Raw' : type === 'form-data' ? 'Form Data' : 'x-www-form-urlencoded' }}
              </option>
            </select>
            
            <select 
              v-if="activeTab.bodyType === 'raw'"
              :value="activeTab.rawType"
              class="bg-[#252a3a] border border-[#2d3548] rounded px-3 py-1.5 text-white text-sm focus:border-blue-500 focus:outline-none cursor-pointer"
              @change="tabsStore.updateTabField('rawType', ($event.target as HTMLSelectElement).value as import('@/types').RawType)"
            >
              <option v-for="type in store.rawTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
          
          <textarea 
            :value="activeTab.body"
            :placeholder="activeTab.bodyType === 'raw' ? '输入请求体...' : '输入表单数据...'"
            class="flex-1 w-full min-h-0 bg-[#0d1117] border border-[#2d3548] rounded px-4 py-3 text-white text-sm font-mono focus:border-blue-500 focus:outline-none resize-none"
            @input="tabsStore.updateTabField('body', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </div>
      </div>
    </template>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="text-4xl mb-2">📝</div>
        <div class="text-gray-500 text-sm">点击左侧接口或"+"按钮打开标签页</div>
      </div>
    </div>

    <div v-if="store.error" class="bg-red-500/10 border-t border-red-500/30 px-4 py-3">
      <div class="text-red-400 text-sm">{{ store.error }}</div>
    </div>
  </div>
</template>
