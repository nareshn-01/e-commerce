"use client"

import { useState, useEffect, useCallback } from "react"

export interface WishlistItem {
  id: string
  name: string
  brand: string
  price: number
  image: string
}

export interface Wishlist {
  id: string
  name: string
  description: string
  items: WishlistItem[]
  createdAt: string
  isDefault: boolean
}

const STORAGE_KEY = "ecommerce_wishlists"

export function useWishlist() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [activeWishlistId, setActiveWishlistId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load wishlists from localStorage on mount (client-side only)
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setWishlists(parsed)
        const defaultWishlist = parsed.find((w: Wishlist) => w.isDefault)
        if (defaultWishlist) {
          setActiveWishlistId(defaultWishlist.id)
        } else if (parsed.length > 0) {
          setActiveWishlistId(parsed[0].id)
        }
      } else {
        // Create default wishlist
        const defaultWishlist: Wishlist = {
          id: `wishlist_${Date.now()}`,
          name: "My Wishlist",
          description: "My favorite items",
          items: [],
          createdAt: new Date().toISOString(),
          isDefault: true,
        }
        setWishlists([defaultWishlist])
        setActiveWishlistId(defaultWishlist.id)
      }
    } catch (error) {
      console.error("Failed to load wishlists:", error)
    }
    setIsLoading(false)
  }, [])

  // Save wishlists to localStorage whenever they change
  useEffect(() => {
    if (mounted && !isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlists))
      } catch (error) {
        console.error("Failed to save wishlists:", error)
      }
    }
  }, [wishlists, isLoading, mounted])

  const activeWishlist = wishlists.find((w) => w.id === activeWishlistId)

  const createWishlist = useCallback((name: string, description: string = "") => {
    const newWishlist: Wishlist = {
      id: `wishlist_${Date.now()}`,
      name,
      description,
      items: [],
      createdAt: new Date().toISOString(),
      isDefault: false,
    }
    setWishlists((prev) => [...prev, newWishlist])
    setActiveWishlistId(newWishlist.id)
    return newWishlist
  }, [])

  const deleteWishlist = useCallback((wishlistId: string) => {
    setWishlists((prev) => {
      const filtered = prev.filter((w) => w.id !== wishlistId)
      if (filtered.length === 0) {
        // Ensure at least one default wishlist exists
        const defaultWishlist: Wishlist = {
          id: `wishlist_${Date.now()}`,
          name: "My Wishlist",
          description: "My favorite items",
          items: [],
          createdAt: new Date().toISOString(),
          isDefault: true,
        }
        setActiveWishlistId(defaultWishlist.id)
        return [defaultWishlist]
      }
      if (activeWishlistId === wishlistId) {
        setActiveWishlistId(filtered[0].id)
      }
      return filtered
    })
  }, [activeWishlistId])

  const renameWishlist = useCallback((wishlistId: string, newName: string) => {
    setWishlists((prev) =>
      prev.map((w) => (w.id === wishlistId ? { ...w, name: newName } : w))
    )
  }, [])

  const addToWishlist = useCallback(
    (product: WishlistItem, wishlistId?: string) => {
      const targetId = wishlistId || activeWishlistId
      setWishlists((prev) =>
        prev.map((w) => {
          if (w.id === targetId) {
            const exists = w.items.find((item) => item.id === product.id)
            if (exists) return w
            return { ...w, items: [...w.items, product] }
          }
          return w
        })
      )
    },
    [activeWishlistId]
  )

  const removeFromWishlist = useCallback((productId: string, wishlistId?: string) => {
    const targetId = wishlistId || activeWishlistId
    setWishlists((prev) =>
      prev.map((w) => {
        if (w.id === targetId) {
          return { ...w, items: w.items.filter((item) => item.id !== productId) }
        }
        return w
      })
    )
  }, [activeWishlistId])

  const toggleWishlist = useCallback(
    (product: WishlistItem, wishlistId?: string) => {
      const targetId = wishlistId || activeWishlistId
      const wishlist = wishlists.find((w) => w.id === targetId)
      if (wishlist?.items.find((item) => item.id === product.id)) {
        removeFromWishlist(product.id, targetId)
      } else {
        addToWishlist(product, targetId)
      }
    },
    [wishlists, activeWishlistId, addToWishlist, removeFromWishlist]
  )

  const isInWishlist = useCallback(
    (productId: string, wishlistId?: string) => {
      const targetId = wishlistId || activeWishlistId
      const wishlist = wishlists.find((w) => w.id === targetId)
      return wishlist?.items.some((item) => item.id === productId) ?? false
    },
    [wishlists, activeWishlistId]
  )

  const isInAnyWishlist = useCallback(
    (productId: string) => {
      return wishlists.some((w) => w.items.some((item) => item.id === productId))
    },
    [wishlists]
  )

  const wishlistItems = activeWishlist?.items ?? []

  return {
    wishlists,
    activeWishlist,
    activeWishlistId,
    wishlistItems,
    setActiveWishlistId,
    createWishlist,
    deleteWishlist,
    renameWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    isInAnyWishlist,
    isLoading,
  }
}
