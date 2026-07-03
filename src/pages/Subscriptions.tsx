import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../lib/api'
import {
  Loader2, Plus, Pencil, Check, X, Users, GraduationCap, FileText,
  ChevronDown, ChevronUp, PauseCircle, PlayCircle, PlusCircle, Bell,
  DollarSign, CreditCard, CalendarDays, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

const PLANS_ORDER = ['starter', 'pro', 'enterprise']

const PLAN_COLORS: Record<string, string> = {
  starter:    'border-blue-200 dark:border-blue-800',
  pro:        'border-emerald-200 dark:border-emerald-800',
  enterprise: 'border-violet-200 dark:border-violet-800',
}
const PLAN_BADGE: Record<string, string> = {
  starter:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  enterprise: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}
const SUB_STATUS_BADGE: Record<string, string> = {
  active:          'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  grace:           'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  expired:         'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  suspended:       'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  pending_payment: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

// ── Per-company subscription panel ────────────────────────────────────────
function CompanySubPanel({ company, onRefresh }: { company: any; onRefresh: () => void }) {
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<'plan' | 'payment' | 'history' | null>('plan')

  // Plan form
  const [planId, setPlanId] = useState('starter')
  const [subStatus, setSubStatus] = useState('active')
  const [startedAt, setStartedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [customStudents, setCustomStudents] = useState('')
  const [customUsers, setCustomUsers] = useState('')
  const [customForms, setCustomForms] = useState('')

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payPeriod, setPayPeriod] = useState('')
  const [payRef, setPayRef] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payMonths, setPayMonths] = useState('1')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSubscription(company.id)
      const s = res.subscription
      if (s) {
        setSub(s)
        setPlanId(s.planId || 'starter')
        setSubStatus(s.status || 'active')
        setStartedAt(s.startedAt ? s.startedAt.substring(0, 10) : '')
        setExpiresAt(s.expiresAt ? s.expiresAt.substring(0, 10) : '')
        setCustomStudents(s.customStudentLimit != null ? String(s.customStudentLimit) : '')
        setCustomUsers(s.customUserLimit != null ? String(s.customUserLimit) : '')
        setCustomForms(s.customFormLimit != null ? String(s.customFormLimit) : '')
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [company.id])

  useEffect(() => { load() }, [load])

  const savePlan = async () => {
    setSaving(true)
    try {
      const payload: any = {
        planId,
        status: subStatus,
        startedAt: startedAt ? new Date(startedAt + 'T00:00:00').toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt + 'T00:00:00').toISOString() : undefined,
      }
      if (planId === 'enterprise') {
        payload.customStudentLimit = customStudents !== '' ? (customStudents === '-1' ? -1 : Number(customStudents)) : null
        payload.customUserLimit    = customUsers !== ''    ? (customUsers    === '-1' ? -1 : Number(customUsers))    : null
        payload.customFormLimit    = customForms !== ''    ? (customForms    === '-1' ? -1 : Number(customForms))    : null
      } else {
        payload.customStudentLimit = null
        payload.customUserLimit    = null
        payload.customFormLimit    = null
      }
      await adminApi.updateSubscription(company.id, payload)
      toast.success(`${company.name} — subscription saved ✓`)
      await load()
      onRefresh()
    } catch (e: any) { toast.error(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const recordPayment = async () => {
    if (!payAmount || !payPeriod) { toast.error('Amount and period are required'); return }
    setSaving(true)
    try {
      await adminApi.recordPayment(company.id, {
        amount: Number(payAmount), currency: 'USD',
        period: payPeriod, reference: payRef, note: payNote,
        extendMonths: Number(payMonths),
      })
      toast.success(`Payment recorded · +${payMonths} month(s) ✓`)
      setPayAmount(''); setPayPeriod(''); setPayRef(''); setPayNote(''); setPayMonths('1')
      await load()
      onRefresh()
    } catch (e: any) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const quickAction = async (fn: () => Promise<any>, label: string) => {
    setSaving(true)
    try { await fn(); toast.success(label); await load(); onRefresh() }
    catch (e: any) { toast.error(e.message || 'Action failed') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 px-4">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading subscription…
    </div>
  )

  const effectiveStatus = sub?.effectiveStatus || sub?.status || 'pending_payment'
  const daysLeft = sub?.daysUntilExpiry
  const expiryDisplay = sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const startDisplay  = sub?.startedAt  ? new Date(sub.startedAt).toLocaleDateString('en-GB',  { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const planName = sub?.plan?.name || sub?.planId || '—'
  const limits = sub?.effectiveLimits

  return (
    <div className="border-t border-border bg-muted/20">
      {/* ── Summary bar ───────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-muted/40 space-y-3">
        {/* Status + quick actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm capitalize">{planName} Plan</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${SUB_STATUS_BADGE[effectiveStatus] || SUB_STATUS_BADGE['pending_payment']}`}>
              {effectiveStatus.replace(/_/g, ' ').toUpperCase()}
            </span>
            {!sub?._hasRecord && (
              <span className="text-xs text-amber-500 italic">⚠ No record yet — use &quot;Save Plan&quot; to create one</span>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {effectiveStatus !== 'suspended'
              ? <button disabled={saving} onClick={() => quickAction(() => adminApi.suspendSubscription(company.id), 'Suspended')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent disabled:opacity-50 transition-colors"><PauseCircle className="h-3.5 w-3.5" /> Suspend</button>
              : <button disabled={saving} onClick={() => quickAction(() => adminApi.reinstateSubscription(company.id), 'Reinstated')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent disabled:opacity-50 transition-colors"><PlayCircle className="h-3.5 w-3.5" /> Reinstate</button>
            }
            <button disabled={saving} onClick={() => quickAction(() => adminApi.addMonthToSubscription(company.id), '+1 month added')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent disabled:opacity-50 transition-colors"><PlusCircle className="h-3.5 w-3.5" /> +1 Month</button>
            <button disabled={saving} onClick={() => quickAction(() => adminApi.sendExpiryReminder(company.id), 'Reminder sent')} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent disabled:opacity-50 transition-colors"><Bell className="h-3.5 w-3.5" /> Remind</button>
          </div>
        </div>

        {/* Term details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground font-medium flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Started</p>
            <p className="font-semibold mt-0.5">{startDisplay || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Expires</p>
            <p className={`font-semibold mt-0.5 ${daysLeft !== null && daysLeft !== undefined && daysLeft <= 14 ? 'text-amber-500' : ''}`}>
              {expiryDisplay || '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Days left</p>
            <p className={`font-semibold mt-0.5 ${daysLeft !== null && daysLeft !== undefined && daysLeft <= 14 ? 'text-amber-500' : ''}`}>
              {daysLeft !== null && daysLeft !== undefined ? `${daysLeft}d` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Limits</p>
            <p className="font-semibold mt-0.5">
              {limits ? `${limits.maxStudents === -1 ? '∞' : limits.maxStudents} stu · ${limits.maxUsers === -1 ? '∞' : limits.maxUsers} seats · ${limits.maxForms === -1 ? '∞' : limits.maxForms} forms` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Collapsible sections ────────────────────────────────────────── */}
      <div className="divide-y divide-border">
        {/* Plan & Term */}
        <div>
          <button
            onClick={() => setSection(section === 'plan' ? null : 'plan')}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors text-left"
          >
            <span>Plan &amp; Term</span>
            {section === 'plan' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {section === 'plan' && (
            <div className="px-4 pb-4 pt-3 space-y-3 bg-background">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Plan</label>
                  <select
                    value={planId}
                    onChange={e => setPlanId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="starter">Starter ($49/mo)</option>
                    <option value="pro">Professional ($99/mo)</option>
                    <option value="enterprise">Enterprise (Custom)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={subStatus}
                    onChange={e => setSubStatus(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending_payment">Pending Payment</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                  <input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
                  <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </div>
              {planId === 'enterprise' && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Custom Limits (−1 = unlimited)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Students', val: customStudents, set: setCustomStudents },
                      { label: 'Seats', val: customUsers, set: setCustomUsers },
                      { label: 'Forms', val: customForms, set: setCustomForms },
                    ].map(({ label, val, set }) => (
                      <div key={label} className="space-y-0.5">
                        <label className="text-[11px] text-muted-foreground">{label}</label>
                        <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="-1"
                          className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                disabled={saving}
                onClick={savePlan}
                className="w-full inline-flex justify-center items-center gap-2 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Plan &amp; Term
              </button>
            </div>
          )}
        </div>

        {/* Record Payment */}
        <div>
          <button
            onClick={() => setSection(section === 'payment' ? null : 'payment')}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors text-left"
          >
            <span>Record Bank Transfer Payment</span>
            {section === 'payment' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {section === 'payment' && (
            <div className="px-4 pb-4 pt-3 space-y-3 bg-background">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Amount (USD) *</label>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="99"
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Period * (e.g. July 2026)</label>
                  <input value={payPeriod} onChange={e => setPayPeriod(e.target.value)} placeholder="July 2026"
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Bank Ref / TXN</label>
                  <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="TXN123456"
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Extend by (months)</label>
                  <input type="number" min="1" value={payMonths} onChange={e => setPayMonths(e.target.value)} placeholder="1"
                    className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Internal Note</label>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. July renewal via wire transfer"
                  className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <button
                disabled={saving || !payAmount || !payPeriod}
                onClick={recordPayment}
                className="w-full inline-flex justify-center items-center gap-2 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                Record &amp; Extend Subscription
              </button>
            </div>
          )}
        </div>

        {/* Billing History */}
        {(sub?.billingHistory?.length ?? 0) > 0 && (
          <div>
            <button
              onClick={() => setSection(section === 'history' ? null : 'history')}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors text-left"
            >
              <span>Billing History ({sub.billingHistory.length})</span>
              {section === 'history' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {section === 'history' && (
              <div className="px-4 pb-4 pt-2 bg-background overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 pr-3 font-medium">Date</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Period</th>
                      <th className="text-right py-1.5 pr-3 font-medium">Amount</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Ref</th>
                      <th className="text-left py-1.5 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sub.billingHistory.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-1.5 pr-3 text-muted-foreground">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                        <td className="py-1.5 pr-3">{r.period}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold">${r.amount}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{r.reference || '—'}</td>
                        <td className="py-1.5 text-muted-foreground">{r.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Subscriptions() {
  const [plans, setPlans] = useState<any>({})
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [localPlans, setLocalPlans] = useState<any>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSavePlan = async (planKey: string) => {
    setSaving(true)
    try {
      const updated = { ...plans, [planKey]: localPlans[planKey] }
      await adminApi.updatePlanDefinitions(updated)
      setPlans(updated)
      setEditingPlan(null)
      toast.success(`${planKey} plan definition updated`)
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Manage plan definitions and each company's active subscription.</p>
      </div>

      {/* ── Plan definitions ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Plan Definitions</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS_ORDER.map(key => {
              const plan = localPlans[key] || {}
              const isEditing = editingPlan === key
              return (
                <div key={key} className={`rounded-xl border-2 bg-card shadow-sm ${PLAN_COLORS[key]}`}>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${PLAN_BADGE[key]}`}>{key}</span>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={() => { setLocalPlans({ ...localPlans, [key]: plans[key] }); setEditingPlan(null) }} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleSavePlan(key)} disabled={saving} className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingPlan(key)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Name', key: 'name', type: 'text' },
                          { label: 'Price / month (USD)', key: 'price', type: 'number' },
                        ].map(f => (
                          <div key={f.key} className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                            <input type={f.type} value={plan[f.key] ?? ''} onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value } })}
                              className="flex h-8 w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                          </div>
                        ))}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Max Seats', field: 'maxUsers' },
                            { label: 'Max Students', field: 'maxStudents' },
                            { label: 'Max Forms', field: 'maxForms' },
                          ].map(({ label, field }) => (
                            <div key={field} className="space-y-0.5">
                              <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
                              <input type="number" value={plan[field] === -1 ? '' : plan[field] ?? 0} placeholder="-1=∞"
                                onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, [field]: e.target.value === '' ? -1 : Number(e.target.value) } })}
                                className="flex h-8 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Features (one per line)</label>
                          <textarea rows={3} value={(plan.features || []).join('\n')}
                            onChange={e => setLocalPlans({ ...localPlans, [key]: { ...plan, features: e.target.value.split('\n').filter(Boolean) } })}
                            className="flex w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-2xl font-bold">
                          {plan.price === 0 ? 'Free' : plan.price === null ? 'Custom' : `$${plan.price}`}
                          {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                        </p>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {plan.maxUsers === -1 ? '∞' : plan.maxUsers ?? 0} seats</span>
                          <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {plan.maxStudents === -1 ? '∞' : plan.maxStudents ?? 0} students</span>
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {plan.maxForms === -1 ? '∞' : plan.maxForms ?? 0} forms</span>
                        </div>
                        {plan.features?.length > 0 && (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {plan.features.map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5"><Plus className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />{f}</li>
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

      {/* ── Company subscriptions ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Company Subscriptions</h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No companies found.</div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border">
            {filtered.map(c => {
              const sub = c.subscription
              const effectiveStatus = sub?.effectiveStatus || sub?.status || 'pending_payment'
              const isExpanded = expanded === c.id
              return (
                <div key={c.id}>
                  {/* Company row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    className="w-full text-left px-5 py-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${PLAN_BADGE[c.plan] || PLAN_BADGE['starter']}`}>
                          {c.plan || 'starter'}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${SUB_STATUS_BADGE[effectiveStatus] || SUB_STATUS_BADGE['pending_payment']}`}>
                          {effectiveStatus.replace(/_/g, ' ')}
                        </span>
                        {sub?.daysUntilExpiry !== null && sub?.daysUntilExpiry !== undefined && sub.daysUntilExpiry <= 14 && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium shrink-0">
                            <AlertTriangle className="h-3 w-3" /> {sub.daysUntilExpiry}d left
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                        {sub?.expiresAt && <span>Expires {new Date(sub.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded subscription panel */}
                  {isExpanded && <CompanySubPanel company={c} onRefresh={load} />}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
