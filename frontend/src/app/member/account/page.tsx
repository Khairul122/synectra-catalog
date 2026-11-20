'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  // What is actually stored. Prefilled values from past orders count as unsaved until the member saves them.
  const baseline: Form = {
    name: me.account?.name ?? '',
    phone: me.account?.phone ?? '',
    address: me.account?.address ?? '',
    province: me.account?.province ?? '',
    city: me.account?.city ?? '',
    district: me.account?.district ?? '',
    area: me.account?.area ?? '',
    zip_code: me.account?.zip_code ?? '',
  };
  const dirty = (Object.keys(form) as (keyof Member)[]).some((k) => form[k] !== baseline[k]);
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
    <form onSubmit={handleSubmit} className="max-w-xl">
      <h1 className="py-6 font-display text-3xl font-bold">{t('member.nav.account')}</h1>
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">{t('member.personal')}</h2>
        <div className="space-y-1.5">
          <Label htmlFor="m-name">{t('member.name')}</Label>
          <Input id="m-name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-email">Email</Label>
          <Input id="m-email" value={me.email} readOnly disabled />
          <p className="text-xs text-muted-foreground">{t('member.emailHint')}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-phone">{t('member.phone')}</Label>
          <Input id="m-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="081234567890" />
        </div>
      </section>

      <section className="mt-8 space-y-4 border-t pt-8">
        <div>
          <h2 className="font-display text-lg font-bold">{t('member.addressTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('member.addressOptional')}</p>
        </div>
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

      {/* Save bar slides in only when something changed, so the form never asks to save nothing. */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="sticky bottom-4 z-10 mt-8 flex items-center justify-between gap-3 rounded-2xl border bg-card p-3 pl-4 shadow-xl"
          >
            <span className="text-sm text-muted-foreground">{t('member.unsaved')}</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(initial())} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} {t('member.saveChanges')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
