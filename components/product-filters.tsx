"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { brands } from "@/lib/data"

interface ProductFiltersProps {
  onClose?: () => void
  isMobile?: boolean
  selectedCategory?: string | null
  onCategoryChange?: (category: string | null) => void
  priceRange?: { min: number; max: number }
  onPriceChange?: (range: { min: number; max: number }) => void
  selectedRating?: number
  onRatingChange?: (rating: number) => void
}

export function ProductFilters({
  onClose,
  isMobile = false,
  selectedCategory,
  onCategoryChange,
  priceRange = { min: 0, max: 10000 },
  onPriceChange,
  selectedRating = 0,
  onRatingChange,
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    rating: true,
    brand: true,
    color: true,
    size: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const categories = ["Men", "Women", "Kids", "Footwear", "Accessories", "Beauty"]
  const priceRanges = [
    { label: "Under $25", min: 0, max: 25 },
    { label: "$25 - $50", min: 25, max: 50 },
    { label: "$50 - $100", min: 50, max: 100 },
    { label: "$100 - $200", min: 100, max: 200 },
    { label: "Above $200", min: 200, max: 10000 },
  ]
  const colors = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Blue", hex: "#3B82F6" },
    { name: "Red", hex: "#EF4444" },
    { name: "Green", hex: "#22C55E" },
    { name: "Yellow", hex: "#EAB308" },
  ]
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"]

  const handleCategoryClick = (cat: string) => {
    if (onCategoryChange) {
      onCategoryChange(selectedCategory === cat ? null : cat)
    }
  }

  const handlePriceClick = (min: number, max: number) => {
    if (onPriceChange) {
      onPriceChange({ min, max })
    }
  }

  return (
    <div className={`bg-background ${isMobile ? "p-4" : ""}`}>
      {isMobile && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Category Filter */}
      <div className="border-b border-border py-4">
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Category</span>
          {expandedSections.category ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.category && (
          <div className="mt-3 space-y-2">
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategory === cat}
                  onChange={() => handleCategoryClick(cat)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-muted-foreground hover:text-foreground">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Filter */}
      <div className="border-b border-border py-4">
        <button onClick={() => toggleSection("price")} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Price</span>
          {expandedSections.price ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.price && (
          <div className="mt-3 space-y-2">
            {priceRanges.map((range) => (
              <label key={range.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={priceRange.min === range.min && priceRange.max === range.max}
                  onChange={() => handlePriceClick(range.min, range.max)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-muted-foreground hover:text-foreground">{range.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div className="border-b border-border py-4">
        <button onClick={() => toggleSection("rating")} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Rating</span>
          {expandedSections.rating ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.rating && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === 0}
                onChange={() => onRatingChange?.(0)}
                className="h-4 w-4 border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-muted-foreground hover:text-foreground">All ratings</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === 3}
                onChange={() => onRatingChange?.(3)}
                className="h-4 w-4 border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-muted-foreground hover:text-foreground">★★★★★ 3 & above</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === 4}
                onChange={() => onRatingChange?.(4)}
                className="h-4 w-4 border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-muted-foreground hover:text-foreground">★★★★★ 4 & above</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === 4.5}
                onChange={() => onRatingChange?.(4.5)}
                className="h-4 w-4 border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-muted-foreground hover:text-foreground">★★★★★ 4.5 & above</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === 5}
                onChange={() => onRatingChange?.(5)}
                className="h-4 w-4 border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-muted-foreground hover:text-foreground">★★★★★ 5 stars only</span>
            </label>
          </div>
        )}
      </div>

      {/* Brand Filter */}
      <div className="border-b border-border py-4">
        <button onClick={() => toggleSection("brand")} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Brand</span>
          {expandedSections.brand ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.brand && (
          <div className="mt-3 space-y-2">
            {brands.slice(0, 6).map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20" />
                <span className="text-sm text-muted-foreground hover:text-foreground">{brand}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Color Filter */}
      <div className="border-b border-border py-4">
        <button onClick={() => toggleSection("color")} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Color</span>
          {expandedSections.color ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.color && (
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.name}
                className="w-8 h-8 rounded-full border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Size Filter */}
      <div className="py-4">
        <button onClick={() => toggleSection("size")} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Size</span>
          {expandedSections.size ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expandedSections.size && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                className="px-3 py-1.5 text-sm border border-border rounded hover:border-primary hover:text-primary transition-colors"
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      {isMobile && (
        <div className="mt-4 pt-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  )
}
