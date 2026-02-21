'use client';

import { useState, useEffect } from 'react';
import { X, Check, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ComparisonProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount?: number;
  stock?: number;
  category: string;
  image: string;
  discount?: number;
}

interface ProductComparisonSidebarProps {
  products: ComparisonProduct[];
  onRemove: (productId: string) => void;  onCompare?: () => void}

export function ProductComparisonSidebar({ products, onRemove, onCompare }: ProductComparisonSidebarProps) {
  if (products.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 w-full sm:w-96 bg-white border-t border-l border-gray-200 shadow-lg z-40 max-h-96 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Comparison ({products.length})</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Clear all
              products.forEach((p) => onRemove(p.id));
            }}
          >
            Clear All
          </Button>
        </div>

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <img
                src={product.image}
                alt={product.name}
                className="h-16 w-16 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-sm font-bold text-primary">₹{product.price.toFixed(0)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-yellow-500">★</span>
                  <span className="text-xs font-medium">{product.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
                </div>
              </div>
              <button
                onClick={() => onRemove(product.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <Button className="w-full mt-4" size="lg" onClick={onCompare}>
          Compare ({products.length})
        </Button>
      </div>
    </div>
  );
}

export function ComparisonModal({ products, onClose }: { products: ComparisonProduct[]; onClose: () => void }) {
  if (products.length === 0) return null;

  const specs = ['Price', 'Rating', 'Stock', 'Category'];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Compare Products ({products.length})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-semibold w-32">Spec</th>
                {products.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-semibold min-w-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <img src={p.image} alt={p.name} className="h-20 w-20 object-cover rounded" />
                      <p className="text-sm font-medium">{p.name}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((spec, idx) => (
                <tr key={spec} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-sm">{spec}</td>
                  {products.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center border-l">
                      {spec === 'Price' && <span className="font-bold text-primary">₹{p.price.toFixed(0)}</span>}
                      {spec === 'Rating' && (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold">{p.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {spec === 'Stock' && (
                        <span className={p.stock && p.stock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {p.stock && p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                        </span>
                      )}
                      {spec === 'Category' && <span className="text-sm capitalize">{p.category}</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3 font-medium">Action</td>
                {products.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center border-l">
                    <Button size="sm" className="w-full">
                      View Product
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
