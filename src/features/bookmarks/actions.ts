"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchMetadata } from './logic'

export async function addBookmark(formData: FormData) {
  const url = formData.get('url') as string
  if (!url) throw new Error("URL is required")

  // Fetch metadata securely
  const metadata = await fetchMetadata(url)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: user.id,
      url: metadata.url,
      title: metadata.title,
      description: metadata.description,
      image_url: metadata.image_url,
      favicon_url: metadata.favicon_url,
      status: 'unread'
    })

  if (error) {
    if (error.code === '23505') {
      throw new Error("Bookmark already exists")
    }
    console.error(error)
    throw new Error("Failed to save bookmark")
  }

  revalidatePath('/bookmarks')
  return { success: true }
}
