'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { EmailService } from '@/services';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { buildEmailHtml, defaultModule, type EmailModule, type EmailModuleType } from '@/lib/email-templates';

type Tab = 'settings' | 'send' | 'marketing' | 'webhooks';

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
    resend_api_key: '',
    resend_webhook_secret: '',
    verification_enabled: false,
    marketing_enabled: false,
    code_expiry_minutes: 10,
    code_resend_seconds: 60,
    has_smtp_password: false,
    has_resend_api_key: false,
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

      // only send Resend credentials if user typed something
      if (String(form.resend_api_key || '').trim() !== '') {
        payload.resend_api_key = String(form.resend_api_key);
      }
      if (String(form.resend_webhook_secret || '').trim() !== '') {
        payload.resend_webhook_secret = String(form.resend_webhook_secret);
      }
      return EmailService.updateSettings(payload);
    },
    onSuccess: async () => {
      toast.success('Saved');
      await qc.invalidateQueries({ queryKey: ['email'] });
      await qc.invalidateQueries({ queryKey: ['public', 'email'] });
      refetch();
      setForm((p: any) => ({ ...p, smtp_password: '', resend_api_key: '', resend_webhook_secret: '' }));
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save'),
  });

  const [testTo, setTestTo] = useState('');
  const testMutation = useMutation({
    mutationFn: async () => EmailService.sendTest(testTo),
    onSuccess: () => toast.success('Test email sent'),
    onError: (e: any) => toast.error(e?.message || 'Failed to send test'),
  });

  const [modules, setModules] = useState<EmailModule[]>(() => {
    const mk1 = { ...defaultModule('new_arrivals'), id: 'm1' } as EmailModule;
    const mk2 = { ...defaultModule('promotion'), id: 'm2' } as EmailModule;
    return [mk1, mk2];
  });

  const [mk, setMk] = useState({ subject: '', html: '', text: '', test_to: '', limit: 0 });
  const [single, setSingle] = useState({ to: '', subject: '', html: '', text: '' });

  useEffect(() => {
    const subject = mk.subject || 'Vcocnc Updates';
    const built = buildEmailHtml(subject, modules);
    setMk((p) => ({ ...p, html: built.html, text: built.text }));
    setSingle((p) => ({ ...p, html: built.html, text: built.text }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subject = mk.subject || 'Vcocnc Updates';
    const built = buildEmailHtml(subject, modules);
    setMk((p) => ({ ...p, html: built.html, text: p.text ? p.text : built.text }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, mk.subject]);

  const singleSendMutation = useMutation({
    mutationFn: async () => EmailService.send(single),
    onSuccess: () => toast.success('Email sent'),
    onError: (e: any) => toast.error(e?.message || 'Failed to send'),
  });

  const webhooksQuery = useQuery({
    queryKey: ['email', 'resend', 'webhooks'],
    queryFn: () => EmailService.resendWebhooksList(),
    enabled: Boolean((form.provider || 'smtp') === 'resend'),
  });

  const [whCreate, setWhCreate] = useState({ endpoint: '', events: 'email.sent,email.delivered' });
  const createWebhookMutation = useMutation({
    mutationFn: async () => EmailService.resendWebhooksCreate({
      endpoint: whCreate.endpoint,
      events: whCreate.events.split(',').map((s) => s.trim()).filter(Boolean),
    }),
    onSuccess: async () => {
      toast.success('Webhook created');
      await webhooksQuery.refetch();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create webhook'),
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
            onClick={() => setTab('send')}
            className={`px-3 py-2 text-sm rounded-md ${tab === 'send' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => setTab('marketing')}
            className={`px-3 py-2 text-sm rounded-md ${tab === 'marketing' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Marketing
          </button>
          <button
            type="button"
            onClick={() => setTab('webhooks')}
            className={`px-3 py-2 text-sm rounded-md ${tab === 'webhooks' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Webhooks
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={form.provider || 'smtp'}
                    onChange={(e) => setForm((p: any) => ({ ...p, provider: e.target.value }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="smtp">SMTP (Poste.io / AliMail)</option>
                    <option value="resend">Resend API</option>
                  </select>
                </div>
              </div>

              <div className="text-sm font-semibold text-gray-900 mb-3">SMTP (Poste.io / AliMail / Custom)</div>
              {String(form.provider || 'smtp') === 'resend' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resend API Key</label>
                    <input
                      type="password"
                      value={form.resend_api_key || ''}
                      onChange={(e) => setForm((p: any) => ({ ...p, resend_api_key: e.target.value }))}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2"
                      placeholder={form.has_resend_api_key ? 'Saved (leave blank to keep)' : 're_xxxxxxxxx'}
                    />
                    <p className="mt-1 text-xs text-gray-500">Stored encrypted if SETTINGS_ENCRYPTION_KEY is set.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret (optional)</label>
                    <input
                      type="password"
                      value={form.resend_webhook_secret || ''}
                      onChange={(e) => setForm((p: any) => ({ ...p, resend_webhook_secret: e.target.value }))}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2"
                      placeholder="(optional)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Used to verify inbound events (future).</p>
                  </div>
                </div>
              ) : (
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
              )}
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
        ) : tab === 'send' ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="text-sm text-gray-600">Send a single email (use this as your mail panel).</div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">Modules (edit text here)</div>
              <ModuleEditor modules={modules} setModules={setModules} />
              <div className="mt-3 text-xs text-gray-500">
                Editing modules regenerates HTML automatically. You can still edit HTML below after generation.
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input value={single.to} onChange={(e) => setSingle((p) => ({ ...p, to: e.target.value }))} className="block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="customer@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input value={single.subject} onChange={(e) => setSingle((p) => ({ ...p, subject: e.target.value }))} className="block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Your subject" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML</label>
              <textarea value={single.html} onChange={(e) => setSingle((p) => ({ ...p, html: e.target.value }))} rows={14} className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text (optional)</label>
              <textarea value={single.text} onChange={(e) => setSingle((p) => ({ ...p, text: e.target.value }))} rows={6} className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => singleSendMutation.mutate()}
                disabled={singleSendMutation.isPending}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {singleSendMutation.isPending ? 'Sending...' : 'Send email'}
              </button>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Preview</div>
              <iframe
                title="email-preview"
                sandbox=""
                style={{ width: '100%', height: 520, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}
                srcDoc={single.html}
              />
            </div>
          </div>
        ) : tab === 'marketing' ? (
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

            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">Modules (edit text here)</div>
              <ModuleEditor modules={modules} setModules={setModules} />
              <div className="mt-3 text-xs text-gray-500">
                Editing modules regenerates HTML automatically. Use the HTML field below for final tweaks.
              </div>
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

            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Preview</div>
              <iframe
                title="email-preview"
                sandbox=""
                style={{ width: '100%', height: 520, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}
                srcDoc={mk.html}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="text-sm text-gray-600">
              Resend webhooks (requires Provider=Resend and API key saved).
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                <input value={whCreate.endpoint} onChange={(e) => setWhCreate((p) => ({ ...p, endpoint: e.target.value }))} className="block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="https://yourdomain.com/api/resend/webhook" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Events (comma)</label>
                <input value={whCreate.events} onChange={(e) => setWhCreate((p) => ({ ...p, events: e.target.value }))} className="block w-full rounded-md border border-gray-300 px-3 py-2" placeholder="email.sent,email.delivered" />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => createWebhookMutation.mutate()}
                disabled={createWebhookMutation.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {createWebhookMutation.isPending ? 'Creating...' : 'Create webhook'}
              </button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Existing webhooks</div>
                <button type="button" onClick={() => webhooksQuery.refetch()} className="text-sm text-gray-700 hover:underline">
                  Refresh
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {(webhooksQuery.data?.data || webhooksQuery.data || []).map((wh: any) => (
                  <div key={wh.id} className="rounded-md border border-gray-200 p-3 text-sm">
                    <div className="font-mono text-xs text-gray-700">{wh.id}</div>
                    <div className="mt-1 text-gray-800">{wh.endpoint}</div>
                    <div className="mt-1 text-xs text-gray-500">Events: {(wh.events || []).join(', ')}</div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await EmailService.resendWebhooksRemove(wh.id);
                            toast.success('Deleted');
                            webhooksQuery.refetch();
                          } catch (e: any) {
                            toast.error(e?.message || 'Failed');
                          }
                        }}
                        className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {Array.isArray(webhooksQuery.data?.data || webhooksQuery.data) && (webhooksQuery.data?.data || webhooksQuery.data).length === 0 ? (
                  <div className="text-sm text-gray-500">No webhooks</div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function ModuleEditor({
  modules,
  setModules,
}: {
  modules: EmailModule[];
  setModules: (updater: (prev: EmailModule[]) => EmailModule[]) => void;
}) {
  const add = (type: EmailModuleType) => {
    setModules((prev) => {
      const id = `m${Date.now()}`;
      return [...prev, { ...(defaultModule(type) as any), id }];
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => add('new_arrivals')} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
          + New arrivals
        </button>
        <button type="button" onClick={() => add('promotion')} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
          + Promotion
        </button>
        <button type="button" onClick={() => add('replacement')} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
          + Out-of-stock replacement
        </button>
        <button type="button" onClick={() => add('repair_quote')} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50">
          + Repair quote
        </button>
      </div>

      {modules.map((m) => (
        <div key={m.id} className="rounded-md border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">
              {m.type.replace(/_/g, ' ')}
            </div>
            <button
              type="button"
              onClick={() => setModules((prev) => prev.filter((x) => x.id !== m.id))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-red-600 hover:bg-gray-50"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                value={m.title}
                onChange={(e) =>
                  setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Badge (optional)</label>
              <input
                value={m.badge || ''}
                onChange={(e) =>
                  setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, badge: e.target.value } : x)))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="NEW / SALE / ALT"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
            <textarea
              value={m.body}
              onChange={(e) => setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, body: e.target.value } : x)))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Bullets (one per line)</label>
            <textarea
              value={(m.bullets || []).join('\n')}
              onChange={(e) =>
                setModules((prev) =>
                  prev.map((x) => (x.id === m.id ? { ...x, bullets: e.target.value.split('\n') } : x))
                )
              }
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CTA Label</label>
              <input
                value={m.ctaLabel}
                onChange={(e) =>
                  setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, ctaLabel: e.target.value } : x)))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CTA URL</label>
              <input
                value={m.ctaUrl}
                onChange={(e) =>
                  setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, ctaUrl: e.target.value } : x)))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Highlight (optional)</label>
            <input
              value={m.highlight || ''}
              onChange={(e) =>
                setModules((prev) => prev.map((x) => (x.id === m.id ? { ...x, highlight: e.target.value } : x)))
              }
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Coupon code / lead time / special note"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
