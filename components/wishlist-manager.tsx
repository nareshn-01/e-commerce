"use client"

import { useState } from "react"
import { useWishlist } from "@/hooks/use-wishlist"
import { Plus, Trash2, Edit2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WishlistManager() {
  const { wishlists, activeWishlistId, setActiveWishlistId, createWishlist, deleteWishlist, renameWishlist } =
    useWishlist()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newWishlistName, setNewWishlistName] = useState("")
  const [newWishlistDescription, setNewWishlistDescription] = useState("")
  const [editingName, setEditingName] = useState("")

  const handleCreateWishlist = (e: React.FormEvent) => {
    e.preventDefault()
    if (newWishlistName.trim()) {
      createWishlist(newWishlistName, newWishlistDescription)
      setNewWishlistName("")
      setNewWishlistDescription("")
      setShowCreateForm(false)
    }
  }

  const handleRenameWishlist = (wishlistId: string) => {
    if (editingName.trim()) {
      renameWishlist(wishlistId, editingName)
      setEditingId(null)
      setEditingName("")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">My Collections</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-secondary rounded-lg p-4 space-y-3">
          <input
            type="text"
            placeholder="Collection name"
            value={newWishlistName}
            onChange={(e) => setNewWishlistName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={newWishlistDescription}
            onChange={(e) => setNewWishlistDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateWishlist}
              disabled={!newWishlistName.trim()}
              className="flex-1"
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowCreateForm(false)
                setNewWishlistName("")
                setNewWishlistDescription("")
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Wishlists List */}
      <div className="space-y-2">
        {wishlists.map((wishlist) => (
          <div
            key={wishlist.id}
            className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
              activeWishlistId === wishlist.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            {editingId === wishlist.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRenameWishlist(wishlist.id)}
                    className="flex items-center gap-1 px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditingName("")
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div onClick={() => setActiveWishlistId(wishlist.id)}>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    {wishlist.name}
                    {wishlist.isDefault && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </h4>
                  {wishlist.description && (
                    <p className="text-sm text-muted-foreground mt-1">{wishlist.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {wishlist.items.length} item{wishlist.items.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {!wishlist.isDefault && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(wishlist.id)
                        setEditingName(wishlist.name)
                      }}
                      className="flex items-center gap-1 flex-1 px-2 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete "${wishlist.name}"?`)) {
                          deleteWishlist(wishlist.id)
                        }
                      }}
                      className="flex items-center gap-1 flex-1 px-2 py-1.5 text-sm border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
