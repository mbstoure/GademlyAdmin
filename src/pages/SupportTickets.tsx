import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  MessageSquare, Search, RefreshCw, ChevronRight,
  AlertTriangle, AlertCircle, Info, Zap, CheckCircle2,
  Clock, User, Building2, Tag, Image as ImageIcon,
  X, Send, Loader2, Mail, MessageSquarePlus,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved'
type Priority = 'low' | 'medium' | 'high' | 'critical'

interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  description: string
  category: string
  priority: Priority
  status: TicketStatus
  imageUrls?: string[]
  createdAt: string
  updatedAt: string
  companyId?: string
  companyName?: string
  userId?: string
  userEmail?: string
  userFullName?: string
  adminNote?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<Priority, { label: string; color: string; icon: React.ElementType }> = {
  low:      { label: 'Low',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icon: Info },
  medium:   { label: 'Medium',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   icon: AlertCircle },
  high:     { label: 'High',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',       icon: Zap },
}

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  open:        { label: 'Open',        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TicketDetail({
  ticket,
  onClose,
  onStatusChange,
}: {
  ticket: SupportTicket
  onClose: () => void
  onStatusChange: (id: string, status: TicketStatus) => void
}) {
  const [note, setNote] = useState(ticket.adminNote || '')
  const [saving, setSaving] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const PIcon = PRIORITY_META[ticket.priority]?.icon || Info

  const saveNote = async () => {
    setSaving(true)
    try {
      await adminApi.updateSupportTicket(ticket.id, { adminNote: note })
    } catch {}
    setSaving(false)
  }

  const sendReply = async () => {
    if (!reply.trim()) return
    setSendingReply(true)
    try {
      // Send reply via API (creates in-app notification to user)
      await adminApi.replyToTicket(ticket.id, reply.trim())
      // Also broadcast as notification so it shows in user's bell
      await adminApi.broadcast({
        title: `Re: ${ticket.subject}`,
        body: reply.trim(),
        link: `/support`,
        priority: 'normal',
        ...(ticket.userId ? { targetUserId: ticket.userId } : {}),
        ...(ticket.companyId ? { targetCompanyId: ticket.companyId } : {}),
      }).catch(() => {})
      setReply('')
    } catch (e: any) {
      // Show toast if available, else console
      console.error('Reply failed:', e)
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">#{ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase()}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_META[ticket.priority]?.color}`}>
                <PIcon className="h-3 w-3 inline mr-1" />{PRIORITY_META[ticket.priority]?.label}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_META[ticket.status]?.color}`}>
                {STATUS_META[ticket.status]?.label}
              </span>
            </div>
            <h2 className="font-bold text-lg leading-tight">{ticket.subject}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {ticket.userFullName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.userFullName}</span>}
              {ticket.userEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{ticket.userEmail}</span>}
              {ticket.companyName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{ticket.companyName}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmt(ticket.createdAt)}</span>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-md hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Category */}
          <div className="flex items-center gap-2 text-sm">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Category:</span>
            <span className="font-medium capitalize">{ticket.category}</span>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</p>
            <div className="bg-muted/40 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</div>
          </div>

          {/* Screenshots */}
          {ticket.imageUrls && ticket.imageUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Screenshots
              </p>
              <div className="flex gap-2 flex-wrap">
                {ticket.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Screenshot ${i + 1}`} className="h-32 w-32 object-cover rounded-xl border hover:opacity-90 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Status change */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Update Status</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_META) as TicketStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(ticket.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                    ${ticket.status === s
                      ? STATUS_META[s].color + ' border-current'
                      : 'hover:bg-accent border-border'
                    }
                  `}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            {ticket.status !== 'resolved' && (
              <p className="text-xs text-muted-foreground">Changing status to "Resolved" will automatically notify the user.</p>
            )}
          </div>

          {/* Reply to user */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Reply to User
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={3}
                placeholder="Type a message to send to the user as an in-app notification…"
                className="w-full bg-transparent px-3 py-2 text-sm outline-none resize-none"
              />
              <div className="flex justify-end px-3 py-2 border-t bg-muted/20">
                <Button size="sm" onClick={sendReply} disabled={sendingReply || !reply.trim()} className="gap-1.5">
                  {sendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send to User
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">This will appear in the user's notification bell.</p>
          </div>

          {/* Internal note */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Internal Note</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note for your team (not shown to the user)…"
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <Button size="sm" onClick={saveNote} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export interface SupportTicketsProps {
  highlightId?: string | null
}

export default function SupportTickets({ highlightId }: SupportTicketsProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [selected, setSelected] = useState<SupportTicket | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.getSupportTickets()
      setTickets(data.tickets || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-open highlighted ticket
  useEffect(() => {
    if (highlightId && tickets.length > 0) {
      const t = tickets.find(t => t.id === highlightId)
      if (t) setSelected(t)
    }
  }, [highlightId, tickets])

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    try {
      await adminApi.updateSupportTicket(id, { status })
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev)

      // Auto-notify user when ticket is resolved
      if (status === 'resolved') {
        const ticket = tickets.find(t => t.id === id)
        if (ticket) {
          await adminApi.broadcast({
            title: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase()} Resolved`,
            body: `Your support request "${ticket.subject}" has been resolved. Thank you for reaching out!`,
            link: `/support`,
            priority: 'normal',
            ...(ticket.companyId ? { targetCompanyId: ticket.companyId } : {}),
          }).catch(() => {}) // Don't block on notification failure
        }
      }
    } catch {}
  }

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (t.subject + t.description + (t.userEmail || '') + (t.companyName || '')).toLowerCase().includes(q)
    }
    return true
  })

  const openCount = tickets.filter(t => t.status === 'open').length
  const criticalCount = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Support Tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount} open · {criticalCount > 0 && <span className="text-red-500 font-medium">{criticalCount} critical</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(STATUS_META) as TicketStatus[]).map(s => {
          const count = tickets.filter(t => t.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${statusFilter === s ? 'ring-2 ring-primary' : ''}`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-full w-fit ${STATUS_META[s].color}`}>{STATUS_META[s].label}</p>
            </button>
          )
        })}
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-2xl font-bold">{tickets.length}</p>
          <p className="text-xs font-semibold mt-1 text-muted-foreground">Total</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, email, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as any)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Priorities</option>
          {(Object.keys(PRIORITY_META) as Priority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
          ))}
        </select>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <CheckCircle2 className="h-10 w-10 mx-auto opacity-30" />
          <p className="font-medium">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const PIcon = PRIORITY_META[ticket.priority]?.icon || Info
            return (
              <button
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className="w-full rounded-xl border bg-card hover:bg-accent/50 transition-colors p-4 text-left flex items-start gap-4 group"
              >
                {/* Priority icon */}
                <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${PRIORITY_META[ticket.priority]?.color}`}>
                  <PIcon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight line-clamp-1">{ticket.subject}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_META[ticket.status]?.color}`}>
                        {STATUS_META[ticket.status]?.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {ticket.userEmail && <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{ticket.userEmail}</span>}
                    {ticket.companyName && <span className="flex items-center gap-0.5"><Building2 className="h-3 w-3" />{ticket.companyName}</span>}
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{fmt(ticket.createdAt)}</span>
                    <span className="capitalize">{ticket.category}</span>
                  </div>
                </div>

                <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform mt-1" />
              </button>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
