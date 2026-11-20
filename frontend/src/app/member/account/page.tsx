'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { memberDisplayName, useMember } from '@/context/MemberContext';
import { api } from '@/services/api';
import { notify } from '@/components/shared/message-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n, type MessageKey } from '@/lib/i18n';
import type { Member } from '@/types';

type Form = Record<keyof Member, string>;
const ADDRESS_FIELDS: { key: keyof Member; label: MessageKey; autoComplete: string }[] = [
  { key: 'province', label: 'member.province', autoComplete: 'address-level1' },
  { key: 'city', label: 'member.city', autoComplete: 'address-level2' },
  { key: 'district', label: 'member.district', autoComplete: 'address-level3' },
  { key: 'area', label: 'member.area', autoComplete: 'address-level4' },
  { key: 'zip_code', label: 'member.zip', autoComplete: 'postal-code' },
];

export default function MemberAccountPage() {
  const { t } = useI18n();
  const { token, me, orders, setAccount } = useMember();
  const initial = (): Form => {
    const a = me.account;
    return {
      name: a?.name ?? memberDisplayName(me, orders),
      phone: a?.phone ?? orders?.find((o) => o.buyer_phone)?.buyer_phone ?? '',
      address: a?.address ?? '',
      province: a?.province ?? '',
      city: a?.city ?? '',
      district: a?.district ?? '',
      area: a?.area ?? '',
      zip_code: a?.zip_code ?? '',
    };
  };
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      setAccount(await api.memberUpdateAccount(token, form));
      notify.success(t('member.saved'));
    } catch (err) {
      notify.error(t('member.saveFailed'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="py-6 font-display text-3xl font-bold">{t('member.accountTitle')}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-muted-foreground">{t('member.personal')}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="m-name">{t('member.name')}</Label>
            <Input id="m-name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-email">Email</Label>
            <Input id="m-email" value={me.email} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-phone">{t('member.phone')}</Label>
            <Input id="m-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="081234567890" />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-muted-foreground">{t('member.addressTitle')}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="m-address">{t('member.address')}</Label>
            <Textarea id="m-address" autoComplete="street-address" value={form.address} onChange={set('address')} maxLength={500} placeholder={t('member.addressPlaceholder')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ADDRESS_FIELDS.map(({ key, label, autoComplete }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`m-${key}`}>{t(label)}</Label>
                <Input
                  id={`m-${key}`}
                  autoComplete={autoComplete}
                  value={form[key]}
                  onChange={set(key)}
                  maxLength={key === 'zip_code' ? 5 : 100}
                  inputMode={key === 'zip_code' ? 'numeric' : undefined}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 flex justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <Button type="button" variant="outline" onClick={() => setForm(initial())} disabled={saving}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} {t('member.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
