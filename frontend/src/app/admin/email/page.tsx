'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { EmailService } from '@/services';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

type Tab = 'settings' | 'marketing';

export default function AdminEmailPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('settings');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['email', 'settings'],
    queryFn: () => EmailService.getSettings(),
  });

  const [form, setForm] = useState<any>({
    enabled: false,
    provider: 'smtp',
    from_name: 'Vcocnc',
    from_email: '',
    reply_to: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_tls_mode: 'starttls',
    verification_enabled: false,
    marketing_enabled: false,
    code_expiry_minutes: 10,
    code_resend_seconds: 60,
    has_smtp_password: false,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      ...data,
      smtp_password: '', // never hydrate password
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        enabled: Boolean(form.enabled),
        provider: form.provider || 'smtp',
        from_name: String(form.from_name || ''),
        from_email: String(form.from_email || ''),
        reply_to: String(form.reply_to || ''),
        smtp_host: String(form.smtp_host || ''),
        smtp_port: Number(form.smtp_port || 587),
        smtp_username: String(form.smtp_username || ''),
        smtp_tls_mode: String(form.smtp_tls_mode || 'starttls'),
        verification_enabled: Boolean(form.verification_enabled),
        marketing_enabled: Boolean(form.marketing_enabled),
        code_expiry_minutes: Number(form.code_expiry_minutes || 10),
        code_resend_seconds: Number(form.code_resend_seconds || 60),
      };
      // only send password if user typed something
      if (String(form.smtp_password || '').trim() !== '') {
        payload.smtp_password = String(form.smtp_password);
      }
      return EmailService.updateSettings(payload);
    },
    onSuccess: async () => {
      toast.success('Saved');
      await qc.invalidateQueries({ queryKey: ['email'] });
      await qc.invalidateQueries({ queryKey: ['public', 'email'] });
      refetch();
      setForm((p: any) => ({ ...p, smtp_password: '' }));
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const [testTo, setTestTo] = useState('');
  const testMutation = useMutation({
    mutationFn: async () => EmailService.sendTest(testTo),
    onSuccess: () => toast.success('Test email sent'),
    onError: (e: any) => toast.error(e?.message || 'Failed to send test'),
  });

  const [mk, setMk] = useState({
    subject: '',
    html: '',
    text: '',
    test_to: '',
    limit: 0,
  });

  const canSendMarketing = useMemo(() => Boolean(form.enabled && form.marketing_enabled), [form.enabled, form.marketing_enabled]);

  const broadcastMutation = useMutation({
    mutationFn: async () => EmailService.broadcast({
      subject: mk.subject,
      html: mk.html,
      text: mk.text || undefined,
      test_to: mk.test_to || undefined,
      limit: mk.limit || undefined,
    }),
    onSuccess: (res) => {
      if (mk.test_to) toast.success('Test marketing email sent');
      else toast.success(`Broadcast finished: sent ${res.sent || 0}, failed ${res.failed || 0}`);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send'),
  });

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure SMTP (Poste.io / AliMail / etc.), verification codes, and marketing emails.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`px-3 py-2 text-sm rounded-md ${tab === 'settings' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setTab('marketing')}
            className={`px-3 py-2 text-sm rounded-md ${tab === 'marketing' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Marketing
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-6">Loading...</div>
        ) : tab === 'settings' ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Enable Email</div>
                <div className="text-xs text-gray-500">Controls all outbound email (verification + marketing)</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(form.enabled)}
                onChange={(e) => setForm((p: any) => ({ ...p, enabled: e.target.checked }))}
                className="h-4 w-4"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input
                  value={form.from_name || ''}
                  onChange={(e) => setForm((p: any) => ({ ...p, from_name: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input
                  value={form.from_email || ''}
                  onChange={(e) => setForm((p: any) => ({ ...p, from_email: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="sales@vcocncspare.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To</label>
                <input
                  value={form.reply_to || ''}
                  onChange={(e) => setForm((p: any) => ({ ...p, reply_to: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="sales@vcocncspare.com"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="text-sm font-semibold text-gray-900 mb-3">SMTP (Poste.io / AliMail / Custom)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input
                    value={form.smtp_host || ''}
                    onChange={(e) => setForm((p: any) => ({ ...p, smtp_host: e.target.value }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="mail.vcocncspare.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    You can use hostname only (recommended) or hostname with port (e.g. mail.vcocncspare.com:8443).
                    If you paste a URL, it will be sanitized server-side.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={form.smtp_port ?? 587}
                    onChange={(e) => setForm((p: any) => ({ ...p, smtp_port: Number(e.target.value) }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={form.smtp_username || ''}
                    onChange={(e) => setForm((p: any) => ({ ...p, smtp_username: e.target.value }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={form.smtp_password || ''}
                    onChange={(e) => setForm((p: any) => ({ ...p, smtp_password: e.target.value }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder={form.has_smtp_password ? 'Saved (leave blank to keep)' : 'Enter SMTP password'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TLS Mode</label>
                  <select
                    value={form.smtp_tls_mode || 'starttls'}
                    onChange={(e) => setForm((p: any) => ({ ...p, smtp_tls_mode: e.target.value }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="starttls">STARTTLS (587)</option>
                    <option value="ssl">SSL (465)</option>
                    <option value="none">None (25)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Email Verification</div>
                    <div className="text-xs text-gray-500">Require code for registration (and password reset)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(form.verification_enabled)}
                    onChange={(e) => setForm((p: any) => ({ ...p, verification_enabled: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Marketing Emails</div>
                    <div className="text-xs text-gray-500">Enable bulk email sending</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(form.marketing_enabled)}
                    onChange={(e) => setForm((p: any) => ({ ...p, marketing_enabled: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code expiry (minutes)</label>
                  <input
                    type="number"
                    value={form.code_expiry_minutes ?? 10}
                    onChange={(e) => setForm((p: any) => ({ ...p, code_expiry_minutes: Number(e.target.value) }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resend wait (seconds)</label>
                  <input
                    type="number"
                    value={form.code_resend_seconds ?? 60}
                    onChange={(e) => setForm((p: any) => ({ ...p, code_resend_seconds: Number(e.target.value) }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t pt-6">
              <div className="flex items-center gap-2">
                <input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  className="w-72 max-w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="test@example.com"
                />
                <button
                  type="button"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !testTo}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {testMutation.isPending ? 'Sending...' : 'Send test'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="text-sm text-gray-600">
              {canSendMarketing ? (
                <div>
                  Placeholders supported: <span className="font-mono">{'{{full_name}}'}</span>,{' '}
                  <span className="font-mono">{'{{email}}'}</span>
                </div>
              ) : (
                <div className="text-red-600">
                  Enable Email + Marketing in Settings first.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={mk.subject}
                onChange={(e) => setMk((p) => ({ ...p, subject: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="New arrivals / Promotion / Update"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML</label>
              <textarea
                value={mk.html}
                onChange={(e) => setMk((p) => ({ ...p, html: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                rows={12}
                placeholder="<h1>Hello {{full_name}}</h1>..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text (optional)</label>
              <textarea
                value={mk.text}
                onChange={(e) => setMk((p) => ({ ...p, text: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test to (optional)</label>
                <input
                  value={mk.test_to}
                  onChange={(e) => setMk((p) => ({ ...p, test_to: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limit (0 = all)</label>
                <input
                  type="number"
                  value={mk.limit}
                  onChange={(e) => setMk((p) => ({ ...p, limit: Number(e.target.value) }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  disabled={!canSendMarketing || broadcastMutation.isPending}
                  onClick={() => broadcastMutation.mutate()}
                  className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {broadcastMutation.isPending ? 'Sending...' : mk.test_to ? 'Send test' : 'Send broadcast'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
