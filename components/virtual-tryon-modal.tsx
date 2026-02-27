"use client"

import { X, Upload, Sparkles, Loader2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { useState, useRef } from "react"
import { virtualTryOn } from "@/lib/api"

interface VirtualTryOnModalProps {
  isOpen: boolean
  onClose: () => void
  productImage?: string
  productName?: string
}

export function VirtualTryOnModal({ 
  isOpen, 
  onClose, 
  productImage,
  productName 
}: VirtualTryOnModalProps) {
  const [personImage, setPersonImage] = useState<File | null>(null)
  const [personPreview, setPersonPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handlePersonImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setPersonImage(file)
    setError(null)
    setResultImage(null)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPersonPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handlePersonImageUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file) {
      handlePersonImageUpload(file)
    }
  }

  const handleGenerateTryOn = async () => {
    if (!personImage) {
      setError('Please upload your photo first')
      return
    }

    if (!productImage) {
      setError('No product image available')
      return
    }

    setIsProcessing(true)
    setError(null)
    setResultImage(null)

    try {
      // Fetch product image and convert to blob
      const productResponse = await fetch(productImage)
      const productBlob = await productResponse.blob()
      const productFile = new File([productBlob], 'product.jpg', { type: 'image/jpeg' })

      const result = await virtualTryOn(personImage, productFile)

      if (result.success && result.result_image) {
        setResultImage(`data:image/png;base64,${result.result_image}`)
        setProcessingTime(result.processing_time || null)
      } else {
        setError(result.error || 'Failed to generate try-on result')
      }
    } catch (err) {
      console.error('Virtual try-on error:', err)
      setError('An error occurred while processing your request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setPersonImage(null)
    setPersonPreview(null)
    setResultImage(null)
    setError(null)
    setProcessingTime(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Virtual Try-On</h2>
            {processingTime && (
              <span className="text-xs text-muted-foreground">
                (Generated in {processingTime.toFixed(1)}s)
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!resultImage ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a full-body photo and see how {productName || 'this item'} looks on you using AI.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Person Image Upload */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Your Photo</h3>
                  {personPreview ? (
                    <div className="border border-border rounded-xl p-4 bg-secondary/30">
                      <img 
                        src={personPreview} 
                        alt="Your photo" 
                        className="w-full rounded-lg mb-3 max-h-96 object-contain"
                      />
                      <button
                        onClick={handleReset}
                        className="w-full px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer h-96"
                    >
                      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Upload your full-body photo</p>
                      <p className="text-xs text-muted-foreground">or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-3">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Product Preview */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Selected Item</h3>
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    {productImage ? (
                      <div className="relative aspect-square bg-secondary">
                        <Image 
                          src={productImage} 
                          alt={productName || "Product"} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-secondary flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    {productName && (
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground">{productName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 p-4 bg-primary/5 rounded-xl">
                <h4 className="text-sm font-medium text-foreground mb-2">Tips for best results</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use a clear, well-lit full-body photo</li>
                  <li>• Stand in a neutral pose facing the camera</li>
                  <li>• Wear fitted clothing for more accurate results</li>
                  <li>• Ensure good lighting and minimal background clutter</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-foreground">Your Virtual Try-On Result</h3>
              
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <img 
                  src={resultImage} 
                  alt="Virtual try-on result" 
                  className="w-full max-h-[600px] object-contain"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  Try Another Photo
                </button>
                <a
                  href={resultImage}
                  download="virtual-tryon-result.png"
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center"
                >
                  Download Result
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!resultImage && (
          <div className="px-6 py-4 border-t border-border bg-secondary/30">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateTryOn}
                disabled={!personImage || isProcessing}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Try-On
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
