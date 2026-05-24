import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { Search, Trash2, ExternalLink, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function Forms() {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forms</h1>
        <p className="text-muted-foreground mt-1">All public forms across the platform.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Form</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Submissions</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{f.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{f.submissionCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {f.publicUrl && (
                        <a
                          href={f.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                          title="Open form"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(f.id, f.name)}
                        disabled={busy === f.id}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-destructive disabled:opacity-40"
                        title="Delete"
                      >
                        {busy === f.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
