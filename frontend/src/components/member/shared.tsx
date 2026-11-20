'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/shared/message-dialog';
import { useI18n } from '@/lib/i18n';

/** Entrance motion shared by the member side panels and lists. */
export const stagger = { show: { transition: { staggerChildren: 0.06 } } };
export const rise = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useI18n();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(t('common.copied'), { description: label });
    } catch {
      notify.error(t('member.copyFailed'));
    }
  };
  return (
    <Button variant="ghost" size="icon" onClick={copy} aria-label={t('member.copyLabel', { label })}>
      <Copy />
    </Button>
  );
}
