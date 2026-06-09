import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL as string
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function getToken(forceRefresh = false): Promise<string | null> {
  if (DEV_BYPASS) return ANON_KEY
  if (forceRefresh) {
    // Only called after a 401 — try to get a fresh token
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  }
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function req<T = unknown>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
  const token = await getToken(isRetry)
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  // On 401, attempt a single token refresh and retry
  if (res.status === 401 && !isRetry) {
    console.warn('[Admin API] 401 received — refreshing session and retrying...')
    return req<T>(method, path, body, true)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}



// ── Stats ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => req<any>('GET', '/make-server-c6b0f6c0/admin/stats'),

  // Plan definitions
  getPlanDefinitions: () => req<any>('GET', '/make-server-c6b0f6c0/admin/plan-definitions'),
  updatePlanDefinitions: (plans: unknown) => req<any>('PUT', '/make-server-c6b0f6c0/admin/plan-definitions', plans),

  // Users
  getUsers: () => req<any>('GET', '/make-server-c6b0f6c0/admin/users'),
  updateUser: (id: string, data: unknown) => req<any>('PUT', `/make-server-c6b0f6c0/admin/users/${id}`, data),
  deleteUser: (id: string) => req<any>('DELETE', `/make-server-c6b0f6c0/admin/users/${id}`),
  approveUser: (id: string) => req<any>('POST', `/make-server-c6b0f6c0/admin/users/${id}/approve`),
  suspendUser: (id: string, suspended: boolean) => req<any>('PUT', `/make-server-c6b0f6c0/admin/users/${id}`, { suspended }),

  // Companies
  getCompanies: () => req<any>('GET', '/make-server-c6b0f6c0/admin/companies'),
  updateCompany: (id: string, data: unknown) => req<any>('PUT', `/make-server-c6b0f6c0/admin/companies/${id}`, data),
  deleteCompany: (id: string) => req<any>('DELETE', `/make-server-c6b0f6c0/admin/companies/${id}`),
  approveCompany: (id: string) => req<any>('POST', `/make-server-c6b0f6c0/admin/companies/${id}/approve`),
  suspendCompany: (id: string, suspended: boolean) => req<any>('PUT', `/make-server-c6b0f6c0/admin/companies/${id}`, { suspended }),

  // Subscriptions
  getSubscriptions: () => req<any>('GET', '/make-server-c6b0f6c0/admin/subscriptions'),
  updateSubscription: (companyId: string, data: unknown) => req<any>('PUT', `/make-server-c6b0f6c0/admin/subscriptions/${companyId}`, data),
  impersonate: (companyId: string) => req<any>('POST', `/make-server-c6b0f6c0/admin/impersonate/${companyId}`),

  // Forms
  getForms: () => req<any>('GET', '/make-server-c6b0f6c0/admin/forms'),
  getForm: (formId: string) => req<any>('GET', `/make-server-c6b0f6c0/admin/forms/${formId}`),
  updateForm: (formId: string, data: unknown) => req<any>('PUT', `/make-server-c6b0f6c0/admin/forms/${formId}`, data),
  deleteForm: (formId: string) => req<any>('DELETE', `/make-server-c6b0f6c0/admin/forms/${formId}`),

  // Audit log
  getAuditLog: (opts?: { limit?: number; offset?: number; action?: string; company?: string; from?: string; to?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (opts?.limit)   params.set('limit',   String(opts.limit))
    if (opts?.offset)  params.set('offset',  String(opts.offset))
    if (opts?.action)  params.set('action',  opts.action)
    if (opts?.company) params.set('company', opts.company)
    if (opts?.from)    params.set('from',    opts.from)
    if (opts?.to)      params.set('to',      opts.to)
    if (opts?.search)  params.set('search',  opts.search)
    const qs = params.toString()
    return req<any>('GET', `/make-server-c6b0f6c0/admin/audit-log${qs ? `?${qs}` : ''}`)
  },

  // Settings
  getSettings: () => req<any>('GET', '/make-server-c6b0f6c0/admin/settings'),
  updateSettings: (data: unknown) => req<any>('PUT', '/make-server-c6b0f6c0/admin/settings', data),

  // Sessions
  getSessions: () => req<any>('GET', '/make-server-c6b0f6c0/admin/sessions'),
  revokeSession: (sessionId: string) => req<any>('DELETE', `/make-server-c6b0f6c0/admin/sessions/${sessionId}`),

  // Legal CMS
  getLegalConfig: () => req<any>('GET', '/make-server-c6b0f6c0/legal/config'),
  getLegalContent: (doc: string, lang = 'en') => req<any>('GET', `/make-server-c6b0f6c0/legal/content/${doc}?lang=${lang}`),
  saveLegalContent: (doc: string, content: string, lang = 'en') =>
    req<any>('PUT', `/make-server-c6b0f6c0/legal/content/${doc}`, { content, lang }),
  updateLegalConfig: (doc: string, meta: { version: string; effectiveDate: string; changes: string[] }) =>
    req<any>('PUT', '/make-server-c6b0f6c0/legal/config', { doc, ...meta }),
  publishLegal: (doc: string, payload: { version: string; effectiveDate: string; changes: string[]; content: string; lang?: string }) =>
    req<any>('POST', '/make-server-c6b0f6c0/legal/publish', { doc, ...payload }),

  // Notifications
  getBroadcasts: (limit = 20) =>
    req<any>('GET', `/make-server-c6b0f6c0/admin/notifications/broadcasts?limit=${limit}`),
  broadcast: (payload: {
    title: string;
    body: string;
    link?: string;
    priority?: string;
    targetCompanyId?: string;
    targetUserId?: string;
  }) => req<any>('POST', '/make-server-c6b0f6c0/admin/notifications/broadcast', payload),
  sendDigest: (digestType: 'daily' | 'weekly') =>
    req<any>('POST', '/make-server-c6b0f6c0/admin/notifications/send-digest', { digestType }),

  // Support tickets
  getSupportTickets: (opts?: { status?: string; limit?: number }) =>
    req<any>('GET', `/make-server-c6b0f6c0/admin/support/tickets${opts?.status ? `?status=${opts.status}` : ''}${opts?.limit ? `${opts?.status ? '&' : '?'}limit=${opts.limit}` : ''}`),
  getSupportTicket: (id: string) =>
    req<any>('GET', `/make-server-c6b0f6c0/admin/support/tickets/${id}`),
  updateSupportTicket: (id: string, data: { status?: string; adminNote?: string }) =>
    req<any>('PUT', `/make-server-c6b0f6c0/admin/support/tickets/${id}`, data),
  replyToTicket: (id: string, message: string) =>
    req<any>('POST', `/make-server-c6b0f6c0/admin/support/tickets/${id}/reply`, { message }),
  getUnresolvedTicketCount: () =>
    req<any>('GET', '/make-server-c6b0f6c0/admin/support/tickets/count?status=open'),
}
