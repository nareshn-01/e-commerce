"use client"

import { useWishlist } from "@/hooks/use-wishlist"
import { useCart } from "@/hooks/use-cart"
import { useCartSidebar } from "@/lib/cart-sidebar-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { Trash2, ShoppingCart, ArrowLeft } from "lucide-react"

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist } = useWishlist()
  const { addToCart } = useCart()
  const { openCartSidebar } = useCartSidebar()
  const { toast } = useToast()

  const handleRemoveItem = (id: string) => {
    removeFromWishlist(id)
    toast({
      title: "Removed from Wishlist",
      duration: 1500,
    })
  }

  const handleAddToCart = (item: any) => {
    addToCart(item)
    toast({
      title: "Added to Cart ✓",
      duration: 1500,
    })
    openCartSidebar()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/products" className="text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">My Wishlist</h1>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">Your wishlist is empty</p>
            <Link href="/products" className="text-primary hover:text-primary/80 font-medium">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-[3/4] bg-secondary">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground">{item.brand}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.name}</p>
                  <p className="text-lg font-bold text-foreground mt-3">₹{item.price.toFixed(0)}</p>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 bg-primary text-primary-foreground py-2 px-3 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
