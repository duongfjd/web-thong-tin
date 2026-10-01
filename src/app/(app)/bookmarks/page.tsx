"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addBookmark } from '@/features/bookmarks/actions'
import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Dummy data for presentation if DB is empty
const MOCK_BOOKMARKS = [
  {
    id: '1',
    url: 'https://github.com',
    title: 'GitHub: Let’s build from here',
    description: 'GitHub is where over 100 million developers shape the future of software, together.',
    image_url: 'https://github.githubassets.com/images/modules/site/social-cards/github-social.png',
    status: 'unread'
  },
  {
    id: '2',
    url: 'https://news.ycombinator.com',
    title: 'Hacker News',
    description: 'A social news website focusing on computer science and entrepreneurship.',
    image_url: null,
    status: 'read'
  }
]

export default function BookmarksPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)

  async function formAction(formData: FormData) {
    setLoading(true)
    try {
      await addBookmark(formData)
      formRef.current?.reset()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Đọc sau (Read-it-later)</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thêm liên kết mới</CardTitle>
          <CardDescription>Hệ thống sẽ tự động lấy thông tin Tiêu đề, Mô tả và Ảnh thu nhỏ.</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="flex gap-2 max-w-2xl">
            <Input 
              name="url" 
              type="url"
              placeholder="https://..." 
              className="text-lg py-6"
              required
            />
            <Button type="submit" className="py-6 px-8 text-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Lưu
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_BOOKMARKS.map((bm) => (
          <Card key={bm.id} className="overflow-hidden flex flex-col">
            {bm.image_url ? (
              <div 
                className="h-48 w-full bg-cover bg-center" 
                style={{ backgroundImage: `url(${bm.image_url})` }}
              />
            ) : (
              <div className="h-48 w-full bg-muted flex items-center justify-center text-muted-foreground">
                Không có ảnh
              </div>
            )}
            <CardHeader>
              <CardTitle className="line-clamp-2 text-lg">
                <a href={bm.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {bm.title}
                </a>
              </CardTitle>
              <CardDescription className="line-clamp-3">
                {bm.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto pt-4 flex justify-between border-t text-sm text-muted-foreground">
              <span>{bm.status === 'unread' ? '🔴 Chưa đọc' : '✅ Đã đọc'}</span>
              <a href={bm.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Mở link
              </a>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
