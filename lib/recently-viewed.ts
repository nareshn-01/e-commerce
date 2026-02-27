// Recently viewed products tracking

const STORAGE_KEY = 'ecommerce_recently_viewed'
const MAX_ITEMS = 10

export interface RecentlyViewedProduct {
  id: string
  timestamp: number
}

export function addRecentlyViewed(productId: string): void {
  if (typeof window === 'undefined') return

  try {
    const recent = getRecentlyViewed()
    
    // Remove if already exists
    const filtered = recent.filter(item => item.id !== productId)
    
    // Add to beginning
    const updated: RecentlyViewedProduct[] = [
      { id: productId, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_ITEMS)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('recentlyViewedChanged'))
  } catch (error) {
    console.error('Failed to save recently viewed:', error)
  }
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === 'undefined') return []
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    
    const items: RecentlyViewedProduct[] = JSON.parse(data)
    
    // Filter out items older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    return items.filter(item => item.timestamp > thirtyDaysAgo)
  } catch (error) {
    console.error('Failed to load recently viewed:', error)
    return []
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('recentlyViewedChanged'))
}
