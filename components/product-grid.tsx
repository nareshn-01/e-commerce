import { ProductCard } from "@/components/product-card"

interface Product {
  id: string
  name: string
  brand: string
  price: number
  originalPrice?: number
  discount?: number
  image: string
  rating?: number
  reviewCount?: number
}

interface ProductGridProps {
  title: string
  subtitle?: string
  products: Product[]
  showPersonalized?: boolean
}

export function ProductGrid({ title, subtitle, products, showPersonalized = false }: ProductGridProps) {
  return (
    <section className="py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            {showPersonalized && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded">
                Personalized for you
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  )
}
