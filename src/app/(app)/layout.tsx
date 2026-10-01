"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CommandPalette } from "@/components/command-palette"
import { 
  LayoutDashboard, 
  Clock, 
  Wallet, 
  Bookmark, 
  Files,
  Settings
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timesheet", label: "Timesheet", icon: Clock },
  { href: "/expenses", label: "Chi tiêu", icon: Wallet },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/documents", label: "Tài liệu", icon: Files },
  { href: "/settings", label: "Cài đặt", icon: Settings },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-background">
      <CommandPalette />
      {/* Sidebar cho Desktop */}
      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          Personal OS
        </div>
        <nav className="flex-1 overflow-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom Nav cho Mobile */}
      <nav className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background md:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
