"use client"

import { Search, User, Menu, X, LogOut, Heart, Camera } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { CartSidebar } from "./cart-sidebar"
import { VisualSearchModal } from "./visual-search-modal"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { isAdminEmail } from "@/lib/admin-access"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [visualSearchOpen, setVisualSearchOpen] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuth()
  const canAccessAdmin = isAdminEmail(user?.email)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleLogout = () => {
    logout()
    setProfileMenuOpen(false)
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 mr-12">
            <span className="text-xl font-bold text-foreground tracking-tight">
              Quick<span className="text-primary">Kart</span>
            </span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/products?category=Fashion&subcategory=Men" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Men
            </Link>
            <Link href="/products?category=Fashion&subcategory=Women" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Women
            </Link>
            <Link href="/products?category=Fashion&subcategory=Kids" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Kids
            </Link>
            <Link href="/products?category=Home & Kitchen" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Home & Living
            </Link>
            <Link href="/products?category=Beauty & Personal Care" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Beauty
            </Link>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <form className="relative w-full" onSubmit={handleSearch}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for products, brands and more"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-muted-foreground"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Visual Search */}
            <button
              onClick={() => setVisualSearchOpen(true)}
              className="hidden sm:flex flex-col items-center p-2 text-foreground hover:text-primary transition-colors"
              title="Search by image"
            >
              <Camera className="h-5 w-5" />
              <span className="text-xs mt-0.5">Visual</span>
            </button>

            {/* Profile/Login */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="hidden sm:flex flex-col items-center p-2 text-foreground hover:text-primary transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="text-xs mt-0.5">{user ? "Account" : "Login"}</span>
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-40">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-border">
                        <p className="font-semibold text-foreground">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-secondary transition-colors text-foreground border-b border-border"
                      >
                        View Profile
                      </Link>
                      {canAccessAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 hover:bg-secondary transition-colors text-foreground text-sm bg-primary/5 border-b border-border"
                        >
                          📊 Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-secondary transition-colors text-foreground flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-secondary transition-colors text-foreground"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-2 border-t border-border hover:bg-secondary transition-colors text-foreground"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <CartSidebar />
              <span className="text-xs mt-0.5">Cart</span>
            </div>

            <Link href="/wishlist" className="hidden sm:flex flex-col items-center p-2 text-foreground hover:text-primary transition-colors">
              <Heart className="h-5 w-5" />
              <span className="text-xs mt-0.5">Wishlist</span>
            </Link>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form className="relative" onSubmit={handleSearch}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for products, brands and more"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder:text-muted-foreground"
            />
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col px-4 py-2">
            <Link
              href="/"
              className="py-3 text-sm font-medium text-foreground hover:text-primary border-b border-border"
            >
              Men
            </Link>
            <Link
              href="/"
              className="py-3 text-sm font-medium text-foreground hover:text-primary border-b border-border"
            >
              Women
            </Link>
            <Link
              href="/"
              className="py-3 text-sm font-medium text-foreground hover:text-primary border-b border-border"
            >
              Kids
            </Link>
            <Link
              href="/"
              className="py-3 text-sm font-medium text-foreground hover:text-primary border-b border-border"
            >
              Home & Living
            </Link>
            <Link href="/" className="py-3 text-sm font-medium text-foreground hover:text-primary">
              Beauty
            </Link>
          </nav>
          <div className="flex items-center justify-around py-4 border-t border-border">
            <Link href="/" className="flex flex-col items-center text-foreground hover:text-primary">
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </Link>
            <Link href="/wishlist" className="flex flex-col items-center text-foreground hover:text-primary">
              <Heart className="h-5 w-5" />
              <span className="text-xs mt-1">Wishlist</span>
            </Link>
          </div>
        </div>
      )}

      {/* Visual Search Modal */}
      <VisualSearchModal isOpen={visualSearchOpen} onClose={() => setVisualSearchOpen(false)} />
    </header>
  )
}
