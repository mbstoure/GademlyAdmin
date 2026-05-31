import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { Search, Trash2, Pencil, LogIn, X, Check, Loader2, Users, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  enterprise: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setCompanies((await adminApi.getCompanies()).companies || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = companies.filter(c =>
    `${c.name} ${c.ownerEmail}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await adminApi.updateCompany(editing.id, { name: editing.name, plan: editing.plan })
      toast.success('Company updated')
      setEditing(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its data? This cannot be undone.`)) return
    try {
      await adminApi.deleteCompany(id)
      toast.success('Company deleted')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleImpersonate = async (companyId: string) => {
    setImpersonating(companyId)
    try {
      const res = await adminApi.impersonate(companyId)
      if (res.url) window.open(res.url, '_blank')
      else toast.error('Could not generate impersonation link')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setImpersonating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted-foreground mt-1">
          Manage all registered companies on the platform.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <div className="py-16 text-center text-sm text-muted-foreground">No companies found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Usage</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.ownerEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PLAN_COLORS[c.plan] || PLAN_COLORS.free}`}>
                      {c.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.userCount ?? 0}</span>
                      <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {c.studentCount ?? 0}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleImpersonate(c.id)}
                        disabled={impersonating === c.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:bg-accent transition-colors text-muted-foreground"
                        title="Impersonate"
                      >
                        {impersonating === c.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <LogIn className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">Login as</span>
                      </button>
                      <button
                        onClick={() => setEditing({ ...c })}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditing(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-xl border bg-card text-card-foreground shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Company</h2>
                <button onClick={() => setEditing(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <select
                  value={editing.plan || 'starter'}
                  onChange={e => setEditing({ ...editing, plan: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
