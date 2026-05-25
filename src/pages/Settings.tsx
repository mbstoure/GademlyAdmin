import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { Save, Loader2, AlertTriangle, Eye, EyeOff, KeyRound, Check, X } from 'lucide-react'
import { toast } from 'sonner'

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

const RULES = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'One number', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]

export default function Settings() {
  // ── Platform settings state ───────────────────────────────────────────────
  const [local, setLocal] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Password change state ─────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const strength = getStrength(newPw)
  const passwordsMatch = newPw.length > 0 && newPw === confirmPw

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSettings()
      setLocal(res)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
      // Re-authenticate with current password first to confirm identity
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Could not identify current user')

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      })
      if (signInErr) throw new Error('Current password is incorrect')

      // Now update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
      if (updateErr) throw updateErr

      toast.success('Password updated successfully')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password')
    } finally {
      setChangingPw(false)
    }
  }

  const toggleField = (key: string) => setLocal({ ...local, [key]: !local[key] })
  const setField = (key: string, value: any) => setLocal({ ...local, [key]: value })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Global platform configuration.</p>
      </div>

      {/* Platform */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Platform</h2>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm divide-y divide-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Platform Name</p>
              <p className="text-sm text-muted-foreground">Displayed in emails and the UI</p>
            </div>
            <input
              value={local.platformName || ''}
              onChange={e => setField('platformName', e.target.value)}
              className="flex h-9 w-48 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right"
            />
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Allow new signups</p>
              <p className="text-sm text-muted-foreground">Enable or disable new account creation</p>
            </div>
            <button
              onClick={() => toggleField('allowSignups')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local.allowSignups ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${local.allowSignups ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2">
                Maintenance mode
                {local.maintenanceMode && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </p>
              <p className="text-sm text-muted-foreground">Blocks all non-admin access</p>
            </div>
            <button
              onClick={() => toggleField('maintenanceMode')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local.maintenanceMode ? 'bg-destructive' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${local.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Billing */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Billing</h2>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm divide-y divide-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Stripe billing</p>
              <p className="text-sm text-muted-foreground">Enable Stripe for automated payments</p>
            </div>
            <button
              onClick={() => toggleField('stripeEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local.stripeEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${local.stripeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Manual billing</p>
              <p className="text-sm text-muted-foreground">Accept manual bank transfers / invoices</p>
            </div>
            <button
              onClick={() => toggleField('manualBilling')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${local.manualBilling ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${local.manualBilling ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Support email</p>
              <p className="text-sm text-muted-foreground">Shown on invoices and billing pages</p>
            </div>
            <input
              type="email"
              value={local.supportEmail || ''}
              onChange={e => setField('supportEmail', e.target.value)}
              placeholder="billing@gademly.com"
              className="flex h-9 w-48 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right"
            />
          </div>
        </div>
      </section>

      {/* Save platform settings */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
      </div>

      {/* ── Account Security ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Account Security
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Change your super admin password. You must enter your current password to confirm your identity.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="rounded-xl border bg-card text-card-foreground shadow-sm divide-y divide-border">
          {/* Current password */}
          <div className="px-6 py-4 space-y-2">
            <label className="text-sm font-medium">Current password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
                className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="px-6 py-4 space-y-2">
            <label className="text-sm font-medium">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Enter a new password"
                required
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPw.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Strength</span>
                  <span className={`font-medium ${
                    strength.score <= 2 ? 'text-red-500' :
                    strength.score === 3 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>{strength.label}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                {/* Rules */}
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  {RULES.map(r => (
                    <li key={r.label} className="flex items-center gap-1.5 text-xs">
                      {r.test(newPw)
                        ? <Check className="h-3 w-3 text-green-500 shrink-0" />
                        : <X className="h-3 w-3 text-muted-foreground shrink-0" />}
                      <span className={r.test(newPw) ? 'text-foreground' : 'text-muted-foreground'}>
                        {r.label}
                      </span>
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
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat your new password"
                required
                autoComplete="new-password"
                className={`flex h-10 w-full rounded-md border px-3 pr-10 py-2 text-sm bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  confirmPw.length > 0
                    ? passwordsMatch
                      ? 'border-green-500'
                      : 'border-destructive'
                    : 'border-input'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPw.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <X className="h-3 w-3" /> Passwords do not match
              </p>
            )}
            {confirmPw.length > 0 && passwordsMatch && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="px-6 py-4 flex justify-end bg-muted/30">
            <button
              type="submit"
              disabled={changingPw || !currentPw || !passwordsMatch || strength.score < 2}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update password
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
