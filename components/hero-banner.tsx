import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroBanner() {
  return (
    <section className="relative h-[400px] md:h-[500px] bg-secondary overflow-hidden">
      <Image src="/fashion-models-walking-in-stylish-modern-clothing-.jpg" alt="Season sale banner" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
      <div className="relative z-10 h-full flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            New Season
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
            Spring/Summer Collection 2026
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover the latest trends in fashion. Up to 50% off on selected items.
          </p>
          <div className="flex gap-4 mt-6">
            <Button asChild size="lg">
              <Link href="/products">Shop Now</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/products">Explore</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
