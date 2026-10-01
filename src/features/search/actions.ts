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
  // In a real typed Supabase client, you'd add global_search to Database types,
  // but we can cast it since we haven't auto-generated the types.
  const { data, error } = await supabase.rpc('global_search' as any, { query_text: query })

  if (error) {
    console.error("Global search error:", error)
    return []
  }

  return (data as any) || []
}
