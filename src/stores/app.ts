import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { RequestConfig, ResponseData, Environment, Collection, HistoryItem, HttpMethod, BodyType, RawType, RequestItem, RequestContext } from '@/types'
import { sendRequest as apiSendRequest, getEnvironments, saveEnvironment, deleteEnvironment, getCollections, saveCollection, deleteCollection, getHistory, saveHistory, clearHistory, generateId, importPostmanCollection, exportCollectionToJson } from '@/api/tauri'

export const useAppStore = defineStore('app', () => {
  const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  const bodyTypes: BodyType[] = ['raw', 'form-data', 'urlencoded']
  const rawTypes: RawType[] = ['JSON', 'XML', 'HTML', 'Text']

  const currentMethod = ref<HttpMethod>('GET')
  const currentUrl = ref('')
  const currentHeaders = ref<Record<string, string>>({})
  const currentBody = ref('')
  const currentBodyType = ref<BodyType>('raw')
  const currentRawType = ref<RawType>('JSON')
  const currentQueryParams = ref<Record<string, string>>({})

  const environments = ref<Environment[]>([])
  const currentEnvironmentId = ref<string | null>(null)
  const collections = ref<Collection[]>([])
  const history = ref<HistoryItem[]>([])

  const currentCollectionId = ref<string | null>(null)
  const currentRequestId = ref<string | null>(null)

  watch(currentEnvironmentId, (newId) => {
    if (newId) {
      localStorage.setItem('currentEnvironmentId', newId)
    } else {
      localStorage.removeItem('currentEnvironmentId')
    }
  })

  const response = ref<ResponseData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const currentEnvironment = computed(() => {
    return environments.value.find(e => e.id === currentEnvironmentId.value)
  })

  const currentRequestContext = computed<RequestContext>(() => {
    if (!currentCollectionId.value) return {}
    const collection = collections.value.find(c => c.id === currentCollectionId.value)
    if (!collection) return {}
    const request = collection.requests.find(r => r.id === currentRequestId.value)
    return { collection, request }
  })

  function replaceVars(str: string): string {
    if (!currentEnvironment.value) return str
    let result = str
    for (const [key, value] of Object.entries(currentEnvironment.value.variables)) {
      result = result.split(`{{${key}}}`).join(value)
    }
    return result
  }

  function replaceVarsInRecord(record: Record<string, string>): Record<string, string> {
    if (!currentEnvironment.value) return { ...record }
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(record)) {
      result[key] = replaceVars(value)
    }
    return result
  }

  const resolvedUrl = computed(() => replaceVars(currentUrl.value))

  const resolvedHeaders = computed(() => replaceVarsInRecord(currentHeaders.value))

  const resolvedBody = computed(() => replaceVars(currentBody.value))

  const resolvedQueryParams = computed(() => replaceVarsInRecord(currentQueryParams.value))

  async function loadEnvironments() {
    environments.value = await getEnvironments()
    if (environments.value.length > 0 && !currentEnvironmentId.value) {
      const savedId = localStorage.getItem('currentEnvironmentId')
      if (savedId && environments.value.some(e => e.id === savedId)) {
        currentEnvironmentId.value = savedId
      } else {
        currentEnvironmentId.value = environments.value[0].id
      }
    }
  }

  async function loadCollections() {
    collections.value = await getCollections()
  }

  async function loadHistory() {
    history.value = await getHistory()
  }

  async function addEnvironment(name: string) {
    const id = await generateId()
    const env: Environment = { id, name, variables: {} }
    await saveEnvironment(env)
    await loadEnvironments()
  }

  async function updateEnvironment(id: string, name: string, variables: Record<string, string>) {
    const env: Environment = { id, name, variables: { ...variables } }
    await saveEnvironment(env)
    await loadEnvironments()
  }

  async function removeEnvironment(id: string) {
    await deleteEnvironment(id)
    if (currentEnvironmentId.value === id) {
      currentEnvironmentId.value = null
    }
    await loadEnvironments()
  }

  async function addCollection(name: string) {
    const id = await generateId()
    const col: Collection = { id, name, requests: [] }
    await saveCollection(col)
    await loadCollections()
  }

  async function updateCollection(id: string, name: string, requests: RequestItem[]) {
    const col: Collection = { id, name, requests }
    await saveCollection(col)
    await loadCollections()
  }

  async function removeCollection(id: string) {
    await deleteCollection(id)
    await loadCollections()
  }

  async function addRequestToCollection(collectionId: string, request: Omit<RequestItem, 'id'>) {
    const col = collections.value.find(c => c.id === collectionId)
    if (col) {
      const id = await generateId()
      col.requests.push({ ...request, id })
      await saveCollection(col)
      await loadCollections()
    }
  }

  async function removeRequestFromCollection(collectionId: string, requestId: string) {
    const col = collections.value.find(c => c.id === collectionId)
    if (col) {
      col.requests = col.requests.filter(r => r.id !== requestId)
      await saveCollection(col)
      await loadCollections()
    }
    if (currentCollectionId.value === collectionId && currentRequestId.value === requestId) {
      currentCollectionId.value = null
      currentRequestId.value = null
    }
  }

  async function updateRequestInCollection(collectionId: string, requestId: string, updates: Partial<Omit<RequestItem, 'id'>>) {
    const col = collections.value.find(c => c.id === collectionId)
    if (col) {
      const req = col.requests.find(r => r.id === requestId)
      if (req) {
        Object.assign(req, updates)
        await saveCollection(col)
        await loadCollections()
      }
    }
  }

  async function sendRequest() {
    isLoading.value = true
    error.value = null

    const config: RequestConfig = {
      method: currentMethod.value,
      url: resolvedUrl.value,
      headers: resolvedHeaders.value,
      body: resolvedBody.value || null,
      queryParams: resolvedQueryParams.value
    }

    try {
      response.value = await apiSendRequest(config)
      
      const historyItem: HistoryItem = {
        id: await generateId(),
        timestamp: Date.now(),
        method: currentMethod.value,
        url: config.url,
        status: response.value.status,
        responseTime: response.value.responseTime
      }
      await saveHistory(historyItem)
      await loadHistory()
    } catch (e) {
      error.value = String(e)
    } finally {
      isLoading.value = false
    }
  }

  async function clearHistoryData() {
    await clearHistory()
    history.value = []
  }

  function loadRequest(item: RequestItem, collectionId?: string) {
    currentCollectionId.value = collectionId ?? null
    currentRequestId.value = item.id
    currentMethod.value = item.method as HttpMethod
    currentUrl.value = item.url
    currentHeaders.value = { ...item.headers }
    currentBody.value = item.body || ''
    currentQueryParams.value = { ...item.queryParams }
    if (item.bodyType) {
      currentBodyType.value = item.bodyType as BodyType
    }
  }

  function resetRequest() {
    currentCollectionId.value = null
    currentRequestId.value = null
    currentMethod.value = 'GET'
    currentUrl.value = ''
    currentHeaders.value = {}
    currentBody.value = ''
    currentBodyType.value = 'raw'
    currentRawType.value = 'JSON'
    currentQueryParams.value = {}
    response.value = null
    error.value = null
  }

  async function importPostmanCollectionFromJson(jsonStr: string) {
    const col = await importPostmanCollection(jsonStr)
    await saveCollection(col)
    await loadCollections()
    return col
  }

  async function exportCollectionToJsonFile(collectionId: string) {
    const col = collections.value.find(c => c.id === collectionId)
    if (!col) throw new Error('集合不存在')
    return exportCollectionToJson(col)
  }

  return {
    httpMethods,
    bodyTypes,
    rawTypes,
    currentMethod,
    currentUrl,
    currentHeaders,
    currentBody,
    currentBodyType,
    currentRawType,
    currentQueryParams,
    environments,
    currentEnvironmentId,
    currentEnvironment,
    collections,
    history,
    currentCollectionId,
    currentRequestId,
    currentRequestContext,
    response,
    isLoading,
    error,
    resolvedUrl,
    resolvedHeaders,
    resolvedBody,
    resolvedQueryParams,
    loadEnvironments,
    loadCollections,
    loadHistory,
    addEnvironment,
    updateEnvironment,
    removeEnvironment,
    addCollection,
    updateCollection,
    removeCollection,
    addRequestToCollection,
    removeRequestFromCollection,
    updateRequestInCollection,
    sendRequest,
    clearHistoryData,
    loadRequest,
    resetRequest,
    importPostmanCollectionFromJson,
    exportCollectionToJsonFile
  }
})
