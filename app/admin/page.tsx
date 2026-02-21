'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Edit2, Plus, Package, BarChart3, Grid3x3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  image_url?: string;
  rating: number;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
}

interface ProductImage {
  id: number;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface DashboardStats {
  stats: {
    total_products: number;
    total_categories: number;
    average_price: number;
    low_stock_count: number;
  };
  products_by_category: Record<string, number>;
  timestamp: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PREDEFINED_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Sports & Fitness',
  'Books & Stationery',
  'Toys & Games',
  'Mobile & Accessories',
  'Footwear',
  'Watches',
  'Bags & Luggage',
  'Jewelry',
  'Health & Wellness',
  'Groceries',
  'Automotive',
  'Furniture',
  'Appliances',
  'Baby & Kids',
  'Pet Supplies',
  'Office & School Supplies',
  'Garden & Outdoor',
  'Musical Instruments',
  'Cameras & Photography',
  'Gaming',
  'Arts & Crafts',
  'Industrial & Tools',
  'Travel & Luggage',
  'Food & Beverages',
  'Gift Cards',
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>(PREDEFINED_CATEGORIES);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    image_url: '',
    rating: 0,
    images: [] as Array<{ image_url: string; alt_text?: string; display_order: number; is_primary: boolean }>,
  });
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const jsonAuthHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/admin/dashboard`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (!token) return;
      let url = `${BACKEND_URL}/api/admin/products`;
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((p: Product) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setProducts(filtered);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/admin/categories`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const merged = Array.from(
          new Set([...(Array.isArray(data) ? data : []), ...PREDEFINED_CATEGORIES])
        );
        setCategories(merged);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchDashboardStats();
    fetchCategories();
    fetchProducts();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const delaySearch = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [searchTerm, categoryFilter, token]);

  // Handle create/update product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      alert('Please choose a category');
      return;
    }

    setLoading(true);

    try {
      if (!token) return;
      const url = editingId
        ? `${BACKEND_URL}/api/admin/products/${editingId}`
        : `${BACKEND_URL}/api/admin/products`;

      const method = editingId ? 'PUT' : 'POST';
      
      // Prepare payload with images
      const payload = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        stock: formData.stock,
        category: formData.category,
        image_url: formData.image_url,
        rating: formData.rating,
        images: formData.images.length > 0 ? formData.images : undefined,
      };
      
      const res = await fetch(url, {
        method,
        headers: jsonAuthHeaders,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowDialog(false);
        resetForm();
        await fetchProducts();
        await fetchDashboardStats();
        alert(editingId ? 'Product updated!' : 'Product created!');
      } else {
        const error = await res.json();
        alert('Error: ' + error.detail);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/admin/products/${deleteId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      if (res.ok) {
        setDeleteId(null);
        await fetchProducts();
        await fetchDashboardStats();
        alert('Product deleted!');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete all products
  const handleDeleteAllProducts = async () => {
    setLoading(true);
    try {
      if (!token) return;
      for (const product of products) {
        await fetch(`${BACKEND_URL}/api/admin/products/${product.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
      }
      await fetchProducts();
      await fetchDashboardStats();
      alert('All products deleted!');
    } catch (error) {
      console.error('Error deleting all products:', error);
      alert('Failed to delete all products');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      category: product.category || '',
      image_url: product.image_url || '',
      rating: product.rating || 0,
      images: product.images || [],
    });
    setEditingId(product.id);
    setShowDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      image_url: '',
      rating: 0,
      images: [],
    });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage products and view application statistics</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Products"
                value={stats?.stats.total_products || 0}
                icon={<Package className="w-6 h-6" />}
                color="blue"
              />
              <StatCard
                title="Categories"
                value={stats?.stats.total_categories || 0}
                icon={<Grid3x3 className="w-6 h-6" />}
                color="green"
              />
              <StatCard
                title="Avg Price"
                value={`₹${stats?.stats.average_price?.toFixed(0) || 0}`}
                icon={<Package className="w-6 h-6" />}
                color="purple"
              />
              <StatCard
                title="Low Stock"
                value={stats?.stats.low_stock_count || 0}
                icon={<BarChart3 className="w-6 h-6" />}
                color="red"
              />
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="flex gap-3 flex-wrap">
                <Dialog open={showDialog} onOpenChange={(open) => {
                  setShowDialog(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      resetForm();
                      setShowDialog(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingId ? 'Edit Product' : 'Add New Product'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveProduct} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name *</label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Product name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <Input
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value })
                          }
                          placeholder="e.g., electronics"
                          list="categories-list"
                        />
                        <datalist id="categories-list">
                          {categories.map((cat) => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Price *</label>
                        <Input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Rating (0 - 5)</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={formData.rating ?? 0}
                          onChange={(e) =>
                            setFormData({ ...formData, rating: Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)) })
                          }
                          placeholder="4.5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Stock *</label>
                        <Input
                          required
                          type="number"
                          min="0"
                          value={formData.stock || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Primary Image</label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setFormData({ ...formData, image_url: reader.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {formData.image_url && (
                          <div className="mt-2">
                            <img src={formData.image_url} alt="Preview" className="h-20 w-20 object-cover rounded" />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Additional Images</label>
                        <div className="space-y-2">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                              <img src={img.image_url} alt="Preview" className="h-16 w-16 object-cover rounded" />
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Alt text"
                                  value={img.alt_text || ''}
                                  onChange={(e) => {
                                    const newImages = [...formData.images]
                                    newImages[idx].alt_text = e.target.value
                                    setFormData({ ...formData, images: newImages })
                                  }}
                                  className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newImages = formData.images.filter((_, i) => i !== idx)
                                  setFormData({ ...formData, images: newImages })
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e: any) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setFormData({
                                    ...formData,
                                    images: [...formData.images, {
                                      image_url: reader.result as string,
                                      alt_text: '',
                                      display_order: formData.images.length,
                                      is_primary: false,
                                    }],
                                  })
                                }
                                reader.readAsDataURL(file)
                              }
                            }
                            input.click()
                          }}
                        >
                          Add Image
                        </Button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="Product description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowDialog(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={() => {
                  setActiveTab('products');
                }}>
                  View All Products
                </Button>
              </div>
            </Card>

            {/* Products by Category */}
            {stats?.products_by_category && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Products by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(stats.products_by_category).map(([cat, count]) => (
                    <div key={cat} className="bg-gray-100 p-4 rounded-lg text-center">
                      <p className="text-gray-600 text-sm capitalize">{cat}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex gap-4 mb-4 flex-wrap items-center">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              
              {products.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete All Products</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Products?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {products.length} products. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllProducts} className="bg-red-600">
                        Delete All
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Dialog open={showDialog} onOpenChange={(open) => {
                setShowDialog(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    resetForm();
                    setShowDialog(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? 'Edit Product' : 'Add New Product'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Product name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Category *</label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select a category</option>
                        {PREDEFINED_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Price *</label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Stock *</label>
                      <Input
                        required
                        type="number"
                        min="0"
                        value={formData.stock || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                        }
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Primary Image</label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setFormData({ ...formData, image_url: reader.result as string })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {formData.image_url && (
                        <div className="mt-2">
                          <img src={formData.image_url} alt="Preview" className="h-20 w-20 object-cover rounded" />
                        </div>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <label className="block text-sm font-medium mb-3">Additional Images ({formData.images.length})</label>
                      
                      {formData.images.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg mb-3">
                          No additional images added yet. Click the button below to add images.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-300">
                                <img 
                                  src={img.image_url} 
                                  alt={`Additional image ${idx + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const newImages = formData.images.filter((_, i) => i !== idx)
                                  setFormData({ ...formData, images: newImages })
                                }}
                              >
                                ×
                              </Button>
                              <input
                                type="text"
                                placeholder="Alt text (optional)"
                                value={img.alt_text || ''}
                                onChange={(e) => {
                                  const newImages = [...formData.images]
                                  newImages[idx].alt_text = e.target.value
                                  setFormData({ ...formData, images: newImages })
                                }}
                                className="w-full text-xs px-2 py-1 mt-1 border border-gray-300 rounded"
                              />
                              <div className="text-xs text-gray-500 text-center mt-1">Image {idx + 1}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full bg-white hover:bg-gray-100"
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*'
                          input.multiple = false
                          input.onchange = (e: any) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setFormData({
                                  ...formData,
                                  images: [...formData.images, {
                                    image_url: reader.result as string,
                                    alt_text: '',
                                    display_order: formData.images.length,
                                    is_primary: false,
                                  }],
                                })
                              }
                              reader.readAsDataURL(file)
                            }
                          }
                          input.click()
                        }}
                      >
                        📸 Add Another Image
                      </Button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Product description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDialog(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : products.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No products found</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Group products by category */}
                {Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).map((category) => {
                  const categoryProducts = products.filter(p => (p.category || 'Uncategorized') === category);
                  return (
                    <Card key={category} className="p-6">
                      <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b">
                              <th className="px-4 py-2 text-left font-semibold">Image</th>
                              <th className="px-4 py-2 text-left font-semibold">Name</th>
                              <th className="px-4 py-2 text-right font-semibold">Price</th>
                              <th className="px-4 py-2 text-right font-semibold">Stock</th>
                              <th className="px-4 py-2 text-right font-semibold">Rating</th>
                              <th className="px-4 py-2 text-center font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryProducts.map((product) => (
                              <tr key={product.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  {(() => {
                                    const images = product.images ?? []
                                    return images.length > 0 ? (
                                    <div className="flex gap-1">
                                      {images.slice(0, 2).map((img, idx) => (
                                        <img 
                                          key={idx}
                                          src={img.image_url} 
                                          alt={img.alt_text || product.name} 
                                          className="h-12 w-12 object-cover rounded"
                                          title={`Image ${idx + 1}${images.length > 2 ? ` (+${images.length - 2} more)` : ''}`}
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                                          }}
                                        />
                                      ))}
                                      {images.length > 2 && (
                                        <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                                          +{images.length - 2}
                                        </div>
                                      )}
                                    </div>
                                    ) : product.image_url ? (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name} 
                                      className="h-12 w-12 object-cover rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                                      }}
                                    />
                                    ) : (
                                    <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                                      No image
                                    </div>
                                    )
                                  })()}
                                </td>
                                <td className="px-4 py-3">{product.name}</td>
                                <td className="px-4 py-3 text-right font-medium">
                                  ₹{product.price.toFixed(0)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span
                                    className={`px-2 py-1 rounded-full text-sm font-medium ${
                                      product.stock < 10
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {product.stock}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {product.rating.toFixed(1)} ★
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditProduct(product)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setDeleteId(product.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Analytics & Insights</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Products</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats?.stats.total_products || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Categories</p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats?.stats.total_categories || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Average Price</p>
                    <p className="text-3xl font-bold text-purple-600">
                      ₹{stats?.stats.average_price?.toFixed(0) || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
                    <p className="text-3xl font-bold text-red-600">
                      {stats?.stats.low_stock_count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
