"use client"

import { ShoppingCart, Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/hooks/use-cart"
import { useToast } from "@/hooks/use-toast"
import { useCartSidebar } from "@/lib/cart-sidebar-context"
import { useWishlist } from "@/hooks/use-wishlist"

interface ProductCardProps {
  id: string
  name: string
  brand: string
  price: number
  originalPrice?: number
  discount?: number
  image: string
  rating?: number
  reviewCount?: number
}

export function ProductCard({
  id,
  name,
  brand,
  price,
  originalPrice,
  discount,
  image,
  rating,
  reviewCount,
}: ProductCardProps) {
  const { addToCart } = useCart()
  const { toast } = useToast()
  const { openCartSidebar } = useCartSidebar()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()

  const inWishlist = isInWishlist(id)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addToCart({
      id,
      name,
      brand,
      price,
      image,
    })
    toast({
      title: "Added to Cart ✓",
      description: `${name} has been added to your cart`,
      duration: 2000,
    })
    // Open cart sidebar automatically
    openCartSidebar()
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inWishlist) {
      removeFromWishlist(id)
      toast({
        title: "Removed from Wishlist",
        duration: 1500,
      })
    } else {
      addToWishlist({ id, name, brand, price, image })
      toast({
        title: "Added to Wishlist ♥",
        duration: 1500,
      })
    }
  }

  return (
    <Link href={`/product/${id}`} className="group block">
      <div className="bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-shadow">
        <div className="relative aspect-[3/4] bg-secondary">
          <Image
            src={image || "/placeholder.svg"}
            alt={name || "Product image"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              className="p-2 bg-white text-red-500 rounded-full shadow-sm hover:bg-gray-100 transition-colors"
              onClick={handleToggleWishlist}
              title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
            </button>
            <button
              className="p-2 bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90 transition-colors"
              onClick={handleAddToCart}
              title="Add to Cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
          {discount && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
              {discount}% OFF
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-foreground truncate">{brand}</h3>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{name}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-semibold text-foreground">₹{price.toFixed(0)}</span>
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through">₹{originalPrice.toFixed(0)}</span>
            )}
            {discount && <span className="text-xs text-primary font-medium">({discount}% off)</span>}
          </div>
          {rating !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                {rating} ★
              </div>
              <span className="text-xs text-muted-foreground">| {reviewCount}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
