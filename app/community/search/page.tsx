'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    // TODO: Implement actual search
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-card border border-border rounded-lg p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, users, tags..."
            className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Posts', 'Users', 'Tags'].map((filter) => (
          <button
            key={filter}
            className="px-4 py-2 rounded-full border border-border text-foreground hover:bg-muted transition"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Results */}
      {query && results.length === 0 && !searching && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found for &quot;{query}&quot;</p>
        </div>
      )}

      {results.map((result) => (
        <Link key={result.id} href={`/community/${result.id}`}>
          <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition cursor-pointer">
            <p className="text-foreground">{result.content}</p>
            <p className="text-xs text-muted-foreground mt-2">{result.author}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
