import { IMemoryCache } from '../types'

export function createInMemoryCacheComponent(): IMemoryCache {
  const cache = new Map<string, any>()

  function get(key: string): any {
    return cache.get(key)
  }

  function set(key: string, value: any): void {
    cache.set(key, value)
  }

  return {
    get,
    set
  }
}
