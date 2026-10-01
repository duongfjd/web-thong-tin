"use client"

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { Search, FileText, Bookmark, CreditCard, Loader2 } from 'lucide-react'
import { globalSearch, SearchResult } from '@/features/search/actions'
import { useDebounce } from '@/hooks/use-debounce'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  
  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!debouncedQuery) {
      return
    }

    const timer = setTimeout(() => {
      if (!isMounted) return
      setLoading(true)
      globalSearch(debouncedQuery)
        .then((data) => {
          if (isMounted) {
            setResults(data)
            setLoading(false)
          }
        })
        .catch((err) => {
          console.error(err)
          if (isMounted) setLoading(false)
        })
    }, 0)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [debouncedQuery])

  if (!open) return null

  const activeResults = debouncedQuery ? results : []

  const getIcon = (type: string) => {
    switch (type) {
      case 'bookmark': return <Bookmark className="mr-2 h-4 w-4" />
      case 'worklog': return <FileText className="mr-2 h-4 w-4" />
      case 'expense': return <CreditCard className="mr-2 h-4 w-4" />
      default: return <Search className="mr-2 h-4 w-4" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl border rounded-xl bg-card shadow-2xl overflow-hidden relative">
        <Command label="Global Command Menu" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
            <Command.Input 
              autoFocus
              value={query}
              onValueChange={setQuery}
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Gõ nội dung tìm kiếm (Timesheet, Chi tiêu, Bookmarks)..." 
            />
            {loading && <Loader2 className="h-5 w-5 animate-spin opacity-50" />}
            <button onClick={() => setOpen(false)} className="ml-2 text-xs border rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted">ESC</button>
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {!loading && query && activeResults.length === 0 && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy kết quả.
              </Command.Empty>
            )}

            {activeResults.map((item) => (
              <Command.Item
                key={`${item.type}-${item.id}`}
                value={item.id}
                onSelect={() => {
                  router.push(item.url)
                  setOpen(false)
                }}
                className="flex items-center px-4 py-3 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                {getIcon(item.type)}
                <div className="flex flex-col ml-2 overflow-hidden">
                  <span className="font-medium">{item.title}</span>
                  {item.detail && <span className="text-xs text-muted-foreground truncate">{item.detail}</span>}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
      {/* Background click to close */}
      <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
    </div>
  )
}
