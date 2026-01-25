'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { EmailService } from '@/services';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [enabled, setEnabled] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await EmailService.getPublicConfig();
        setEnabled(Boolean(cfg.enabled && cfg.verification_enabled));
        setResendSeconds(cfg.code_resend_seconds || 60);
      } catch {
        setEnabled(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = async () => {
    const e = email.trim();
    if (!e) return toast.error('Please enter your email');
    if (!enabled) return toast.error('Password reset via email is currently disabled');
    if (cooldown > 0) return;
    setSending(true);
    try {
      await EmailService.sendCode({ email: e, purpose: 'reset' });
      toast.success('Reset code sent');
      setCooldown(resendSeconds);
      setStep('confirm');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const resetPassword = async () => {
    const e = email.trim();
    if (!e) return toast.error('Please enter your email');
    if (!code.trim()) return toast.error('Please enter the code');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setResetting(true);
    try {
      await EmailService.confirmPasswordReset({ email: e, code: code.trim(), new_password: newPassword });
      toast.success('Password updated. You can now sign in.');
      window.location.href = `/login?returnUrl=/account`;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <Link href="/login" className="font-medium text-amber-600 hover:text-amber-500">
              Back to sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>

            {step === 'confirm' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                      placeholder="123456"
                    />
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={sending || cooldown > 0 || !enabled}
                      className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {cooldown > 0 ? `${cooldown}s` : sending ? 'Sending...' : 'Resend'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">New password</label>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                  />
                </div>

                <button
                  type="button"
                  disabled={resetting}
                  onClick={resetPassword}
                  className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {resetting ? 'Updating...' : 'Update password'}
                </button>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-600">
                  {enabled ? 'We will send a 6-digit reset code to your email.' : 'Email reset is currently disabled.'}
                </div>
                <button
                  type="button"
                  disabled={sending || !enabled}
                  onClick={sendCode}
                  className="w-full rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send reset code'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
