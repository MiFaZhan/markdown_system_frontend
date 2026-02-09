// 文件内容缓存工具
class ContentCache {
  constructor() {
    this.cache = new Map()
    this.loading = new Map()
    this.maxCacheSize = 100 // 最大缓存数量
  }

  // 获取缓存的内容
  get(nodeId) {
    return this.cache.get(nodeId)
  }

  // 检查是否正在加载
  isLoading(nodeId) {
    return this.loading.get(nodeId)
  }

  // 设置加载状态
  setLoading(nodeId, promise) {
    this.loading.set(nodeId, promise)
  }

  // 清除加载状态
  clearLoading(nodeId) {
    this.loading.delete(nodeId)
  }

  // 设置缓存
  set(nodeId, data) {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(nodeId, {
      ...data,
      cachedAt: Date.now()
    })
  }

  // 预加载文件内容
  async preload(nodeId, fetchFn, forceRefresh = false) {
    // 如果强制刷新或缓存中没有数据，重新获取
    const cached = this.get(nodeId)
    if (!forceRefresh && cached) {
      return cached
    }

    // 如果正在加载，等待加载完成
    const loadingPromise = this.isLoading(nodeId)
    if (loadingPromise) {
      return loadingPromise
    }

    // 开始加载
    const promise = fetchFn()
      .then((data) => {
        this.set(nodeId, data)
        this.clearLoading(nodeId)
        return data
      })
      .catch((error) => {
        this.clearLoading(nodeId)
        throw error
      })

    this.setLoading(nodeId, promise)
    return promise
  }

  // 清除指定缓存
  delete(nodeId) {
    this.cache.delete(nodeId)
    this.loading.delete(nodeId)
  }

  // 清除所有缓存
  clear() {
    this.cache.clear()
    this.loading.clear()
  }

  // 获取缓存统计信息
  getStats() {
    return {
      cacheSize: this.cache.size,
      loadingSize: this.loading.size,
      maxCacheSize: this.maxCacheSize
    }
  }
}

// 创建全局缓存实例
export const contentCache = new ContentCache()
