"use server"

import { createClient } from '@/lib/supabase/server'

export type SearchResult = {
  type: 'bookmark' | 'worklog' | 'expense'
  id: string
  title: string
  detail: string
  url: string
  created_at: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return []
  
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Call the secure RPC function
  const { data, error } = await supabase.rpc('global_search' as unknown as keyof typeof supabase.rpc, { query_text: query })

  if (error) {
    console.error("Global search error:", error)
    return []
  }

  return (data as SearchResult[]) || []
}
