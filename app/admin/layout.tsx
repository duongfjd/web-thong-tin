'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, signOut, supabase } from '@/lib/supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData?.role !== 'admin') {
        router.push('/community');
        return;
      }

      setUser(user);
      setIsAdmin(true);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              A
            </div>
            <span className="font-bold text-xl text-foreground">Admin</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </nav>
      </header>

      <div className="pt-20 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border fixed left-0 top-20 bottom-0 overflow-y-auto">
          <nav className="p-4 space-y-2">
            <Link
              href="/admin/dashboard"
              className="block px-4 py-2 rounded-lg text-foreground hover:bg-muted transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="block px-4 py-2 rounded-lg text-foreground hover:bg-muted transition"
            >
              Users
            </Link>
            <Link
              href="/admin/reports"
              className="block px-4 py-2 rounded-lg text-foreground hover:bg-muted transition"
            >
              Reports
            </Link>
            <Link
              href="/admin/moderation"
              className="block px-4 py-2 rounded-lg text-foreground hover:bg-muted transition"
            >
              Content Moderation
            </Link>
            <Link
              href="/admin/analytics"
              className="block px-4 py-2 rounded-lg text-foreground hover:bg-muted transition"
            >
              Analytics
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
