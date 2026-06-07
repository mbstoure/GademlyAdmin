import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import {
  Search, Trash2, LogIn, X, Check, Loader2, Users, GraduationCap,
  Building2, Calendar, Mail, ShieldCheck, ShieldOff, Clock,
  ChevronDown, AlertCircle, CheckCircle2, Ban,
} from 'lucide-react'
import { toast } from 'sonner'

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  enterprise: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  free:       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function fmt(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function CompanyModal({
  company, onClose, onSave, onDelete, onImpersonate, onSuspend, onApprove,
}: {
  company: any
  onClose: () => void
  onSave: (id: string, data: any) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
  onImpersonate: (id: string) => Promise<void>
  onSuspend: (c: any) => Promise<void>
  onApprove: (id: string) => Promise<void>
}) {
  const [tab, setTab] = useState<'info' | 'edit'>('info')
  const [name, setName] = useState(company.name)
  const [plan, setPlan] = useState(company.plan || 'starter')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const isPending   = company.status === 'pending_approval'
  const isSuspended = company.suspended === true

  const save = async () => {
    setSaving(true)
    await onSave(company.id, { name, plan })
    setSaving(false)
    setTab('info')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{company.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${PLAN_COLORS[company.plan] || PLAN_COLORS.free}`}>
                  {company.plan || 'free'}
                </span>
                {isSuspended && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Suspended
                  </span>
                )}
                {isPending && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Awaiting Approval
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['info', 'edit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize
                ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'info' ? 'Details' : 'Edit'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'info' ? (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: Building2, label: 'Company name', value: company.name },
                  { icon: Mail, label: 'Owner email', value: company.ownerEmail || '—' },
                  { icon: Users, label: 'Owner name', value: company.ownerName || company.ownerFullName || '—' },
                  { icon: Calendar, label: 'Created', value: fmtDate(company.createdAt) },
                  { icon: Clock, label: 'Last activity', value: fmt(company.lastActivity || company.updatedAt) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Usage */}
              <div className="p-3 rounded-xl bg-muted/30 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Usage</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{company.userCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{company.studentCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><GraduationCap className="h-3 w-3" /> Students</p>
                  </div>
                </div>
              </div>

              {/* Subscription status */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <div className={`w-2.5 h-2.5 rounded-full ${company.subscriptionActive !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Subscription</p>
                  <p className="text-sm font-medium">{company.subscriptionActive !== false ? 'Active' : 'Inactive'}</p>
                </div>
                {company.subscriptionEndsAt && (
                  <p className="text-xs text-muted-foreground ml-auto">Ends {fmtDate(company.subscriptionEndsAt)}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <select value={plan} onChange={e => setPlan(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setTab('info')}
                  className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors">
                  Cancel
                </button>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t p-4 flex flex-wrap gap-2">
          {isPending && (
            <button onClick={async () => { setBusy(true); await onApprove(company.id); setBusy(false); onClose() }}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve & Send Email
            </button>
          )}

          <button onClick={async () => { setBusy(true); await onSuspend(company); setBusy(false) }}
            disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors
              ${isSuspended
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'}`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSuspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
            {isSuspended ? 'Reactivate' : 'Suspend'}
          </button>

          <button onClick={async () => { setBusy(true); await onImpersonate(company.id); setBusy(false) }}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
            Login as
          </button>

          <button onClick={() => onDelete(company.id, company.name)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<'all' | 'pending'>('all')
  const [impersonating, setImpersonating] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setCompanies((await adminApi.getCompanies()).companies || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pending = companies.filter(c => c.status === 'pending_approval')
  const filtered = companies
    .filter(c => tab === 'pending' ? c.status === 'pending_approval' : true)
    .filter(c => `${c.name} ${c.ownerEmail} ${c.ownerName}`.toLowerCase().includes(search.toLowerCase()))

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = async (id: string, data: any) => {
    try {
      await adminApi.updateCompany(id, data)
      toast.success('Company updated')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its data? This cannot be undone.`)) return
    setSelected(null)
    try {
      await adminApi.deleteCompany(id)
      toast.success('Company deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleImpersonate = async (companyId: string) => {
    setImpersonating(companyId)
    try {
      const res = await adminApi.impersonate(companyId)
      if (res.url) window.open(res.url, '_blank')
      else toast.error('Could not generate impersonation link')
    } catch (e: any) { toast.error(e.message) }
    setImpersonating(null)
  }

  const handleSuspend = async (c: any) => {
    const suspend = !c.suspended
    try {
      await adminApi.suspendCompany(c.id, suspend)
      toast.success(suspend ? 'Company suspended' : 'Company reactivated')
      load()
      // Update selected if open
      setSelected((prev: any) => prev?.id === c.id ? { ...prev, suspended: suspend } : prev)
    } catch (e: any) { toast.error(e.message) }
  }

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveCompany(id)
      toast.success('Company approved — verification email sent')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground mt-1">Manage all registered companies on the platform.</p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex rounded-lg border overflow-hidden">
          {(['all', 'pending'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize relative
                ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
              {t === 'all' ? 'All Companies' : 'Awaiting Approval'}
              {t === 'pending' && pending.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} companies</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {tab === 'pending' ? (
              <><CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-green-500" /><p>No companies awaiting approval.</p></>
            ) : <p>No companies found.</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.suspended && <Ban className="h-3.5 w-3.5 text-red-500" title="Suspended" />}
                      {c.status === 'pending_approval' && <AlertCircle className="h-3.5 w-3.5 text-amber-500" title="Awaiting Approval" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.ownerEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PLAN_COLORS[c.plan] || PLAN_COLORS.free}`}>
                      {c.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${c.suspended ? 'bg-red-500' : c.status === 'pending_approval' ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {c.suspended ? 'Suspended' : c.status === 'pending_approval' ? 'Pending' : 'Active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.userCount ?? 0}</span>
                      <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {c.studentCount ?? 0}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <CompanyModal
          company={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onImpersonate={handleImpersonate}
          onSuspend={handleSuspend}
          onApprove={handleApprove}
        />
      )}
    </div>
  )
}
