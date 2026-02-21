import { useState, useCallback, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Product {
  id: number
  name: string
  description?: string
  price: number
  category?: string
  image_url?: string
  rating: number
  stock: number
}

interface SearchResult {
  results: Product[]
  suggestions: string[]
  total_count: number
}

export function useSmartSearch() {
  const [results, setResults] = useState<Product[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (
    query: string,
    options?: {
      category?: string
      limit?: number
      skip?: number
      sortBy?: 'relevance' | 'price' | 'rating' | 'newest'
    }
  ) => {
    if (!query.trim()) {
      setResults([])
      setSuggestions([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        query: query.trim(),
        limit: String(options?.limit || 20),
        skip: String(options?.skip || 0),
        sort_by: options?.sortBy || 'relevance',
      })

      if (options?.category) {
        params.append('category', options.category)
      }

      const response = await fetch(
        `${API_BASE_URL}/api/products/search/smart?${params.toString()}`
      )

      if (response.ok) {
        const data: SearchResult = await response.json()
        setResults(data.results || [])
        setSuggestions(data.suggestions || [])
      } else {
        setError('Search failed. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search error')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const getAutocomplete = useCallback(async (prefix: string, limit: number = 10) => {
    if (prefix.length < 2) {
      return []
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/search/autocomplete?prefix=${encodeURIComponent(prefix)}&limit=${limit}`
      )

      if (response.ok) {
        return await response.json()
      }
      return []
    } catch (err) {
      console.error('Autocomplete error:', err)
      return []
    }
  }, [])

  return {
    results,
    suggestions,
    loading,
    error,
    search,
    getAutocomplete,
  }
}
