"use client"

import { X, Upload, Sparkles, Check, Loader } from "lucide-react"
import Image from "next/image"
import { useState, useRef } from "react"
import { analyzeOutfit } from "@/lib/api"

interface AIOutfitModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    name: string
    brand: string
    image: string
    category?: string
  }
}

interface AnalysisResult {
  matchScore: number
  colorHarmony: string
  styleMatch: string
  suggestions: string[]
  aiRecommendations?: Array<{style: string; reason: string}>
  previewImage?: string
  detectedGender?: string
  detectedBodyType?: string
  skinTone?: string
  dominantColors?: string[]
}

interface Product {
  id: string
  name: string
  brand: string
  price: number
  image: string
}

export function AIOutfitModal({ isOpen, onClose, product }: AIOutfitModalProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImageUpload = async (file: File) => {
    // Read file as data URL
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageData = e.target?.result as string
      setUploadedImage(imageData)
      
      // Analyze outfit with AI
      setIsAnalyzing(true)
      try {
        const result = await analyzeOutfit(imageData, product)
        setAnalysis(result)
      } catch (error) {
        console.error("Error analyzing outfit:", error)
      } finally {
        setIsAnalyzing(false)
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
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageUpload(files[0])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">AI Outfit Check</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Upload a photo of your outfit and see how this item would match your style.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Your Outfit Photo</h3>
              {uploadedImage ? (
                <div className="border border-border rounded-xl p-4 bg-secondary/30">
                  <img src={uploadedImage} alt="Uploaded outfit" className="w-full rounded-lg mb-3 max-h-64 object-cover" />
                  <button
                    onClick={() => { setUploadedImage(null); setAnalysis(null) }}
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
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer h-64"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Drop your photo here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-3">PNG, JPG up to 10MB</p>
                </div>
              )}
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

            {/* Product Preview */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Selected Item</h3>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="relative aspect-square bg-secondary">
                  <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
                  <div className="absolute top-3 right-3 p-1.5 bg-green-500 rounded-full">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground">{product.brand}</p>
                  <p className="text-xs text-muted-foreground truncate">{product.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {isAnalyzing && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Analyzing your style...</h3>
              <div className="bg-secondary/30 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground">AI is analyzing your outfit...</p>
                </div>
              </div>
            </div>
          )}

          {analysis && (
            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <h3 className="text-sm font-medium text-foreground">Style Analysis</h3>
              
              {/* Detected Features */}
              {analysis.detectedGender && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-primary/5 rounded p-2 text-center">
                    <p className="text-muted-foreground">Gender</p>
                    <p className="font-semibold text-foreground capitalize">{analysis.detectedGender}</p>
                  </div>
                  <div className="bg-primary/5 rounded p-2 text-center">
                    <p className="text-muted-foreground">Body Type</p>
                    <p className="font-semibold text-foreground capitalize">{analysis.detectedBodyType}</p>
                  </div>
                  <div className="bg-primary/5 rounded p-2 text-center">
                    <p className="text-muted-foreground">Skin Tone</p>
                    <p className="font-semibold text-foreground capitalize">{analysis.skinTone}</p>
                  </div>
                </div>
              )}

              {/* Match Score */}
              <div className="bg-primary/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">Style Match Score</p>
                  <p className="text-lg font-bold text-primary">{analysis.matchScore}%</p>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analysis.matchScore}%` }}
                  />
                </div>
              </div>

              {/* Dominant Colors */}
              {analysis.dominantColors && analysis.dominantColors.length > 0 && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-2">Your Outfit Colors</p>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.dominantColors.map((color, idx) => (
                      <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full capitalize">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Harmony */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Color Harmony</p>
                <p className="text-sm font-medium text-foreground">{analysis.colorHarmony}</p>
              </div>

              {/* Style Match */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Personal Style Match</p>
                <p className="text-sm font-medium text-foreground">{analysis.styleMatch}</p>
              </div>

              {/* Suggestions */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">Personalized Styling Suggestions</p>
                <ul className="space-y-1">
                  {analysis.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Similar Alternatives */}
              {/* AI Style Recommendations */}
              {analysis.aiRecommendations && analysis.aiRecommendations.length > 0 && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-3 font-semibold">✨ Personalized Style Recommendations</p>
                  <div className="space-y-2">
                    {analysis.aiRecommendations.map((rec, idx) => (
                      <div key={idx} className="bg-white/50 dark:bg-secondary/50 rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-foreground">{rec.style}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Slide Image Summary */}
          {analysis && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary rounded-xl p-6 space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-foreground mb-1">Your Style Profile</h3>
                  <p className="text-xs text-muted-foreground">Outfit Analysis Summary</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/50 dark:bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Body Type</p>
                    <p className="text-sm font-bold text-foreground capitalize">{analysis.detectedBodyType}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-secondary rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Skin Tone</p>
                    <p className="text-sm font-bold text-foreground capitalize">{analysis.skinTone}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-secondary rounded-lg p-3 text-center col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Style Match Score</p>
                    <p className="text-2xl font-bold text-primary">{analysis.matchScore}%</p>
                  </div>
                </div>

                <div className="bg-white/50 dark:bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">Color Harmony</p>
                  <p className="text-sm font-semibold text-foreground">{analysis.colorHarmony}</p>
                </div>

                <div className="bg-white/50 dark:bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Personal Style Match</p>
                  <p className="text-sm text-foreground">{analysis.styleMatch}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 bg-primary/5 rounded-xl">
            <h4 className="text-sm font-medium text-foreground mb-2">Tips for best results</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use a well-lit, clear photo of your outfit</li>
              <li>• Full-body shots work best for style matching</li>
              <li>• Try different outfits to explore various combinations</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            {uploadedImage && !isAnalyzing && (
              <button className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Add to Wishlist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
