'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { notify } from '@/components/shared/message-dialog';
import { LoginError, LoginShell } from '@/components/shared/login-shell';
import { adminSignOut, signInWithPassword } from '@/services/supabase';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';

/** Store owner sign-in with the email and password set in Supabase Authentication. Buyers use /member/login. */
export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await signInWithPassword(email.trim(), password);
      const me = await api.memberMe(token).catch(() => null);
      if (!me?.isAdmin) {
        await adminSignOut();
        throw new Error(t('login.notAdmin'));
      }
      notify.success(t('login.welcome'));
      router.push('/admin');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.failed');
      setPassword('');
      setError(message);
      notify.error(t('login.failed'), { description: message });
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginShell shakeKey={shakeKey}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('login.adminTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('login.adminSub')}</p>
        </div>

        <LoginError message={error} />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input id="email" type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className="h-12" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
          </div>
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <>{t('login.submit')} <ArrowRight /></>}
        </Button>

        <p className="text-sm text-muted-foreground">
          {t('login.buyerPrompt')}{' '}
          <Link href="/member/login" className="font-medium text-primary hover:underline">{t('login.buyerLink')}</Link>
        </p>
      </form>
    </LoginShell>
  );
}
