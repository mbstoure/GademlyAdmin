import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import {
  Bell, Send, Users, Building2, Loader2, CheckCheck,
  Mail, Megaphone, Clock, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function Notifications() {
  const [companies, setCompanies] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loadingBC, setLoadingBC] = useState(true)

  // Broadcast form
  const [form, setForm] = useState({
    title: '',
    body: '',
    link: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
    targetCompanyId: '',
  })
  const [sending, setSending] = useState(false)

  // Digest
  const [digestType, setDigestType] = useState<'daily' | 'weekly'>('daily')
  const [sendingDigest, setSendingDigest] = useState(false)

  const load = async () => {
    setLoadingBC(true)
    try {
      const [bcRes, compRes] = await Promise.all([
        adminApi.getBroadcasts(),
        adminApi.getCompanies(),
      ])
      setBroadcasts(bcRes.broadcasts || [])
      setCompanies(compRes.companies || [])
    } catch { }
    setLoadingBC(false)
  }

  useEffect(() => { load() }, [])

  const handleBroadcast = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSending(true)
    try {
      const res = await adminApi.broadcast({
        title: form.title,
        body: form.body,
        link: form.link || undefined,
        priority: form.priority,
        targetCompanyId: form.targetCompanyId || undefined,
      })
      toast.success(`Sent to ${res.delivered} user${res.delivered !== 1 ? 's' : ''}`)
      setForm({ title: '', body: '', link: '', priority: 'normal', targetCompanyId: '' })
      load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to send')
    }
    setSending(false)
  }

  const handleDigest = async () => {
    setSendingDigest(true)
    try {
      const res = await adminApi.sendDigest(digestType)
      toast.success(`Digest sent to ${res.sent} user${res.sent !== 1 ? 's' : ''}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to send digest')
    }
    setSendingDigest(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-1">
          Broadcast messages to agencies and trigger email digests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Broadcast Panel ────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Send Broadcast</p>
              <p className="text-xs text-muted-foreground">Push an in-app notification to users</p>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Target audience
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={form.targetCompanyId}
                onChange={e => setForm(f => ({ ...f, targetCompanyId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-input-background pl-9 pr-8 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none"
              >
                <option value="">🌐 All users (entire platform)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
            <div className="flex gap-2">
              {(['low', 'normal', 'high'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    form.priority === p
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Platform maintenance scheduled"
              maxLength={80}
              className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write your message here…"
              rows={3}
              maxLength={300}
              className="flex w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{form.body.length}/300</p>
          </div>

          {/* Link (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Link <span className="normal-case text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={form.link}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="e.g. /settings or https://…"
              className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            onClick={handleBroadcast}
            disabled={sending || !form.title.trim() || !form.body.trim()}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>

        {/* ── Email Digest Panel ─────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Mail className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold">Email Digest</p>
                <p className="text-xs text-muted-foreground">
                  Trigger a digest email for users who have enabled it
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Digest type</label>
              <div className="flex gap-2">
                {(['daily', 'weekly'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setDigestType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize border transition-all ${
                      digestType === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">What this does</p>
              <p>• Sends to users whose digest preference is set to <strong>{digestType}</strong></p>
              <p>• Only users with unread notifications receive the email</p>
              <p>• Requires SendGrid to be configured in Platform Settings</p>
            </div>

            <button
              onClick={handleDigest}
              disabled={sendingDigest}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border font-semibold text-sm hover:bg-accent transition-colors disabled:opacity-40"
            >
              {sendingDigest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              {sendingDigest ? 'Sending…' : `Send ${digestType} digest now`}
            </button>
          </div>

          {/* Quick stats */}
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Broadcast history
            </p>
            <p className="text-xs text-muted-foreground">{broadcasts.length} message{broadcasts.length !== 1 ? 's' : ''} sent</p>
          </div>
        </div>
      </div>

      {/* Broadcast history table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="font-semibold flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
            Sent broadcasts
          </p>
        </div>
        {loadingBC ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No broadcasts sent yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Message</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Target</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Priority</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Sent by</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {broadcasts.map(b => (
                <tr key={b.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{b.body}</p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {b.targetCompanyId
                      ? companies.find(c => c.id === b.targetCompanyId)?.name || b.targetCompanyId
                      : '🌐 All users'}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[b.priority] || PRIORITY_COLORS.normal}`}>
                      {b.priority || 'normal'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{b.sentBy}</td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">{timeAgo(b.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
