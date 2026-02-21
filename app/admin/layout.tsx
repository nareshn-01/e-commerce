'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { isAdminEmail } from '@/lib/admin-access';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const canAccessAdmin = isAdminEmail(user?.email);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canAccessAdmin) {
      router.replace('/');
    }
  }, [isLoading, user, canAccessAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  if (!user || !canAccessAdmin) {
    return null;
  }

  return <div>{children}</div>;
}
