import { useState, useEffect, useCallback } from 'react';
import { adminApi as api } from '../lib/api';

interface Registration {
  id: string;
  type: 'company_signup' | 'invite';
  email: string;
  fullName: string;
  companyName: string;
  role?: string;
  roleName?: string;
  inviterName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  rejectedAt?: string;
}

function typeBadge(type: string) {
  return type === 'company_signup'
    ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">🏢 Company</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">👤 Invite</span>;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

export default function Registrations() {
  const [tab, setTab] = useState<'pending' | 'rejected'>('pending');
  const [pending, setPending] = useState<Registration[]>([]);
  const [rejected, setRejected] = useState<Registration[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRegistrations();
      setPending(data.pending || []);
      setRejected(data.rejected || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    if (!confirm('Approve this registration? This will send the user an email.')) return;
    setActionLoading(id);
    try {
      await api.approveRegistration(id);
      setSuccessMsg('Registration approved — email sent to the user.');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const reject = async (id: string, email: string) => {
    if (!confirm(`Reject and permanently delete the registration for ${email}?`)) return;
    setActionLoading(id);
    try {
      await api.rejectRegistration(id);
      setSuccessMsg('Registration rejected and removed.');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const filteredRejected = rejected.filter(r => {
    const q = search.toLowerCase();
    return !q || r.email.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registrations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review and approve new company signups and team invitation requests.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-700 dark:text-green-300">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${
            tab === 'pending'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Pending
          {pending.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('rejected')}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${
            tab === 'rejected'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Rejected History
          {rejected.length > 0 && (
            <span className="ml-2 text-xs text-gray-400">({rejected.length})</span>
          )}
        </button>
      </div>

      {/* Pending Tab */}
      {tab === 'pending' && (
        <div>
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No pending registrations</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(reg => (
                <div
                  key={reg.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {typeBadge(reg.type)}
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{reg.fullName}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{reg.email}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Company:</span> {reg.companyName}
                    </p>
                    {reg.type === 'invite' && reg.inviterName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invited by <span className="font-medium">{reg.inviterName}</span>
                        {reg.roleName ? ` as ${reg.roleName}` : reg.role ? ` as ${reg.role}` : ''}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">Received: {fmtDate(reg.createdAt)}</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approve(reg.id)}
                      disabled={actionLoading === reg.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === reg.id ? '…' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => reject(reg.id, reg.email)}
                      disabled={actionLoading === reg.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === reg.id ? '…' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejected Tab */}
      {tab === 'rejected' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by name, email, or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : filteredRejected.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {search ? 'No results match your search.' : 'No rejected registrations.'}
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Registered</th>
                    <th className="px-4 py-3 text-left">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRejected.map(reg => (
                    <tr key={reg.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">{typeBadge(reg.type)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{reg.fullName}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{reg.email}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{reg.companyName}</td>
                      <td className="px-4 py-3 text-gray-400">{fmtDate(reg.createdAt)}</td>
                      <td className="px-4 py-3 text-red-400">{reg.rejectedAt ? fmtDate(reg.rejectedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
