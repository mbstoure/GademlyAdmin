import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import { Save, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const [local, setLocal] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

      {/* Save button */}
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
    </div>
  )
}
