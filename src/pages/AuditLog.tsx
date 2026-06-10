import { useEffect, useState, useMemo, useCallback } from 'react'
import { adminApi } from '../lib/api'
import { ClipboardList, RefreshCw, Loader2, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  create:      'bg-green-500',
  update:      'bg-blue-500',
  delete:      'bg-red-500',
  impersonate: 'bg-amber-500',
  login:       'bg-violet-500',
  settings:    'bg-slate-500',
  approve:     'bg-teal-500',
  suspend:     'bg-orange-500',
}

const ACTION_BADGES: Record<string, string> = {
  create:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  update:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  delete:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  impersonate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  login:       'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  settings:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  approve:     'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  suspend:     'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

const ALL_ACTIONS = ['create', 'update', 'delete', 'impersonate', 'login', 'settings', 'approve', 'suspend']

function fmtFull(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return iso ?? '—' }
}

function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime()
  if (isNaN(ms)) return '—'
  const diff = Date.now() - ms
  if (diff < 0) return 'just now'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 2)  return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d <  7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const PAGE_SIZE = 50

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  // Filters (client-side applied to fetched logs)
  const [search, setSearch]   = useState('')
  const [action, setAction]   = useState('all')
  const [company, setCompany] = useState('all')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')

  // Load all logs (up to 500) once; filter client-side for reliability
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [auditRes, companyRes] = await Promise.all([
        adminApi.getAuditLog({ limit: 500 }),
        adminApi.getCompanies().catch(() => ({ companies: [] })),
      ])
      setLogs(auditRes.logs || [])
      setCompanies(companyRes.companies || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  // Reset page when any filter changes
  useEffect(() => { setPage(0) }, [search, action, company, from, to])

  // ── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (action !== 'all' && log.action !== action) return false

      // Company filter
      if (company !== 'all') {
        const match =
          log.companyId === company ||
          log.company === company ||
          companies.find((c: any) => c.id === company)?.name === (log.companyName || log.company)
        if (!match) return false
      }

      // Date range filter
      if (from) {
        const fromTs = new Date(from).getTime()
        const logTs  = new Date(log.createdAt).getTime()
        if (logTs < fromTs) return false
      }
      if (to) {
        const toTs  = new Date(to).getTime() + 86_399_999 // include full day
        const logTs = new Date(log.createdAt).getTime()
        if (logTs > toTs) return false
      }

      // Text search
      if (search) {
        const q = search.toLowerCase()
        const haystack = [
          log.adminEmail, log.action, log.targetType,
          log.targetId, log.companyName, log.company,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [logs, action, company, from, to, search, companies])

  // Paginated slice
  const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const hasActiveFilters = action !== 'all' || company !== 'all' || !!from || !!to || !!search

  const clearFilters = () => {
    setSearch(''); setAction('all'); setCompany('all'); setFrom(''); setTo('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            All admin actions across the platform.
            {!loading && <span className="ml-1 text-sm">({filtered.length} events{hasActiveFilters ? ' matching filters' : ''})</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors hover:bg-accent
              ${hasActiveFilters ? 'border-primary text-primary' : 'text-muted-foreground'}`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground disabled:opacity-40" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          {/* Row 1: search + action + company */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text" placeholder="Admin email, target ID…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Action */}
            <select value={action} onChange={e => setAction(e.target.value)}
              title="Filter by action"
              className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">All actions</option>
              {ALL_ACTIONS.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
            </select>

            {/* Company */}
            <select value={company} onChange={e => setCompany(e.target.value)}
              title="Filter by company"
              className="h-10 w-full rounded-md border border-input bg-input-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="all">All companies</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Row 2: date range + clear */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                aria-label="From date" title="From date"
                className="h-9 rounded-md border border-input bg-input-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                aria-label="To date" title="To date"
                className="h-9 rounded-md border border-input bg-input-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : pageSlice.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{hasActiveFilters ? 'No events match your filters.' : 'No audit events found.'}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Admin</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Target</th>
                  <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageSlice.map((log, i) => (
                  <tr key={i} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ACTION_COLORS[log.action] || 'bg-slate-400'}`} />
                        <div>
                          <p className="text-xs font-medium tabular-nums">{fmtFull(log.createdAt)}</p>
                          <p className="text-[11px] text-muted-foreground">{timeAgo(log.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ACTION_BADGES[log.action] || ACTION_BADGES.settings}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{log.adminEmail || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div>
                        {log.targetType && <span className="text-xs font-medium capitalize">{log.targetType}</span>}
                        {log.targetId && (
                          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">{log.targetId}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                      {log.companyName || log.company || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent disabled:opacity-40 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent disabled:opacity-40 transition-colors">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
