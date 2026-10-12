import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL_KEY = 'jobseek_api_url'

const DEFAULT_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3002' : 'http://localhost:3002'

export async function getApiUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_URL_KEY)
    return saved ?? DEFAULT_URL
  } catch {
    return DEFAULT_URL
  }
}

export async function setApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_URL_KEY, url.replace(/\/$/, ''))
}

export async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = await getApiUrl()
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function apiMultipart<T>(path: string, formData: FormData): Promise<T> {
  const base = await getApiUrl()
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function checkConnexion(): Promise<boolean> {
  try {
    const base = await getApiUrl()
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
