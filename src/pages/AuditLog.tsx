import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { ClipboardList, RefreshCw, Loader2 } from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  create:      'bg-green-500',
  update:      'bg-blue-500',
  delete:      'bg-red-500',
  impersonate: 'bg-amber-500',
  login:       'bg-violet-500',
  settings:    'bg-slate-500',
}

const ACTION_BADGES: Record<string, string> = {
  create:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  update:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  delete:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  impersonate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  login:       'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  settings:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAuditLog({ limit: 100 })
      setLogs(res.logs || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">All admin actions across the platform.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No audit events yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-accent/30 transition-colors">
                <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${ACTION_COLORS[log.action] || 'bg-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ACTION_BADGES[log.action] || ACTION_BADGES.settings}`}>
                      {log.action}
                    </span>
                    <span className="text-sm font-medium">{log.targetType}</span>
                    {log.targetId && (
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{log.targetId}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.adminEmail}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
