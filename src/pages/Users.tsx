import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { Search, Ban, Trash2, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_COLORS: Record<string, string> = {
  super_admin:   'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  company_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  agent:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  banned:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  invited: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setUsers((await adminApi.getUsers()).users || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchQ = `${u.fullName} ${u.email}`.toLowerCase().includes(q)
    const matchR = roleFilter === 'all' || u.role === roleFilter
    return matchQ && matchR
  })

  const toggleBan = async (u: any) => {
    setBusy(u.id)
    try {
      const banned = u.status !== 'banned'
      await adminApi.updateUser(u.id, { banned })
      toast.success(banned ? 'User banned' : 'User unbanned')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    setBusy(id)
    try {
      await adminApi.deleteUser(id)
      toast.success('User deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const roles = ['all', 'super_admin', 'company_admin', 'agent']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">All users across the platform.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Role filter */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 h-10 px-3 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            <span className="capitalize">{roleFilter === 'all' ? 'All roles' : roleFilter.replace('_', ' ')}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-1 shadow-md z-50">
                {roles.map(r => (
                  <button
                    key={r}
                    onClick={() => { setRoleFilter(r); setFilterOpen(false) }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors text-left
                      ${roleFilter === r ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    <span className="capitalize">{r === 'all' ? 'All roles' : r.replace('_', ' ')}</span>
                    {roleFilter === r && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-sm text-muted-foreground">{filtered.length} users</span>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u, idx) => (
                <tr key={u.id || u.email || idx} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.fullName || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.agent}`}>
                      {u.role?.replace('_', ' ') || 'agent'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[u.status] || STATUS_COLORS.active}`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleBan(u)}
                        disabled={busy === u.id || u.role === 'super_admin'}
                        className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground disabled:opacity-40"
                        title={u.status === 'banned' ? 'Unban' : 'Ban'}
                      >
                        {busy === u.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Ban className="h-3.5 w-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={busy === u.id || u.role === 'super_admin'}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-destructive disabled:opacity-40"
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
    </div>
  )
}
