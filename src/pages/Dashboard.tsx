import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import {
  Building2, Users, GraduationCap, FileText,
  TrendingUp, DollarSign, Activity, RefreshCw,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4']

function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime()
  if (isNaN(ms)) return '—'
  const diff = Date.now() - ms
  if (diff < 0) return 'just now'           // clock skew guard
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 2)   return 'just now'
  if (m < 60)  return `${m}m ago`
  if (h < 24)  return `${h}h ago`
  if (d <  7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setStats(await adminApi.getStats()) } catch {}
    setLoading(false)
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await adminApi.getAuditLog({ limit: 8 })
      setLogs(res.logs || [])
    } catch {}
    setLogsLoading(false)
  }

  useEffect(() => { load(); loadLogs() }, [])

  const planData = stats?.planDistribution
    ? Object.entries(stats.planDistribution).map(([name, value]) => ({ name, value: Number(value) }))
    : []

  const statCards = [
    { label: 'Companies',   value: stats?.totalCompanies,  icon: Building2,     color: 'text-blue-600' },
    { label: 'Users',       value: stats?.totalUsers,      icon: Users,         color: 'text-violet-600' },
    { label: 'Students',    value: stats?.totalStudents,   icon: GraduationCap, color: 'text-cyan-600' },
    { label: 'Forms',       value: stats?.totalForms,      icon: FileText,      color: 'text-emerald-600' },
    { label: 'MRR',         value: stats?.mrr ? `$${stats.mrr.toLocaleString()}` : '$0', icon: DollarSign, color: 'text-amber-600' },
    { label: 'Growth',      value: stats?.growth ? `${stats.growth}%` : '—',    icon: TrendingUp,    color: 'text-green-600' },
  ]

  const ACTION_COLORS: Record<string, string> = {
    create: 'bg-green-500',
    update: 'bg-blue-500',
    delete: 'bg-red-500',
    login:  'bg-purple-500',
    impersonate: 'bg-amber-500',
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}, Admin 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening across your platform today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="px-6 pb-6">
              <p className="text-2xl font-bold">
                {loading ? <span className="text-muted-foreground text-lg">...</span> : (value ?? 0)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Audit log feed */}
        <div className="col-span-2 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Activity className="h-4 w-4" />
                Recent Activity
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Admin actions across the platform</p>
            </div>
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="px-6 pb-6">
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-4 animate-pulse">
                    <div className="w-2 h-2 mt-2 bg-muted rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-3/5" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No activity yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${ACTION_COLORS[log.action] || 'bg-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.action} — {log.targetType}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.adminEmail}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pb-3">
            <h3 className="font-semibold">Plan Distribution</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Subscriptions by tier</p>
          </div>
          <div className="px-6 pb-6">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                Loading...
              </div>
            ) : planData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {planData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} companies`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {planData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span className="capitalize">{d.name}</span>
                      </div>
                      <span className="font-medium text-muted-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
