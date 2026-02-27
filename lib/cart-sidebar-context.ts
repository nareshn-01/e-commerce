"use client"

import { createContext, useContext, useState } from "react"

interface CartSidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  openCartSidebar: () => void
  closeCartSidebar: () => void
}

const CartSidebarContext = createContext<CartSidebarContextType | undefined>(undefined)

export function CartSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openCartSidebar = () => setIsOpen(true)
  const closeCartSidebar = () => setIsOpen(false)

  return (
    <CartSidebarContext.Provider value={{ isOpen, setIsOpen, openCartSidebar, closeCartSidebar }}>
      {children}
    </CartSidebarContext.Provider>
  )
}

export function useCartSidebar() {
  const context = useContext(CartSidebarContext)
  if (!context) {
    throw new Error("useCartSidebar must be used within CartSidebarProvider")
  }
  return context
}
