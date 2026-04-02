'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '@/lib/supabase';

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
      }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/community" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              C
            </div>
            <span className="font-bold text-xl text-foreground">Community</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/community"
              className="text-sm font-medium text-foreground hover:text-primary transition"
            >
              Feed
            </Link>
            <Link
              href="/community/search"
              className="text-sm font-medium text-foreground hover:text-primary transition"
            >
              Search
            </Link>
            <Link
              href="/notifications"
              className="text-sm font-medium text-foreground hover:text-primary transition"
            >
              Notifications
            </Link>
            <Link
              href="/messages"
              className="text-sm font-medium text-foreground hover:text-primary transition"
            >
              Messages
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition text-primary font-semibold"
              >
                {user?.email?.charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg">
                  <Link
                    href={`/profile/${user?.id}`}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-t-lg"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/profile/settings"
                    className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted rounded-b-lg"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-6">
                <div className="p-4 bg-card border border-border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-4">Trending Topics</h3>
                  <div className="space-y-3">
                    {['#Technology', '#Design', '#Business', '#Startups'].map((tag) => (
                      <Link
                        key={tag}
                        href={`/community/search?q=${encodeURIComponent(tag)}`}
                        className="block text-sm text-primary hover:underline"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-4">Suggested Users</h3>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-2">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
