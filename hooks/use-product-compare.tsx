"use client"

import { useState, useEffect } from "react"
import { products } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X, Star } from "lucide-react"
import Image from "next/image"

const STORAGE_KEY = 'ecommerce_compare'
const MAX_COMPARE = 4

export function useProductCompare() {
  const [compareList, setCompareList] = useState<string[]>([])

  useEffect(() => {
    const loadCompareList = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setCompareList(JSON.parse(saved))
        }
      } catch (error) {
        console.error('Failed to load compare list:', error)
      }
    }

    loadCompareList()

    const handleStorageChange = () => loadCompareList()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('compareListChanged', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('compareListChanged', handleStorageChange)
    }
  }, [])

  const addToCompare = (productId: string) => {
    if (compareList.length >= MAX_COMPARE) {
      return false
    }
    if (compareList.includes(productId)) {
      return false
    }

    const updated = [...compareList, productId]
    setCompareList(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('compareListChanged'))
    return true
  }

  const removeFromCompare = (productId: string) => {
    const updated = compareList.filter(id => id !== productId)
    setCompareList(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('compareListChanged'))
  }

  const clearCompare = () => {
    setCompareList([])
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('compareListChanged'))
  }

  const isInCompare = (productId: string) => compareList.includes(productId)

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    canAdd: compareList.length < MAX_COMPARE
  }
}

interface ProductCompareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductCompareModal({ open, onOpenChange }: ProductCompareModalProps) {
  const { compareList, removeFromCompare, clearCompare } = useProductCompare()
  const compareProducts = products.length > 0 ? products.filter(p => compareList.includes(p.id)) : []

  if (compareProducts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Products</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products to compare</p>
            <p className="text-sm text-muted-foreground mt-2">Add products to compare their features</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Compare Products ({compareProducts.length})</DialogTitle>
            <Button variant="ghost" size="sm" onClick={clearCompare}>
              Clear All
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {compareProducts.map((product) => (
            <div key={product.id} className="border border-border rounded-lg p-4 relative">
              <button
                onClick={() => removeFromCompare(product.id)}
                className="absolute top-2 right-2 p-1 bg-background rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.brand}</p>

                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{product.rating}</span>
                  <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">₹{product.price.toLocaleString('en-IN')}</span>
                  {product.originalPrice && (
                    <span className="text-xs line-through text-muted-foreground">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {product.discount && (
                  <Badge variant="default" className="text-xs">{product.discount}% OFF</Badge>
                )}

                <div className="pt-2 border-t border-border space-y-1">
                  <p className="text-xs"><span className="text-muted-foreground">Stock:</span> {product.stock || 'In Stock'}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Category:</span> {product.category}</p>
                  {product.deliveryDays && (
                    <p className="text-xs"><span className="text-muted-foreground">Delivery:</span> {product.deliveryDays} days</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
