import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { Loader2, Plus, Pencil, Check, X, Users, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

const PLANS_ORDER = ['free', 'pro', 'enterprise']

export default function Subscriptions() {
  const [plans, setPlans] = useState<any>({})
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [localPlans, setLocalPlans] = useState<any>({})

  const load = async () => {
    setLoading(true)
    try {
      const [pd, cd] = await Promise.all([
        adminApi.getPlanDefinitions(),
        adminApi.getCompanies(),
      ])
      setPlans(pd.plans || pd)
      setLocalPlans(pd.plans || pd)
      setCompanies(cd.companies || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSavePlan = async (planKey: string) => {
    setSaving(true)
    try {
      const updated = { ...plans, [planKey]: localPlans[planKey] }
      await adminApi.updatePlanDefinitions(updated)
      setPlans(updated)
      setEditing(null)
      toast.success(`${planKey} plan updated`)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleChangePlan = async (companyId: string, plan: string) => {
    try {
      await adminApi.updateSubscription(companyId, { plan })
      toast.success('Plan updated')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const PLAN_COLORS: Record<string, string> = {
    free:       'border-slate-200 dark:border-slate-700',
    pro:        'border-blue-200 dark:border-blue-800',
    enterprise: 'border-violet-200 dark:border-violet-800',
  }

  const PLAN_BADGE: Record<string, string> = {
    free:       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    pro:        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    enterprise: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Manage plan definitions and company subscriptions.</p>
      </div>

      {/* Plan definitions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Plan Definitions</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading plans...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS_ORDER.map(key => {
              const plan = localPlans[key] || {}
              const isEditing = editing === key
              return (
                <div key={key} className={`rounded-xl border-2 bg-card text-card-foreground shadow-sm ${PLAN_COLORS[key]}`}>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${PLAN_BADGE[key]}`}>
                        {key}
                      </span>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setLocalPlans({ ...localPlans, [key]: plans[key] }); setEditing(null) }}
                            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleSavePlan(key)}
                            disabled={saving}
                            className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditing(key)}
                          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Name</label>
                          <input
                            value={plan.name || key}
                            onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, name: e.target.value } })}
                            className="flex h-8 w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Price / month</label>
                          <input
                            type="number"
                            value={plan.price || 0}
                            onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, price: Number(e.target.value) } })}
                            className="flex h-8 w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Max users</label>
                            <input
                              type="number"
                              value={plan.maxUsers === -1 ? '' : plan.maxUsers || 0}
                              placeholder="-1 = unlimited"
                              onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, maxUsers: e.target.value === '' ? -1 : Number(e.target.value) } })}
                              className="flex h-8 w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Max students</label>
                            <input
                              type="number"
                              value={plan.maxStudents === -1 ? '' : plan.maxStudents || 0}
                              placeholder="-1 = unlimited"
                              onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, maxStudents: e.target.value === '' ? -1 : Number(e.target.value) } })}
                              className="flex h-8 w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Features (one per line)</label>
                          <textarea
                            rows={3}
                            value={(plan.features || []).join('\n')}
                            onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, features: e.target.value.split('\n').filter(Boolean) } })}
                            className="flex w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-2xl font-bold">
                          {plan.price === 0 ? 'Free' : `$${plan.price}`}
                          {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {plan.maxUsers === -1 ? '∞' : plan.maxUsers ?? 0} users</span>
                          <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {plan.maxStudents === -1 ? '∞' : plan.maxStudents ?? 0} students</span>
                        </div>
                        {plan.features?.length > 0 && (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {plan.features.map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Plus className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Company subscriptions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Company Plans</h2>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No companies yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Current Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Change Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map(c => (
                  <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.ownerEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PLAN_BADGE[c.plan] || PLAN_BADGE.free}`}>
                        {c.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.plan || 'free'}
                        onChange={e => handleChangePlan(c.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-input-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {PLANS_ORDER.map(p => (
                          <option key={p} value={p} className="capitalize">{p}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
