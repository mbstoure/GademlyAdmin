import { useState, useEffect, useRef } from 'react'
import {
  FileText, Save, Upload, Eye, EyeOff, Plus, Trash2,
  Loader2, Check, AlertTriangle, Globe, Languages, X, History,
} from 'lucide-react'
import { adminApi } from '../lib/api'
import { toast } from 'sonner'

// Lightweight sanitizer for the preview panel (admin-only, low risk)
const sanitizeHtml = (html: string) =>
  html.replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')

// ── Version helpers ───────────────────────────────────────────────────────────
function bumpPatch(version: string): string {
  const parts = version.trim().split('.')
  if (parts.length === 1) return `${version}.1`
  const last = parseInt(parts[parts.length - 1], 10)
  parts[parts.length - 1] = String(isNaN(last) ? 1 : last + 1)
  return parts.join('.')
}

// ── History storage ───────────────────────────────────────────────────────────
type HistoryEntry = { version: string; lang: string; date: string; changes: string[] }

function loadHistory(docKey: string): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(`legal_history_${docKey}`) || '[]') } catch { return [] }
}
function saveHistory(docKey: string, entries: HistoryEntry[]) {
  try { localStorage.setItem(`legal_history_${docKey}`, JSON.stringify(entries.slice(0, 30))) } catch {}
}

type DocKey  = 'tos' | 'pp' | 'dpa'
type LangKey = 'en' | 'ar' | 'fr'

const DOCS: { key: DocKey; label: string; icon: string }[] = [
  { key: 'tos', label: 'Terms of Service',        icon: '📋' },
  { key: 'pp',  label: 'Privacy Policy',          icon: '🔒' },
  { key: 'dpa', label: 'Data Processing Addendum', icon: '🛡️' },
]

const LANGS: { key: LangKey; flag: string; label: string }[] = [
  { key: 'en', flag: '🇬🇧', label: 'English' },
  { key: 'fr', flag: '🇫🇷', label: 'French'  },
  { key: 'ar', flag: '🇸🇦', label: 'Arabic'  },
]


type DocState = {
  version:       string
  effectiveDate: string
  changes:       string[]
  dirty:         boolean
  loading:       boolean
  // Content per language
  content: Record<LangKey, string>
  // Which langs have been saved/published in this session
  savedLangs: Set<LangKey>
}

type AllState = Record<DocKey, DocState>

const emptyDoc = (): DocState => ({
  version:       '1.0',
  effectiveDate: '',
  changes:       [],
  dirty:         false,
  loading:       true,
  content:       { en: '', ar: '', fr: '' },
  savedLangs:    new Set(),
})

export default function LegalDocs() {
  const [activeDoc,  setActiveDoc]  = useState<DocKey>('tos')
  const [activeLang, setActiveLang] = useState<LangKey>('en')
  const [preview,    setPreview]    = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [state, setState] = useState<AllState>({
    tos: emptyDoc(),
    pp:  emptyDoc(),
    dpa: emptyDoc(),
  })

  const [publishing,   setPublishing]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [publishResult, setPublishResult] = useState<any>(null)

  // Per-doc publish history (stored in localStorage)
  const [history, setHistory] = useState<Record<DocKey, HistoryEntry[]>>({
    tos: loadHistory('tos'),
    pp:  loadHistory('pp'),
    dpa: loadHistory('dpa'),
  })

  // Reminder banner: set when user publishes only some languages
  const [reminder, setReminder] = useState<{ doc: DocKey; publishedLang: LangKey } | null>(null)

  // Track which (doc+lang) combos have been fetched — prevents stale-closure re-fetching
  const loadedRef = useRef<Set<string>>(new Set(['tos-en', 'pp-en', 'dpa-en']))

  // ── Fetch doc config once + content per-lang lazily ───────────────────────
  const loadDoc = async (doc: DocKey) => {
    setState(s => ({ ...s, [doc]: { ...s[doc], loading: true } }))
    try {
      const [configRes, enRes] = await Promise.all([
        adminApi.getLegalConfig(),
        adminApi.getLegalContent(doc, 'en'),
      ])
      const meta = configRes.config?.[doc] || {}
      setState(s => ({
        ...s,
        [doc]: {
          ...s[doc],
          version:       meta.version       || '1.0',
          effectiveDate: meta.effectiveDate || 'May 26, 2026',
          changes:       meta.changes       || [],
          content:       { ...s[doc].content, en: enRes.content || '' },
          dirty:         false,
          loading:       false,
        },
      }))
    } catch {
      toast.error(`Failed to load ${doc.toUpperCase()}`)
      setState(s => ({ ...s, [doc]: { ...s[doc], loading: false } }))
    }
  }

  // Load language-specific content on tab switch (lazy, deduplicated via ref)
  const loadLangContent = async (doc: DocKey, lang: LangKey) => {
    const key = `${doc}-${lang}`
    if (loadedRef.current.has(key)) return // already fetched this session
    loadedRef.current.add(key) // mark as in-progress immediately
    try {
      const res = await adminApi.getLegalContent(doc, lang)
      setState(s => ({
        ...s,
        [doc]: { ...s[doc], content: { ...s[doc].content, [lang]: res.content || '' } },
      }))
    } catch {
      // Content may not exist yet — that's fine, textarea stays empty and editable
      // Don't remove from loadedRef; we don't want to retry on every tab switch
    }
  }

  useEffect(() => { DOCS.forEach(d => loadDoc(d.key)) }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadLangContent(activeDoc, activeLang) }, [activeDoc, activeLang])

  const set = (doc: DocKey, patch: Partial<Omit<DocState, 'content' | 'savedLangs'>>) =>
    setState(s => ({ ...s, [doc]: { ...s[doc], ...patch, dirty: true } }))

  const setContent = (doc: DocKey, lang: LangKey, val: string) =>
    setState(s => ({
      ...s,
      [doc]: { ...s[doc], content: { ...s[doc].content, [lang]: val }, dirty: true },
    }))

  const addChange    = (doc: DocKey) => set(doc, { changes: [...state[doc].changes, ''] })
  const updateChange = (doc: DocKey, i: number, val: string) => {
    const c = [...state[doc].changes]; c[i] = val; set(doc, { changes: c })
  }
  const removeChange = (doc: DocKey, i: number) => {
    set(doc, { changes: state[doc].changes.filter((_, j) => j !== i) })
  }

  // Save draft for current doc + current lang
  const saveDraft = async () => {
    setSaving(true)
    try {
      await Promise.all([
        adminApi.saveLegalContent(activeDoc, state[activeDoc].content[activeLang], activeLang),
        adminApi.updateLegalConfig(activeDoc, {
          version:       state[activeDoc].version,
          effectiveDate: state[activeDoc].effectiveDate,
          changes:       state[activeDoc].changes,
        }),
      ])
      setState(s => ({ ...s, [activeDoc]: { ...s[activeDoc], dirty: false } }))
      toast.success(`Draft saved (${LANGS.find(l => l.key === activeLang)?.label})`)
    } catch {
      toast.error('Failed to save draft')
    }
    setSaving(false)
  }

  // Publish current doc + current lang — then bump version and clear notes
  const publish = async () => {
    setPublishing(true)
    setShowConfirm(false)
    try {
      const res = await adminApi.publishLegal(activeDoc, {
        version:       state[activeDoc].version,
        effectiveDate: state[activeDoc].effectiveDate,
        changes:       state[activeDoc].changes,
        content:       state[activeDoc].content[activeLang],
        lang:          activeLang,
      })
      setPublishResult(res)

      // Save to history and clear change notes
      const entry: HistoryEntry = {
        version: state[activeDoc].version,
        lang:    LANGS.find(l => l.key === activeLang)?.label || activeLang,
        date:    new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        changes: state[activeDoc].changes.filter(Boolean),
      }
      const newHistory = [entry, ...history[activeDoc]]
      saveHistory(activeDoc, newHistory)
      setHistory(h => ({ ...h, [activeDoc]: newHistory }))

      // Auto-bump version and clear change notes for next edit
      const nextVersion = bumpPatch(state[activeDoc].version)
      setState(s => ({
        ...s,
        [activeDoc]: {
          ...s[activeDoc],
          dirty:      false,
          changes:    [], // clear for next edit
          version:    nextVersion,
          savedLangs: new Set([...s[activeDoc].savedLangs, activeLang]),
        },
      }))
      toast.success(`Published v${entry.version} (${LANGS.find(l => l.key === activeLang)?.label}) — next version will be v${nextVersion}`)

      // Show reminder if not all languages are published
      const missingLangs = LANGS.filter(l => l.key !== activeLang && !state[activeDoc].savedLangs.has(l.key))
      if (missingLangs.length > 0) {
        setReminder({ doc: activeDoc, publishedLang: activeLang })
      }
    } catch {
      toast.error('Failed to publish')
    }
    setPublishing(false)
  }

  const cur     = state[activeDoc]
  const docMeta = DOCS.find(d => d.key === activeDoc)!
  const curContent = cur.content[activeLang]
  const docHistory = history[activeDoc]

  const missingLangs = reminder
    ? LANGS.filter(l => l.key !== reminder.publishedLang && !state[reminder.doc].savedLangs.has(l.key))
    : []

  return (
    <div className="space-y-6">
      {/* Reminder banner */}
      {reminder && missingLangs.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              You just published the {LANGS.find(l => l.key === reminder.publishedLang)?.label} version of {DOCS.find(d => d.key === reminder.doc)?.label}.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Don't forget to update the other language versions too.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {missingLangs.map(l => (
                <button
                  key={l.key}
                  onClick={() => {
                    setActiveDoc(reminder.doc)
                    setActiveLang(l.key)
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                >
                  {l.flag} Update {l.label} →
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setReminder(null)} className="text-amber-600 hover:text-amber-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Legal Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Edit and publish Terms of Service, Privacy Policy, and DPA in multiple languages.
            Publishing bumps the version and triggers re-consent for all users on next login.
          </p>
        </div>
      </div>

      {/* Doc tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {DOCS.map(d => (
          <button
            key={d.key}
            onClick={() => setActiveDoc(d.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeDoc === d.key
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{d.icon}</span>
            {d.label}
            {state[d.key].dirty && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" />
            )}
          </button>
        ))}
      </div>

      {/* Language tabs */}
      <div className="flex items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {LANGS.map(l => (
            <button
              key={l.key}
              onClick={() => setActiveLang(l.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeLang === l.key
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {state[activeDoc].savedLangs.has(l.key) && (
                <Check className="h-3 w-3 text-green-500" />
              )}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-1">
          Editing: <strong>{LANGS.find(l => l.key === activeLang)?.label}</strong> version
        </span>
      </div>

      {cur.loading ? (
        <div className="flex items-center gap-3 py-16 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading {docMeta.label}…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* ── Left: Editor ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Version + date row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</label>
                <input
                  value={cur.version}
                  onChange={e => set(activeDoc, { version: e.target.value })}
                  placeholder="e.g. 1.1"
                  className="w-full text-lg font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary pb-1"
                />
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Effective Date
                </label>
                <input
                  value={cur.effectiveDate}
                  onChange={e => set(activeDoc, { effectiveDate: e.target.value })}
                  placeholder="e.g. June 1, 2026"
                  className="w-full text-sm bg-transparent border-b border-border focus:outline-none focus:border-primary pb-1"
                />
              </div>
            </div>

            {/* What changed */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">What Changed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Shown in the re-consent modal + email notification</p>
                </div>
                <button
                  onClick={() => addChange(activeDoc)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" /> Add bullet
                </button>
              </div>
              {cur.changes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No change notes yet. Add bullets to inform users what was updated.</p>
              ) : (
                <div className="space-y-2">
                  {cur.changes.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">•</span>
                      <input
                        value={c}
                        onChange={e => updateChange(activeDoc, i, e.target.value)}
                        placeholder="Describe what changed…"
                        className="flex-1 text-sm bg-muted/50 rounded-md px-3 py-1.5 border border-border focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => removeChange(activeDoc, i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HTML Content editor */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div>
                  <p className="text-sm font-semibold">
                    Document Content
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      {LANGS.find(l => l.key === activeLang)?.flag} {LANGS.find(l => l.key === activeLang)?.label}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">HTML format — use &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;table&gt;</p>
                </div>
                <button
                  onClick={() => setPreview(!preview)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
                >
                  {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {preview ? (
                <div
                  className={`p-6 min-h-[500px] overflow-auto text-sm leading-relaxed
                    [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border
                    [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
                    [&_p]:mb-4 [&_p]:leading-[1.8]
                    [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:my-3 [&_ul]:space-y-1
                    [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:my-3 [&_ol]:space-y-1
                    [&_strong]:font-semibold
                    [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                    [&_table]:w-full [&_table]:text-sm [&_table]:my-4 [&_table]:border-collapse
                    [&_th]:font-semibold [&_th]:text-left [&_th]:py-2 [&_th]:px-3 [&_th]:bg-muted [&_th]:border [&_th]:border-border
                    [&_td]:py-2 [&_td]:px-3 [&_td]:border [&_td]:border-border
                    ${activeLang === 'ar' ? 'direction-rtl text-right' : ''}`}
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(curContent) }}
                />
              ) : (
                <textarea
                  value={curContent}
                  onChange={e => setContent(activeDoc, activeLang, e.target.value)}
                  placeholder={`Enter the ${docMeta.label} content in HTML (${LANGS.find(l => l.key === activeLang)?.label})…\n\nExample:\n<h2>1. Section Title</h2>\n<p>Section body text goes here.</p>`}
                  className="w-full min-h-[500px] p-5 font-mono text-xs bg-transparent resize-none focus:outline-none text-foreground/80 leading-relaxed"
                  spellCheck={false}
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                />
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4 sticky bottom-4 shadow-lg">
              <div className="text-xs text-muted-foreground">
                {cur.dirty
                  ? <span className="text-amber-600 font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 bg-amber-500 rounded-full inline-block" /> Unsaved changes</span>
                  : <span className="text-green-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span>
                }
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveDraft}
                  disabled={saving || !cur.dirty}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={publishing || !curContent.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Publish v{cur.version}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Meta panel ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Status card */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm font-semibold">Document Status</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current version</span>
                  <span className="font-mono font-bold">v{cur.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Effective date</span>
                  <span>{cur.effectiveDate || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Change notes</span>
                  <span className="font-medium">{cur.changes.filter(Boolean).length} bullet{cur.changes.filter(Boolean).length !== 1 ? 's' : ''}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Languages published this session</p>
                  <div className="flex gap-2 flex-wrap">
                    {LANGS.map(l => (
                      <span
                        key={l.key}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          cur.savedLangs.has(l.key)
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {l.flag} {l.label}
                        {cur.savedLangs.has(l.key) && ' ✓'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* What happens on publish */}
            <div className="rounded-xl border border-dashed bg-muted/30 p-5 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                When you publish…
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Content goes live on all apps instantly</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> All users see an in-app banner on next login</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Company admins must re-accept before using the app</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Email blast sent (if email relay is configured)</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span> Publish event logged to audit trail</li>
              </ul>
            </div>

            {/* Publish result */}
            {publishResult && (
              <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Check className="h-4 w-4" /> Published successfully
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">v{publishResult.version}</p>
                {publishResult.emailsSent > 0
                  ? <p className="text-xs text-green-700 dark:text-green-300">{publishResult.emailsSent} email{publishResult.emailsSent !== 1 ? 's' : ''} sent</p>
                  : <p className="text-xs text-amber-600 dark:text-amber-400">Emails skipped (email relay not configured)</p>
                }
              </div>
            )}

            {/* Change History */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <button
                onClick={() => setShowHistory(h => !h)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors">
                <span className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /> Publish History</span>
                <span className="text-xs text-muted-foreground">{docHistory.length} versions</span>
              </button>
              {showHistory && (
                <div className="border-t divide-y divide-border max-h-64 overflow-y-auto">
                  {docHistory.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground">No publish history yet.</p>
                  ) : docHistory.map((h, i) => (
                    <div key={i} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold">v{h.version}</span>
                        <span className="text-xs text-muted-foreground">{h.lang} · {h.date}</span>
                      </div>
                      {h.changes.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {h.changes.map((c, ci) => <li key={ci}>• {c}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  Publish {docMeta.label} v{cur.version}? ({LANGS.find(l => l.key === activeLang)?.flag} {LANGS.find(l => l.key === activeLang)?.label})
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will immediately go live on all apps. Every user will see a banner on next login,
                  and company admins will need to re-accept before accessing the platform.
                </p>
              </div>
            </div>
            {cur.changes.filter(Boolean).length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-muted-foreground uppercase tracking-wide">Changes to notify</p>
                {cur.changes.filter(Boolean).map((c, i) => <p key={i}>• {c}</p>)}
              </div>
            )}
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={publish}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
