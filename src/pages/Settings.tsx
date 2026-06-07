import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { loadAdminSessions, revokeAdminSession, isSessionTrackingEnabled, enableSessionTracking, type AdminSession } from '../lib/sessionTracker'
import {
  Save, Loader2, AlertTriangle, Eye, EyeOff, KeyRound, Check, X,
  Monitor, Smartphone, Globe, Cpu, MapPin, Clock, ShieldCheck,
  Trash2, Plus, Settings2, CreditCard, Lock, Activity, Wifi, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSessionTime(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60_000)
    const h = Math.floor(diff / 3_600_000)
    if (m < 2)   return 'just now'
    if (m < 60)  return `${m}m ago`
    if (h < 24)  return `${h}h ago`
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

// ── Password strength checker ─────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Very weak', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' }
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score === 4) return { score, label: 'Strong', color: 'bg-blue-500' }
  return { score, label: 'Very strong', color: 'bg-green-500' }
}

const PW_RULES = [
  { label: 'At least 8 characters',  test: (pw: string) => pw.length >= 8 },
  { label: 'One uppercase letter',    test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'One number',              test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'One special character',   test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]

function Toggle({ on, onToggle, danger = false }: { on: boolean; onToggle: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30
        ${on ? (danger ? 'bg-destructive' : 'bg-primary') : 'bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function SettingRow({ label, description, children, danger = false }: {
  label: React.ReactNode; description?: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <div className={`px-6 py-4 flex items-center justify-between gap-4 ${danger ? 'bg-destructive/5' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${danger ? 'text-destructive' : ''}`}>{label}</p>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

type Tab = 'platform' | 'security' | 'sessions' | 'access'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'platform', label: 'Platform',       icon: Settings2 },
  { id: 'security', label: 'Security',        icon: Lock },
  { id: 'sessions', label: 'Sessions',        icon: Activity },
  { id: 'access',   label: 'Access Control',  icon: ShieldCheck },
]

export default function Settings() {
  const [tab, setTab] = useState<Tab>('platform')

  // ── Platform settings ─────────────────────────────────────────────────────
  const [local, setLocal] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Password change ───────────────────────────────────────────────────────
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew]     = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const strength       = getStrength(newPw)
  const passwordsMatch = newPw.length > 0 && newPw === confirmPw

  // ── Sessions ─────────────────────────────────────────────────────────
  const [trackingEnabled, setTrackingEnabled] = useState(isSessionTrackingEnabled)
  const [sessions, setSessions]               = useState<AdminSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionError, setSessionError]       = useState<string | null>(null)
  const [revokingId, setRevokingId]           = useState<string | null>(null)
  const [copiedSql, setCopiedSql]             = useState(false)

  // ── IP Allowlist ──────────────────────────────────────────────────────────
  const [newIp, setNewIp] = useState('')

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSettings()
      setLocal(res)
    } catch {}
    setLoading(false)
  }, [])

  const doLoadSessions = useCallback(async () => {
    if (!isSessionTrackingEnabled()) return   // no network calls until opted in
    setLoadingSessions(true)
    setSessionError(null)
    const { sessions: rows, error } = await loadAdminSessions()
    setSessions(rows)
    if (error) setSessionError(error)
    setLoadingSessions(false)
  }, [])

  const doEnableTracking = () => {
    enableSessionTracking()
    setTrackingEnabled(true)
    doLoadSessions()
  }

  const copySql = async () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  browser       text,
  device        text,
  os            text,
  ip            text DEFAULT 'unknown',
  location      text,
  logged_in_at  timestamptz NOT NULL DEFAULT now(),
  last_active   timestamptz NOT NULL DEFAULT now(),
  is_current    boolean DEFAULT false,
  revoked       boolean DEFAULT false,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS admin_sessions_user_idx
  ON public.admin_sessions(user_id, logged_in_at DESC);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sessions_insert" ON public.admin_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_sessions_select" ON public.admin_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_sessions_update" ON public.admin_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_sessions_delete" ON public.admin_sessions
  FOR DELETE USING (auth.uid() IS NOT NULL);`
    await navigator.clipboard.writeText(sql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  const doRevokeSession = async (id: string) => {
    setRevokingId(id)
    try {
      await revokeAdminSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success('Session revoked')
    } catch (e: any) {
      toast.error(e.message)
    }
    setRevokingId(null)
  }

  useEffect(() => { loadSettings() }, [loadSettings])
  // Only load sessions when tab is active AND tracking has been opted in
  useEffect(() => { if (tab === 'sessions' && trackingEnabled) doLoadSessions() }, [tab, trackingEnabled, doLoadSessions])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.updateSettings(local)
      toast.success('Settings saved')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch) { toast.error('Passwords do not match'); return }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setChangingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      toast.success('Password updated successfully')
      setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password')
    } finally {
      setChangingPw(false)
    }
  }

  const revokeSession = async (id: string) => {
    setRevokingId(id)
    try {
      await adminApi.revokeSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success('Session revoked')
    } catch (e: any) { toast.error(e.message) }
    finally { setRevokingId(null) }
  }

  const addIp = () => {
    const ip = newIp.trim()
    if (!ip) return
    const list: string[] = local.ipAllowlist || []
    if (!list.includes(ip)) {
      setLocal({ ...local, ipAllowlist: [...list, ip] })
    }
    setNewIp('')
  }

  const removeIp = (ip: string) => {
    setLocal({ ...local, ipAllowlist: (local.ipAllowlist || []).filter((x: string) => x !== ip) })
  }

  const toggleField = (key: string) => setLocal({ ...local, [key]: !local[key] })
  const setField    = (key: string, v: any) => setLocal({ ...local, [key]: v })

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings...
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Admin portal and platform configuration.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border bg-card p-1">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── PLATFORM TAB ──────────────────────────────────────────────────────── */}
      {tab === 'platform' && (
        <div className="space-y-6 max-w-2xl">
          <section className="space-y-0 rounded-xl border bg-card shadow-sm divide-y divide-border overflow-hidden">
            <div className="px-6 py-3 bg-muted/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General</p>
            </div>
            <SettingRow label="Platform Name" description="Displayed in emails and the UI">
              <input
                value={local.platformName || ''}
                onChange={e => setField('platformName', e.target.value)}
                className="flex h-9 w-44 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right"
              />
            </SettingRow>
            <SettingRow label="Support Email" description="Shown on invoices and billing pages">
              <input
                type="email"
                value={local.supportEmail || ''}
                onChange={e => setField('supportEmail', e.target.value)}
                placeholder="billing@gademly.com"
                className="flex h-9 w-44 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right"
              />
            </SettingRow>
            <SettingRow label="Allow new signups" description="Enable or disable new account creation">
              <Toggle on={!!local.allowSignups} onToggle={() => toggleField('allowSignups')} />
            </SettingRow>
            <SettingRow
              label={<span className="flex items-center gap-2">Maintenance mode {local.maintenanceMode && <AlertTriangle className="h-4 w-4 text-amber-500" />}</span>}
              description="Blocks all non-admin access"
              danger={!!local.maintenanceMode}
            >
              <Toggle on={!!local.maintenanceMode} onToggle={() => toggleField('maintenanceMode')} danger />
            </SettingRow>
          </section>

          <section className="space-y-0 rounded-xl border bg-card shadow-sm divide-y divide-border overflow-hidden">
            <div className="px-6 py-3 bg-muted/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Billing
              </p>
            </div>
            <SettingRow label="Stripe billing" description="Enable Stripe for automated payments">
              <Toggle on={!!local.stripeEnabled} onToggle={() => toggleField('stripeEnabled')} />
            </SettingRow>
            <SettingRow label="Manual billing" description="Accept manual bank transfers / invoices">
              <Toggle on={!!local.manualBilling} onToggle={() => toggleField('manualBilling')} />
            </SettingRow>
          </section>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save platform settings
            </button>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ──────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Change Password
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Update your super admin password. Your current active session is verified automatically.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="rounded-xl border bg-card shadow-sm divide-y divide-border overflow-hidden">
              {/* New password */}
              <div className="px-6 py-4 space-y-2">
                <label className="text-sm font-medium">New password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Enter a new password"
                    required autoComplete="new-password"
                    className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPw.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Strength</span>
                      <span className={`font-medium ${strength.score <= 2 ? 'text-red-500' : strength.score === 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-muted'}`} />
                      ))}
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                      {PW_RULES.map(r => (
                        <li key={r.label} className="flex items-center gap-1.5 text-xs">
                          {r.test(newPw) ? <Check className="h-3 w-3 text-green-500 shrink-0" /> : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <span className={r.test(newPw) ? 'text-foreground' : 'text-muted-foreground'}>{r.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="px-6 py-4 space-y-2">
                <label className="text-sm font-medium">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat your new password"
                    required autoComplete="new-password"
                    className={`flex h-10 w-full rounded-md border px-3 pr-10 py-2 text-sm bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors
                      ${confirmPw.length > 0 ? passwordsMatch ? 'border-green-500' : 'border-destructive' : 'border-input'}`}
                  />
                  <button type="button" onClick={() => setShowConf(!showConf)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPw.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3" /> Passwords do not match</p>
                )}
                {confirmPw.length > 0 && passwordsMatch && (
                  <p className="text-xs text-green-500 flex items-center gap-1"><Check className="h-3 w-3" /> Passwords match</p>
                )}
              </div>

              <div className="px-6 py-4 flex justify-end bg-muted/30">
                <button type="submit"
                  disabled={changingPw || !passwordsMatch || strength.score < 2}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Update password
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── SESSIONS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2"><Activity className="h-5 w-5" /> Active Sessions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Devices and browsers currently logged into the admin portal.
              </p>
            </div>
            {trackingEnabled && (
              <button
                onClick={doLoadSessions}
                disabled={loadingSessions}
                className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* ── SETUP CARD (shown when not opted in) ── */}
          {!trackingEnabled ? (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">One-time database setup required</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Session tracking stores login history in a Supabase table. Run the SQL below
                      once in your Supabase SQL editor, then click <strong>Enable Sessions</strong>.
                    </p>
                  </div>
                </div>

                {/* SQL block */}
                <div className="relative rounded-lg bg-muted border text-xs font-mono p-4 max-h-48 overflow-y-auto leading-relaxed whitespace-pre">{`CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  browser       text, device text, os text,
  ip            text DEFAULT 'unknown', location text,
  logged_in_at  timestamptz NOT NULL DEFAULT now(),
  last_active   timestamptz NOT NULL DEFAULT now(),
  is_current    boolean DEFAULT false,
  revoked       boolean DEFAULT false,
  revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS admin_sessions_user_idx
  ON public.admin_sessions(user_id, logged_in_at DESC);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sessions_insert" ON public.admin_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_sessions_select" ON public.admin_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_sessions_update" ON public.admin_sessions
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_sessions_delete" ON public.admin_sessions
  FOR DELETE USING (auth.uid() IS NOT NULL);`}</div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={copySql}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                  >
                    {copiedSql ? <Check className="h-4 w-4 text-green-500" /> : <Globe className="h-4 w-4" />}
                    {copiedSql ? 'Copied!' : 'Copy SQL'}
                  </button>
                  <button
                    onClick={doEnableTracking}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    I've run the migration — Enable Sessions
                  </button>
                </div>
              </div>
            </div>

          ) : (
            /* ── SESSION LIST (shown when opted in) ── */
            <>
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sessions...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="py-12 text-center space-y-2 text-muted-foreground">
                    <Monitor className="h-8 w-8 mx-auto opacity-30" />
                    <p className="text-sm">
                      {sessionError
                        ? 'Error loading sessions — the table may not exist yet.'
                        : 'No sessions recorded yet. Log out and back in to see this session appear here.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sessions.map(s => (
                      <div key={s.id} className={`flex items-start gap-4 p-4 transition-colors hover:bg-accent/20 ${s.isCurrent ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}>
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                          ${s.isCurrent ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                          {s.device === 'Mobile' || s.device === 'Tablet'
                            ? <Smartphone className={`h-5 w-5 ${s.isCurrent ? 'text-green-600' : 'text-muted-foreground'}`} />
                            : <Monitor   className={`h-5 w-5 ${s.isCurrent ? 'text-green-600' : 'text-muted-foreground'}`} />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{s.browser}</p>
                            <span className="text-xs text-muted-foreground">{s.os}</span>
                            {s.isCurrent && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                This session
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {s.ip && <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> {s.ip}</span>}
                            {s.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.location}</span>}
                            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {s.device}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Signed in {formatSessionTime(s.loggedInAt)}</span>
                            {s.lastActive !== s.loggedInAt && (
                              <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Active {formatSessionTime(s.lastActive)}</span>
                            )}
                          </div>
                        </div>
                        {!s.isCurrent && (
                          <button
                            onClick={() => doRevokeSession(s.id)}
                            disabled={revokingId === s.id}
                            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 disabled:opacity-40 transition-colors"
                          >
                            {revokingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-500" />
                Revoking removes the session from this list. Full JWT invalidation requires the user to also sign out on their device.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── ACCESS CONTROL TAB ────────────────────────────────────────────────── */}
      {tab === 'access' && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Access Control</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Restrict admin portal access to specific IP addresses.</p>
          </div>

          <section className="rounded-xl border bg-card shadow-sm divide-y divide-border overflow-hidden">
            <div className="px-6 py-3 bg-muted/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP Allowlist</p>
            </div>
            <SettingRow
              label="Enforce IP Allowlist"
              description="Only IPs in the list below can access the admin panel. Make sure your current IP is included before enabling."
              danger={!!local.enforceIpAllowlist}
            >
              <Toggle on={!!local.enforceIpAllowlist} onToggle={() => toggleField('enforceIpAllowlist')} danger />
            </SettingRow>

            <div className="px-6 py-4 space-y-3">
              {/* Add IP */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addIp()}
                  placeholder="e.g. 203.0.113.42"
                  className="flex h-10 flex-1 rounded-md border border-input bg-input-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button onClick={addIp}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {/* IP list */}
              {(local.ipAllowlist || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No IPs added. All IPs allowed (unless enforcement is on).</p>
              ) : (
                <ul className="space-y-1.5">
                  {(local.ipAllowlist || []).map((ip: string) => (
                    <li key={ip} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border">
                      <Wifi className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 text-sm font-mono">{ip}</span>
                      <button onClick={() => removeIp(ip)}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save access settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
