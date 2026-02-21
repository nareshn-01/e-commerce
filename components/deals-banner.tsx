import Link from "next/link"
import Image from "next/image"

export function DealsBanner() {
  return (
    <section className="py-8 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/products" className="group relative h-48 md:h-64 rounded-xl overflow-hidden">
            <Image
              src="/mens-fashion-accessories-minimalist.jpg"
              alt="Men's collection"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <h3 className="text-xl font-bold">Men&apos;s Collection</h3>
              <p className="text-sm opacity-90 mt-1">Up to 40% off</p>
            </div>
          </Link>
          <Link href="/products" className="group relative h-48 md:h-64 rounded-xl overflow-hidden">
            <Image
              src="/womens-fashion-dress-elegant.jpg"
              alt="Women's collection"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <h3 className="text-xl font-bold">Women&apos;s Collection</h3>
              <p className="text-sm opacity-90 mt-1">New arrivals</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
