"use client"

import { X, Upload, Search, Sparkles, Loader } from "lucide-react"
import Image from "next/image"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface VisualSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: number
  name: string
  price: number
  image_url: string
  category: string
  rating: number
}

export function VisualSearchModal({ isOpen, onClose }: VisualSearchModalProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  if (!isOpen) return null

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB")
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageData = e.target?.result as string
      setUploadedImage(imageData)
      setError(null)
      setResults([])

      // Search for similar products
      setIsSearching(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("limit", "12")

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const response = await fetch(`${API_BASE_URL}/api/products/search/visual`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Visual search failed")
        }

        const data = await response.json()
        setResults(data)
      } catch (err) {
        setError("Failed to search. Please try another image.")
        console.error("Visual search error:", err)
      } finally {
        setIsSearching(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file) handleImageUpload(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Visual Search</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Upload an image of clothing, accessories, or any product you like, and we'll find similar items in our catalog.
          </p>

          {!uploadedImage ? (
            // Upload Area
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drag and drop your image here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to select an image
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: JPG, PNG, WebP (Max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                className="hidden"
              />
            </div>
          ) : (
            // Results
            <div>
              {/* Uploaded Image Preview */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Your Image</h3>
                <div className="relative w-full max-w-xs mx-auto">
                  <img
                    src={uploadedImage}
                    alt="Uploaded image"
                    className="w-full rounded-lg border border-border"
                  />
                  {!isSearching && (
                    <button
                      onClick={() => {
                        setUploadedImage(null)
                        setResults([])
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results */}
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Searching for similar products...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              ) : results.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">
                    Found {results.length} similar products
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {results.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          router.push(`/product/${product.id}`)
                          onClose()
                        }}
                        className="group"
                      >
                        <div className="aspect-square bg-secondary rounded-lg overflow-hidden mb-2 border border-border group-hover:border-primary transition-colors">
                          <img
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">₹{product.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No similar products found. Try another image.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
