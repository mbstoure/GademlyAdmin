import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import {
  Building2, Users, GraduationCap, FileText,
  TrendingUp, DollarSign, Activity, RefreshCw,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// ── Colour palette for plan slices ────────────────────────────────────────────
const PLAN_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

// Labels we want to display even when the server uses internal plan IDs
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  basic: 'Basic',
  professional: 'Professional',
  pro: 'Professional',
  enterprise: 'Enterprise',
  premium: 'Premium',
  custom: 'Custom',
  trial: 'Trial',
}

function prettyPlan(raw: string): string {
  if (!raw) return 'Unknown'
  return PLAN_LABELS[raw.toLowerCase()] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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

// ── Derive plan distribution + MRR from subscriptions array ──────────────────
function deriveFromSubscriptions(subs: any[]): {
  planData: { name: string; value: number }[]
  mrr: number
} {
  const planCounts: Record<string, number> = {}
  let mrr = 0

  subs.forEach(s => {
    // Only count active/trialing subscriptions
    const isActive = !s.status || ['active', 'trialing', 'past_due'].includes(s.status)
    if (!isActive) return

    const plan = prettyPlan(s.plan || s.planId || s.tier || 'unknown')
    planCounts[plan] = (planCounts[plan] || 0) + 1

    // MRR: prefer explicit field, else derive from amount + billing interval
    if (s.mrr) {
      mrr += Number(s.mrr)
    } else if (s.amount) {
      const amount = Number(s.amount)
      if (s.billingInterval === 'yearly' || s.interval === 'year') {
        mrr += amount / 12
      } else {
        mrr += amount
      }
    } else if (s.planPrice) {
      mrr += Number(s.planPrice)
    }
  })

  const planData = Object.entries(planCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return { planData, mrr: Math.round(mrr) }
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [statsRes, subsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSubscriptions().catch(() => ({ subscriptions: [] })),
      ])
      setStats(statsRes)
      setSubscriptions(subsRes.subscriptions || [])
    } catch {}
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

  // ── Plan distribution ─────────────────────────────────────────────────────
  // Priority: actual subscription records → fallback to server stats field
  const { planData, mrr: derivedMrr } = deriveFromSubscriptions(subscriptions)

  // If server gave us plan distribution, merge it (server wins on count, we label nicely)
  const finalPlanData = planData.length > 0
    ? planData
    : stats?.planDistribution
      ? Object.entries(stats.planDistribution).map(([k, v]) => ({ name: prettyPlan(k), value: Number(v) }))
      : []

  // MRR: use derived value if > 0, else fall back to server stats
  const finalMrr = derivedMrr > 0
    ? derivedMrr
    : (stats?.mrr ?? 0)

  // ── Stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    { label: 'Companies',   value: stats?.totalCompanies,  icon: Building2,     color: 'text-blue-600' },
    { label: 'Users',       value: stats?.totalUsers,      icon: Users,         color: 'text-violet-600' },
    { label: 'Students',    value: stats?.totalStudents,   icon: GraduationCap, color: 'text-cyan-600' },
    { label: 'Forms',       value: stats?.totalForms,      icon: FileText,      color: 'text-emerald-600' },
    {
      label: 'MRR',
      value: finalMrr > 0 ? `$${finalMrr.toLocaleString()}` : '$0',
      icon: DollarSign,
      color: 'text-amber-600',
    },
    {
      label: 'Growth',
      value: stats?.growth ? `${stats.growth}%` : '—',
      icon: TrendingUp,
      color: 'text-green-600',
    },
  ]

  const ACTION_COLORS: Record<string, string> = {
    create: 'bg-green-500',
    update: 'bg-blue-500',
    delete: 'bg-red-500',
    login:  'bg-purple-500',
    impersonate: 'bg-amber-500',
  }

  // Active subscription count for context
  const activeSubs = subscriptions.filter(s => !s.status || ['active', 'trialing'].includes(s.status)).length

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
          <div className="p-6 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Plan Distribution</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Active subscriptions by tier</p>
            </div>
            {!loading && activeSubs > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {activeSubs} active
              </span>
            )}
          </div>
          <div className="px-6 pb-6">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                Loading...
              </div>
            ) : finalPlanData.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <DollarSign className="h-8 w-8 opacity-30" />
                <p>No active subscriptions yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={finalPlanData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {finalPlanData.map((_, i) => (
                        <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, name: any) => [`${v} ${v === 1 ? 'company' : 'companies'}`, name]}
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {finalPlanData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                        <span className="capitalize">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{d.value}</span>
                        <span className="text-muted-foreground text-xs">
                          ({Math.round((d.value / finalPlanData.reduce((s, p) => s + p.value, 0)) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {finalMrr > 0 && (
                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Est. MRR</span>
                    <span className="font-bold text-green-600 dark:text-green-400">${finalMrr.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
