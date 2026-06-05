import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { adminApi } from '../lib/api'

import { type Page } from '../App'
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  FileText,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  UserCircle,
  ChevronDown,
  ShieldCheck,
  Scale,
  Bell,
  MessageSquare,
} from 'lucide-react'

import { Toaster } from './ui/sonner'

const gademlyLogo = '/gademly-logo.png'

interface NavItem {
  id: Page
  label: string
  icon: React.ElementType
}

const NAV: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'companies',     label: 'Companies',     icon: Building2 },
  { id: 'users',         label: 'Users',         icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'forms',         label: 'Forms',         icon: FileText },
  { id: 'support',       label: 'Support',       icon: MessageSquare },
  { id: 'audit',         label: 'Audit Log',     icon: ClipboardList },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'legal',         label: 'Legal Docs',    icon: Scale },
  { id: 'settings',      label: 'Settings',      icon: Settings },
]

interface LayoutProps {
  page: Page
  onNavigate: (p: Page) => void
  adminName: string
  children: React.ReactNode
  onTicketClick?: (ticketId: string) => void
}


export default function Layout({ page, onNavigate, adminName, children, onTicketClick }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-theme')
      if (saved) return saved === 'dark'
    }
    return false
  })
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [time, setTime] = useState(new Date())
  const [openTickets, setOpenTickets] = useState(0)
  const [ticketBellOpen, setTicketBellOpen] = useState(false)
  const [recentTickets, setRecentTickets] = useState<any[]>([])

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('admin-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('admin-theme', 'light')
    }
  }, [darkMode])

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Support ticket polling — check every 60s for new open tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await adminApi.getSupportTickets({ status: 'open', limit: 5 })
        const tickets = data.tickets || []
        setOpenTickets(tickets.length)
        setRecentTickets(tickets.slice(0, 5))
      } catch {}
    }
    fetchTickets()
    const interval = setInterval(fetchTickets, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const formatTime = (d: Date) =>
    d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-visible">
        <div className="w-full flex h-16 items-center justify-between overflow-visible px-4">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-4 ml-4">
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <img src={gademlyLogo} alt="Gademly" className="h-10 w-10" />
            <div>
              <h1 className="text-lg font-bold">Gademly</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Staff Portal
              </p>
            </div>
          </div>

          {/* Right: clock, dark mode, support bell, user */}
          <div className="flex items-center gap-3 overflow-visible">
            {/* Clock */}
            <div className="hidden lg:block text-right">
              <p className="text-sm font-medium">{formatTime(time)}</p>
            </div>

            {/* Support ticket bell */}
            <div className="relative">
              <button
                onClick={() => setTicketBellOpen(!ticketBellOpen)}
                className="relative flex items-center justify-center h-10 w-10 rounded-xl border-transparent text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-all"
                title="Support Tickets"
              >
                <MessageSquare className="h-[18px] w-[18px]" />
                {openTickets > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {openTickets > 9 ? '9+' : openTickets}
                  </span>
                )}
              </button>

              {ticketBellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTicketBellOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <p className="text-sm font-semibold">Open Tickets ({openTickets})</p>
                      <button
                        onClick={() => { onNavigate('support'); setTicketBellOpen(false) }}
                        className="text-xs text-primary hover:underline"
                      >View all</button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {recentTickets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No open tickets 🎉</p>
                      ) : recentTickets.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTicketBellOpen(false)
                            if (onTicketClick) onTicketClick(t.id)
                            else onNavigate('support')
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-0"
                        >
                          <p className="text-sm font-medium line-clamp-1">{t.subject}</p>
                          <p className="text-xs text-muted-foreground">{t.userEmail || t.companyName}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dark mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden md:flex items-center gap-2 px-3 py-2 h-12 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden md:inline text-xs">{darkMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 h-12 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{adminName}</p>
                  <p className="text-xs text-muted-foreground capitalize">super admin</p>
                </div>
                <UserCircle className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 rounded-md border bg-popover text-popover-foreground p-1 shadow-md z-50">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium leading-none">{adminName}</p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">super admin</p>
                    </div>
                    <div className="bg-border -mx-1 my-1 h-px" />
                    <button
                      onClick={() => { onNavigate('settings'); setUserMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <div className="bg-border -mx-1 my-1 h-px" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left text-red-600 dark:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar wrapper */}
        <div className="relative flex-shrink-0 md:order-first">
          <aside
            className={`
              z-40 h-full overflow-visible
              bg-background transition-all duration-300
              fixed left-0 md:sticky border-r
              ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              ${collapsed ? 'md:w-16' : 'w-64'}
            `}
          >
            <nav className="space-y-1 p-4">
              {NAV.map(item => {
                const Icon = item.icon
                const isActive = page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                      transition-colors relative group
                      ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>

                    {/* Tooltip for collapsed */}
                    {collapsed && (
                      <span className="hidden md:block absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {item.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Collapse/expand toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex absolute top-6 -right-3 z-50 h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md hover:bg-accent transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto transition-all duration-300 px-3 sm:px-6 py-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  )
}
