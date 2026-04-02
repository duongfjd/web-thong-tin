import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              C
            </div>
            <span className="font-bold text-xl text-foreground">Community</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6">
            Connect and Grow Together
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our modern community platform to share your thoughts, discover new people, and build meaningful connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
            <Link
              href="/community"
              className="px-8 py-3 border border-border text-foreground rounded-lg font-semibold hover:bg-muted transition"
            >
              Explore Feed
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-16">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border border-border hover:border-primary/50 transition">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Social Feed</h3>
              <p className="text-muted-foreground">
                Discover posts, comments, and engage with your community in real-time.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border hover:border-primary/50 transition">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">User Profiles</h3>
              <p className="text-muted-foreground">
                Create your profile, follow interesting people, and build your network.
              </p>
            </div>
            <div className="p-6 rounded-lg border border-border hover:border-primary/50 transition">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🔔</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Notifications</h3>
              <p className="text-muted-foreground">
                Stay updated with real-time notifications on all your activities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Community Platform. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
