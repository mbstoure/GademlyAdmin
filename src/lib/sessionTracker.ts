/**
 * lib/sessionTracker.ts
 *
 * Client-side admin session tracking using Supabase directly.
 *
 * ZERO network requests are made until the user explicitly confirms the
 * admin_sessions table has been created (by clicking "I've run the migration"
 * in Settings → Sessions). This eliminates all 404 console noise.
 */

import { supabase } from './supabase'

// ── Setup flag ────────────────────────────────────────────────────────────────
// Stored in localStorage so it survives page refreshes across devices.

const LS_KEY = 'gademly_admin_sessions_enabled'

export function isSessionTrackingEnabled(): boolean {
  return localStorage.getItem(LS_KEY) === 'true'
}

/** Call when the user confirms the migration has been run. */
export function enableSessionTracking(): void {
  localStorage.setItem(LS_KEY, 'true')
}

/** Call to reset (e.g. after a DB wipe). */
export function disableSessionTracking(): void {
  localStorage.removeItem(LS_KEY)
}

// ── User-agent parsing ────────────────────────────────────────────────────────

function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = 'Unknown'
  if (/Edg\//i.test(ua))          browser = 'Edge'
  else if (/OPR\//i.test(ua))     browser = 'Opera'
  else if (/Chrome\//i.test(ua))  browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua))  browser = 'Safari'

  const verMap: Record<string, string> = {
    Edge: 'Edg', Opera: 'OPR', Chrome: 'Chrome', Firefox: 'Firefox', Safari: 'Version',
  }
  const verKey = verMap[browser]
  if (verKey) {
    const m = ua.match(new RegExp(`${verKey}\\/(\\d+)`))
    if (m) browser += ` ${m[1]}`
  }

  let os = 'Unknown OS'
  if (/Windows NT 10/i.test(ua))    os = 'Windows 10/11'
  else if (/Windows NT/i.test(ua))  os = 'Windows'
  else if (/Mac OS X/i.test(ua)) {
    const m = ua.match(/Mac OS X ([\d_]+)/)
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS'
  } else if (/Android/i.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/)
    os = m ? `Android ${m[1]}` : 'Android'
  } else if (/iPhone OS/i.test(ua)) {
    const m = ua.match(/iPhone OS ([\d_]+)/)
    os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS'
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS'
  } else if (/Linux/i.test(ua)) {
    os = 'Linux'
  }

  let device = 'Desktop'
  if (/Mobile|Android.*Mobile/i.test(ua)) device = 'Mobile'
  if (/iPad/i.test(ua))                   device = 'Tablet'

  return { browser, os, device }
}

function tokenFingerprint(token: string): string {
  return token.slice(0, 16)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Record a login. No-ops if tracking is not enabled.
 * Call after successful super-admin authentication.
 */
export async function recordAdminLogin(): Promise<void> {
  if (!isSessionTrackingEnabled()) return
  try {
    const { data: sd } = await supabase.auth.getSession()
    const session = sd?.session
    if (!session) return

    const { browser, os, device } = parseUA(navigator.userAgent)
    const fingerprint = tokenFingerprint(session.access_token)

    // Best-effort: mark all other sessions as not-current
    supabase
      .from('admin_sessions')
      .update({ is_current: false })
      .eq('user_id', session.user.id)
      .neq('session_token', fingerprint)
      .then(() => {/* ignore */})

    await supabase
      .from('admin_sessions')
      .upsert(
        {
          user_id:       session.user.id,
          session_token: fingerprint,
          browser,
          os,
          device,
          logged_in_at:  new Date().toISOString(),
          last_active:   new Date().toISOString(),
          is_current:    true,
          revoked:       false,
        },
        { onConflict: 'user_id,session_token', ignoreDuplicates: false }
      )
  } catch {
    // Never block the login flow
  }
}

/**
 * Ping last_active. No-ops if tracking is not enabled.
 */
export async function pingSession(): Promise<void> {
  if (!isSessionTrackingEnabled()) return
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    const fingerprint = tokenFingerprint(data.session.access_token)
    await supabase
      .from('admin_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('session_token', fingerprint)
      .eq('user_id', data.session.user.id)
  } catch {}
}

/**
 * Load all non-revoked sessions.
 * Returns error: 'NOT_ENABLED' if tracking hasn't been activated.
 */
export async function loadAdminSessions(): Promise<{
  sessions: AdminSession[]
  error: string | null
}> {
  if (!isSessionTrackingEnabled()) {
    return { sessions: [], error: 'NOT_ENABLED' }
  }

  try {
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('revoked', false)
      .order('last_active', { ascending: false })
      .limit(50)

    if (error) {
      // Table doesn't exist — disable flag so we stop hitting it
      if (error.message?.includes('does not exist') || (error as any).code === '42P01') {
        disableSessionTracking()
        return { sessions: [], error: 'NOT_ENABLED' }
      }
      return { sessions: [], error: error.message }
    }

    const { data: live } = await supabase.auth.getSession()
    const liveFingerprint = live?.session ? tokenFingerprint(live.session.access_token) : null

    const sessions: AdminSession[] = (data || []).map(row => ({
      id:         row.id,
      browser:    row.browser || 'Unknown browser',
      os:         row.os || 'Unknown OS',
      device:     row.device || 'Desktop',
      ip:         row.ip && row.ip !== 'unknown' ? row.ip : null,
      location:   row.location || null,
      loggedInAt: row.logged_in_at,
      lastActive: row.last_active,
      isCurrent:  row.session_token === liveFingerprint,
    }))

    return { sessions, error: null }
  } catch (e: any) {
    return { sessions: [], error: e.message }
  }
}

/**
 * Revoke a session by ID.
 */
export async function revokeAdminSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('admin_sessions')
    .update({ revoked: true, revoked_at: new Date().toISOString(), is_current: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminSession {
  id:         string
  browser:    string
  os:         string
  device:     string
  ip:         string | null
  location:   string | null
  loggedInAt: string
  lastActive: string
  isCurrent:  boolean
}
