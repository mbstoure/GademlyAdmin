import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import {
  Search, Trash2, ExternalLink, Loader2, FileText, X,
  Building2, Calendar, Hash, ToggleLeft, ToggleRight, List,
} from 'lucide-react'
import { toast } from 'sonner'

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

// ── Form Detail Modal ─────────────────────────────────────────────────────────
function FormModal({ form, onClose, onDelete, onToggleActive }: {
  form: any
  onClose: () => void
  onDelete: (id: string, name: string) => void
  onToggleActive: (f: any) => Promise<void>
}) {
  const [toggling, setToggling] = useState(false)
  const fields: any[] = form.fields ?? form.schema ?? []
  const isActive = form.active !== false && form.status !== 'paused'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{form.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                <span className="text-xs text-muted-foreground">{isActive ? 'Active' : 'Paused'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Meta grid */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: Building2, label: 'Company',     value: form.companyName || '—' },
              { icon: Hash,      label: 'Submissions',  value: String(form.submissionCount ?? 0) },
              { icon: Calendar,  label: 'Created',      value: fmtDate(form.createdAt) },
              { icon: Calendar,  label: 'Last updated', value: fmtDate(form.updatedAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fields list */}
          {fields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <List className="h-3.5 w-3.5" /> Fields ({fields.length})
              </p>
              <div className="rounded-xl border divide-y divide-border overflow-hidden">
                {fields.map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">{i + 1}</span>
                    <span className="font-medium flex-1">{f.label || f.name || `Field ${i + 1}`}</span>
                    <span className="text-xs text-muted-foreground capitalize">{f.type || '—'}</span>
                    {f.required && <span className="text-xs text-red-500">required</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public URL */}
          {form.publicUrl && (
            <a href={form.publicUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{form.publicUrl}</span>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-2">
          <button
            onClick={async () => { setToggling(true); await onToggleActive(form); setToggling(false) }}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors
              ${isActive
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'}`}>
            {toggling
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : isActive ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
            {isActive ? 'Pause form' : 'Activate form'}
          </button>

          {form.publicUrl && (
            <a href={form.publicUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent">
              <ExternalLink className="h-3.5 w-3.5" />
              Open form
            </a>
          )}

          <button
            onClick={() => { onClose(); onDelete(form.id, form.name) }}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Forms() {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setForms((await adminApi.getForms()).forms || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = forms.filter(f =>
    `${f.name} ${f.companyName}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete form "${name}"?`)) return
    setBusy(id)
    try {
      await adminApi.deleteForm(id)
      toast.success('Form deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const handleToggleActive = async (f: any) => {
    const isActive = f.active !== false && f.status !== 'paused'
    try {
      await adminApi.updateForm(f.id, { active: !isActive, status: isActive ? 'paused' : 'active' })
      toast.success(isActive ? 'Form paused' : 'Form activated')
      load()
      setSelected((prev: any) => prev?.id === f.id ? { ...prev, active: !isActive, status: isActive ? 'paused' : 'active' } : prev)
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forms</h1>
        <p className="text-muted-foreground mt-1">All public forms across the platform. Click a row to view details.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search forms..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} forms</span>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No forms found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Form name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Submissions</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Created</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((f, idx) => {
                const isActive = f.active !== false && f.status !== 'paused'
                return (
                  <tr key={f.id || idx} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{f.companyName || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                        <span className="text-xs text-muted-foreground">{isActive ? 'Active' : 'Paused'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{f.submissionCount ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">{fmtDate(f.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setSelected(f)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(f.id, f.name) }}
                          disabled={busy === f.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-40 transition-colors"
                        >
                          {busy === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <FormModal
          form={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}
    </div>
  )
}
