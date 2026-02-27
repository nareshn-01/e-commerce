"use client"

import { useState, useEffect, useCallback } from "react"

export interface CartItem {
  id: string
  name: string
  brand: string
  price: number
  image: string
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}

const STORAGE_KEY = "ecommerce_cart"

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, itemCount: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load cart from localStorage on mount (client-side only)
  useEffect(() => {
    setMounted(true)
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY)
      if (savedCart) {
        const parsed = JSON.parse(savedCart)
        setCart(parsed)
      }
    } catch (error) {
      console.error("Failed to load cart:", error)
    }
    setIsLoading(false)
  }, [])

  // Save cart to localStorage whenever it changes (only on client, after mounting)
  useEffect(() => {
    if (mounted && !isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
      } catch (error) {
        console.error("Failed to save cart:", error)
      }
    }
  }, [cart, isLoading, mounted])

  // Calculate totals
  const calculateTotals = useCallback((items: CartItem[]) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    return { total, itemCount }
  }, [])

  const addToCart = useCallback((product: Omit<CartItem, "quantity">) => {
    setCart((prevCart) => {
      const existingItem = prevCart.items.find((item) => item.id === product.id)

      let newItems: CartItem[]
      if (existingItem) {
        // Increase quantity if item already in cart
        newItems = prevCart.items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        // Add new item
        newItems = [...prevCart.items, { ...product, quantity: 1 }]
      }

      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    })
  }, [calculateTotals])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => {
      const newItems = prevCart.items.filter((item) => item.id !== productId)
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    })
  }, [calculateTotals])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prevCart) => {
      const newItems = prevCart.items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
      const { total, itemCount } = calculateTotals(newItems)
      return { items: newItems, total, itemCount }
    })
  }, [removeFromCart, calculateTotals])

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0, itemCount: 0 })
  }, [])

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isLoading,
  }
}
