import { invoke } from '@tauri-apps/api/tauri'
import type { RequestConfig, ResponseData, Environment, Collection, HistoryItem } from '@/types'

export async function sendRequest(config: RequestConfig): Promise<ResponseData> {
  return invoke<ResponseData>('send_request', { config })
}

export async function getEnvironments(): Promise<Environment[]> {
  return invoke<Environment[]>('get_environments')
}

export async function saveEnvironment(env: Environment): Promise<void> {
  return invoke('save_environment', { env })
}

export async function deleteEnvironment(id: string): Promise<void> {
  return invoke('delete_environment', { id })
}

export async function getCollections(): Promise<Collection[]> {
  return invoke<Collection[]>('get_collections')
}

export async function saveCollection(col: Collection): Promise<void> {
  return invoke('save_collection', { col })
}

export async function deleteCollection(id: string): Promise<void> {
  return invoke('delete_collection', { id })
}

export async function getHistory(): Promise<HistoryItem[]> {
  return invoke<HistoryItem[]>('get_history')
}

export async function saveHistory(item: HistoryItem): Promise<void> {
  return invoke('save_history', { item })
}

export async function clearHistory(): Promise<void> {
  return invoke('clear_history')
}

export async function generateId(): Promise<string> {
  return invoke<string>('generate_id')
}

export async function importPostmanCollection(jsonStr: string): Promise<Collection> {
  return invoke<Collection>('import_postman_collection', { jsonStr })
}

export async function exportCollectionToJson(collection: Collection): Promise<string> {
  return invoke<string>('export_collection_to_json', { collection })
}
