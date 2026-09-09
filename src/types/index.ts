export interface RequestConfig {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  queryParams: Record<string, string>
}

export interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  contentType: string
  responseTime: number
}

export interface Environment {
  id: string
  name: string
  variables: Record<string, string>
}

export interface RequestItem {
  id: string
  name: string
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  queryParams: Record<string, string>
  bodyType: string | null
}

export interface Collection {
  id: string
  name: string
  requests: RequestItem[]
}

export interface RequestContext {
  collection?: Collection
  request?: RequestItem
}

export interface HistoryItem {
  id: string
  timestamp: number
  method: string
  url: string
  status: number
  responseTime: number
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export type BodyType = 'raw' | 'form-data' | 'urlencoded'

export type RawType = 'JSON' | 'XML' | 'HTML' | 'Text'

export interface Tab {
  id: string
  requestId: string | null
  collectionId: string | null
  title: string
  method: HttpMethod
  url: string
  headers: Record<string, string>
  queryParams: Record<string, string>
  body: string
  bodyType: BodyType
  rawType: RawType
  isDirty: boolean
}

export type TabField = keyof Tab
export type TabId = string
