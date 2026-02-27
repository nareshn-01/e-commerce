'use client';

import { redirect } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In production, check if user is admin here
  // For now, allow access for testing
  
  return (
    <div>
      {children}
    </div>
  );
}
