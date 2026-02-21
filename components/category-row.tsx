"use client"

import Image from "next/image"
import Link from "next/link"
import { categories } from "@/lib/data"
import { trackCategoryView } from "@/lib/user-context"

export function CategoryRow() {
  return (
    <section className="py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Shop by Category</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.name)}`}
              className="group flex flex-col items-center"
              onClick={() => trackCategoryView(category.name)}
            >
              <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden bg-secondary border-2 border-transparent group-hover:border-primary transition-colors">
                <Image
                  src={category.image || "/placeholder.svg"}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="112px"
                  priority
                />
              </div>
              <span className="mt-3 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
