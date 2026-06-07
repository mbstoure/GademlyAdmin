import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { recordAdminLogin, pingSession } from './lib/sessionTracker'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Users from './pages/Users'
import Subscriptions from './pages/Subscriptions'
import Forms from './pages/Forms'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'
import LegalDocs from './pages/LegalDocs'
import Notifications from './pages/Notifications'
import SupportTickets from './pages/SupportTickets'

export type Page = 'dashboard' | 'companies' | 'users' | 'subscriptions' | 'forms' | 'audit' | 'settings' | 'legal' | 'notifications' | 'support'

const VALID_PAGES: Page[] = ['dashboard', 'companies', 'users', 'subscriptions', 'forms', 'audit', 'settings', 'legal', 'notifications', 'support']

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#', '') as Page
  return VALID_PAGES.includes(hash) ? hash : 'dashboard'
}

// ── Dev bypass: set VITE_DEV_BYPASS=true in .env to skip login ──────────────
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'
const DEV_PROFILE = { fullName: 'mbstoure (dev)', email: 'mbstoure@gmail.com', role: 'super_admin' }

function App() {
  const [session, setSession] = useState<any>(DEV_BYPASS ? 'dev' : null)
  const [profile, setProfile] = useState<any>(DEV_BYPASS ? DEV_PROFILE : null)
  const [loading, setLoading] = useState(!DEV_BYPASS)
  const [page, setPage] = useState<Page>(getPageFromHash)
  const [highlightTicketId, setHighlightTicketId] = useState<string | null>(null)

  // Sync hash → page on back/forward navigation
  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Navigate: update state + URL hash
  const navigate = (p: Page) => {
    setPage(p)
    window.location.hash = p
  }

  const navigateToTicket = (ticketId: string) => {
    setHighlightTicketId(ticketId)
    navigate('support')
    setTimeout(() => setHighlightTicketId(null), 1000)
  }

  useEffect(() => {
    if (DEV_BYPASS) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.access_token)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) fetchProfile(s.access_token)
      else { setProfile(null); setLoading(false) }
    })
    // Ping last_active every 5 minutes while the portal is open
    const pingInterval = setInterval(pingSession, 5 * 60 * 1000)
    return () => { subscription.unsubscribe(); clearInterval(pingInterval) }
  }, [])

  async function fetchProfile(token: string) {
    try {
      const base = import.meta.env.VITE_API_URL as string
      const res = await fetch(`${base}/make-server-c6b0f6c0/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const p = data.user || data.profile
        if (p?.role !== 'super_admin') {
          await supabase.auth.signOut()
          setProfile(null)
          alert('Access denied — Super Admin accounts only.')
        } else {
          setProfile(p)
          // Record this login in the admin_sessions table
          recordAdminLogin()
        }
      } else {
        console.error('[Admin] fetchProfile HTTP error:', res.status, await res.text().catch(() => ''))
        await supabase.auth.signOut()
        setProfile(null)
      }
    } catch (e) {
      console.error('[Admin] fetchProfile network error:', e)
      await supabase.auth.signOut()
      setProfile(null)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session || !profile) return <Login />

  const pages: Record<Page, React.ReactElement> = {
    dashboard:     <Dashboard />,
    companies:     <Companies />,
    users:         <Users />,
    subscriptions: <Subscriptions />,
    forms:         <Forms />,
    audit:         <AuditLog />,
    settings:      <Settings />,
    legal:         <LegalDocs />,
    notifications: <Notifications />,
    support:       <SupportTickets highlightId={highlightTicketId} />,
  }

  return (
    <Layout page={page} onNavigate={navigate} adminName={profile.fullName || profile.email} onTicketClick={navigateToTicket}>
      {pages[page]}
    </Layout>
  )
}

export default App
