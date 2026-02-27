"use client"

import { useCart } from "@/hooks/use-cart"
import { useCartSidebar } from "@/lib/cart-sidebar-context"
import { ShoppingCart, X } from "lucide-react"
import Link from "next/link"

export function CartSidebar() {
  const { cart, isLoading } = useCart()
  const { isOpen, setIsOpen } = useCartSidebar()

  return (
    <>
      {/* Cart Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Shopping Cart"
      >
        <ShoppingCart className="h-6 w-6" />
        {cart.itemCount > 0 && (
          <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {cart.itemCount > 9 ? "9+" : cart.itemCount}
          </span>
        )}
      </button>

      {/* Cart Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="fixed right-4 top-16 w-80 max-h-96 bg-card rounded-lg border border-border shadow-lg z-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Shopping Cart</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="h-12 w-12 bg-secondary rounded-full mx-auto mb-2 animate-pulse" />
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            ) : cart.items.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-muted-foreground text-sm">Your cart is empty</p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="max-h-96 overflow-y-auto">
                  {cart.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/product/${item.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex gap-3 p-3 border-b border-border hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-secondary rounded flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{item.brand}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                          <p className="text-sm font-semibold text-foreground">
                            ₹{(item.price * item.quantity).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 border-t border-border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">₹{cart.total.toFixed(0)}</span>
                  </div>
                  <Link
                    href="/cart"
                    onClick={() => setIsOpen(false)}
                    className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium text-center text-sm"
                  >
                    View Cart
                  </Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
