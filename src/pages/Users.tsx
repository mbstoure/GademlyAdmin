import { useEffect, useState, useMemo } from 'react'
import { adminApi } from '../lib/api'
import {
  Search, Trash2, Loader2, X, Users as UsersIcon, Building2,
  Mail, Calendar, ShieldCheck, ShieldOff, ChevronDown, ChevronRight,
  CheckCircle2, AlertCircle, User, Clock,
} from 'lucide-react'
import { toast } from 'sonner'

const ROLE_COLORS: Record<string, string> = {
  super_admin:   'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  company_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  agent:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const STATUS_COLORS: Record<string, string> = {
  active:           'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  banned:           'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  suspended:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  invited:          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending_approval: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  orphaned:         'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
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

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserModal({ user, onClose, onBan, onDelete, onApprove, busy }: {
  user: any
  onClose: () => void
  onBan: (u: any) => Promise<void>
  onDelete: (u: any) => Promise<void>
  onApprove: (id: string) => Promise<void>
  busy: boolean
}) {
  const isBanned    = user.status === 'banned' || user.suspended
  const isPending   = user.status === 'pending_approval'
  const effectiveStatus = user.suspended ? 'suspended' : user.status

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{user.fullName || '—'}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          {[
            { icon: Building2, label: 'Company',    value: user.companyName || '—' },
            { icon: ShieldCheck, label: 'Role',     value: user.role?.replace(/_/g, ' ') || '—' },
            { icon: Calendar,  label: 'Joined',     value: fmtDate(user.createdAt) },
            { icon: Clock,     label: 'Last login', value: fmt(user.lastLoginAt || user.lastSignInAt) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium capitalize">{value}</p>
              </div>
            </div>
          ))}

          {/* Status badge */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
            <div className={`w-2 h-2 rounded-full ${isBanned ? 'bg-red-500' : isPending ? 'bg-amber-500' : 'bg-green-500'}`} />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${STATUS_COLORS[effectiveStatus] || STATUS_COLORS.active}`}>
                {effectiveStatus?.replace(/_/g, ' ') || 'active'}
              </span>
            </div>
            {[user.role, user.role].includes('super_admin') && (
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${ROLE_COLORS.super_admin}`}>Super Admin</span>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t p-4 flex flex-wrap gap-2">
          {isPending && (
            <button onClick={() => onApprove(user.id)} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </button>
          )}
          {user.role !== 'super_admin' && (
            <>
              <button onClick={() => onBan(user)} disabled={busy}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors
                  ${isBanned
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isBanned ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                {isBanned ? 'Reactivate' : 'Suspend'}
              </button>
              <button onClick={() => onDelete(user)} disabled={busy}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [companySearch, setCompanySearch] = useState('')
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<any>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setUsers((await adminApi.getUsers()).users || []) } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // All unique companies derived from both users and from companyId/companyName pairing.
  // Also tracks which companyIds are present so we can detect orphaned users.
  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>()
    users.forEach(u => {
      if (u.companyId && u.companyName) map.set(u.companyId, u.companyName)
    })
    return map
  }, [users])

  // Set of companyIds that still exist (have at least one user with a companyName).
  // Users with a companyId NOT in this set belong to a deleted company.
  const existingCompanyIds = useMemo(() => new Set(companyNameMap.keys()), [companyNameMap])

  const companies = useMemo(() => {
    return Array.from(companyNameMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [companyNameMap])

  // Separate real users from invited-only ghost records.
  // A ghost = has a companyId but no email AND no fullName (incomplete signup).
  // Also exclude ghosts whose invite email matches a real joined user (they already signed up).
  const { realUsers, ghostUsers } = useMemo(() => {
    const real: any[] = [], ghost: any[] = []
    const joinedEmails = new Set<string>()
    users.forEach(u => { if (u.email) joinedEmails.add(u.email.toLowerCase()) })
    users.forEach(u => {
      const isGhost = !u.email && !u.fullName
      if (isGhost) ghost.push(u)
      else real.push(u)
    })
    // Filter ghosts: exclude any whose invite email is already a joined user
    const cleanGhosts = ghost.filter(g => !g.inviteEmail || !joinedEmails.has(g.inviteEmail.toLowerCase()))
    return { realUsers: real, ghostUsers: cleanGhosts }
  }, [users])

  const filtered = useMemo(() => realUsers.filter(u => {
    const q = search.toLowerCase()
    // Resolve company name from map if not present on record
    const cName = u.companyName || companyNameMap.get(u.companyId) || ''
    const matchQ = !q || `${u.fullName} ${u.email} ${cName}`.toLowerCase().includes(q)
    const matchR = roleFilter === 'all' || u.role === roleFilter
    const matchS = statusFilter === 'all' || (u.suspended ? 'suspended' : u.status) === statusFilter
    const matchC = companyFilter === 'all' || u.companyId === companyFilter
    return matchQ && matchR && matchS && matchC
  }), [realUsers, search, roleFilter, statusFilter, companyFilter, companyNameMap])

  // Count orphaned users (have a companyId but their company no longer exists)
  const orphanedCount = useMemo(
    () => realUsers.filter(u => u.companyId && !existingCompanyIds.has(u.companyId)).length,
    [realUsers, existingCompanyIds]
  )

  // Grouped by company — resolve name from companyNameMap when companyName is missing
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; users: any[]; ghosts: any[] }>()
    // Real users
    filtered.forEach(u => {
      const key = u.companyId || '__none__'
      const name = u.companyName || companyNameMap.get(u.companyId) || 'No Company'
      if (!map.has(key)) map.set(key, { name, users: [], ghosts: [] })
      map.get(key)!.users.push({ ...u, companyName: name })
    })
    // Attach ghost invited users to their company groups
    ghostUsers.forEach(u => {
      if (!u.companyId) return // truly orphaned, skip
      const key = u.companyId
      const name = u.companyName || companyNameMap.get(u.companyId) || 'Unknown Company'
      if (!map.has(key)) map.set(key, { name, users: [], ghosts: [] })
      map.get(key)!.ghosts.push({ ...u, companyName: name })
    })
    return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [filtered, ghostUsers, companyNameMap])

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleBan = async (u: any) => {
    setBusy(u.id)
    try {
      const banned = u.status !== 'banned' && !u.suspended
      await adminApi.updateUser(u.id, { banned })
      toast.success(banned ? 'User suspended' : 'User reactivated')
      load()
      setSelected(null)
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const handleDelete = async (u: any) => {
    const label = u.email || u.fullName || 'this user'
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return
    setBusy(u.id)
    setSelected(null)
    try {
      await adminApi.deleteUser(u.id)
      toast.success('User deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const handleApprove = async (id: string) => {
    setBusy(id)
    try {
      await adminApi.approveUser(id)
      toast.success('User approved — verification email sent')
      load()
      setSelected(null)
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
  const roles = ['all', 'super_admin', 'company_admin', 'agent']
  const statuses = ['all', 'active', 'suspended', 'invited', 'pending_approval']

  const pendingCount = users.filter(u => u.status === 'pending_approval').length

  // ── Row render ───────────────────────────────────────────────────────────────
  const UserRow = ({ u }: { u: any }) => {
    const effectiveStatus = u.suspended ? 'suspended' : u.status
    const isOrphaned = u.companyId && !existingCompanyIds.has(u.companyId)
    return (
      <tr onClick={() => setSelected(u)} className="hover:bg-accent/30 transition-colors cursor-pointer">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{u.fullName || '—'}</span>
            {u.status === 'pending_approval' && <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
            {isOrphaned && <span title="Company was deleted"><AlertCircle className="h-3.5 w-3.5 text-slate-400" /></span>}
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-sm">{u.email}</td>
        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">
          {isOrphaned
            ? <span className="text-xs text-slate-400 italic">Company deleted</span>
            : (u.companyName || '—')}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.agent}`}>
            {u.role?.replace(/_/g, ' ') || 'agent'}
          </span>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
            isOrphaned ? STATUS_COLORS.orphaned : (STATUS_COLORS[effectiveStatus] || STATUS_COLORS.active)
          }`}>
            {isOrphaned ? 'orphaned' : (effectiveStatus?.replace(/_/g, ' ') || 'active')}
          </span>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            All users across the platform.
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">{pendingCount} awaiting approval</span>
            )}
            {orphanedCount > 0 && (
              <span className="ml-2 text-slate-500 font-medium">
                · {orphanedCount} orphaned (company deleted — can still be deleted)
              </span>
            )}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(['grouped', 'flat'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors
                ${viewMode === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
              {m === 'grouped' ? '⊞ By Company' : '≡ Flat'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search users..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Role filter */}
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          title="Filter by role"
          className="h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {roles.map(r => (
            <option key={r} value={r}>{r === 'all' ? 'All roles' : r.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          title="Filter by status"
          className="h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {statuses.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {/* Company filter */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(dropdownOpen === 'company' ? null : 'company')}
            className="flex items-center gap-2 h-10 px-3 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors max-w-[180px]">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{companyFilter === 'all' ? 'All companies' : companies.find(c => c.id === companyFilter)?.name || 'Company'}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
          {dropdownOpen === 'company' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(null)} />
              <div className="absolute left-0 mt-2 w-64 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b">
                  <input autoFocus placeholder="Search companies..." value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    className="w-full rounded-md border border-input bg-input-background px-3 py-1.5 text-sm outline-none" />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  <button onClick={() => { setCompanyFilter('all'); setDropdownOpen(null) }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${companyFilter === 'all' ? 'bg-accent' : 'hover:bg-accent'}`}>
                    All companies
                  </button>
                  {filteredCompanies.map(c => (
                    <button key={c.id} onClick={() => { setCompanyFilter(c.id); setDropdownOpen(null) }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${companyFilter === c.id ? 'bg-accent' : 'hover:bg-accent'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <span className="text-sm text-muted-foreground">
          {filtered.length} users
          {ghostUsers.length > 0 && <span className="ml-2 text-amber-600">· {ghostUsers.length} pending invite</span>}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
        ) : viewMode === 'flat' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u, idx) => <UserRow key={u.id || idx} u={u} />)}
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(([key, { name, users: groupUsers, ghosts }]) => {
              const isOpen = expandedGroups.has(key)
              return (
                <div key={key}>
                  {/* Group header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroup(key)}
                    onKeyDown={e => e.key === 'Enter' && toggleGroup(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer select-none"
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-sm">{name}</span>
                    <span className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" /> {groupUsers.length}
                      </span>
                      {ghosts.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Mail className="h-3 w-3" /> {ghosts.length} invited
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Users in group */}
                  {isOpen && (
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {groupUsers.map((u, idx) => <UserRow key={u.id || idx} u={u} />)}
                        {/* Ghost invited rows */}
                        {ghosts.map((g, idx) => (
                          <tr key={g.id || `ghost-${idx}`} className="bg-amber-50/40 dark:bg-amber-950/10">
                            <td className="px-4 py-2.5" colSpan={4}>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                  {g.email || 'Pending invite — signup not completed'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                                  invited
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <UserModal
          user={selected}
          onClose={() => setSelected(null)}
          onBan={handleBan}
          onDelete={handleDelete}
          onApprove={handleApprove}
          busy={busy === selected.id}
        />
      )}
    </div>
  )
}
