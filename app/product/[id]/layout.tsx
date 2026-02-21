import React from 'react'

export async function generateStaticParams() {
  // Return sample product IDs for static generation
  // In production, fetch from your backend to get all product IDs
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
  ]
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
