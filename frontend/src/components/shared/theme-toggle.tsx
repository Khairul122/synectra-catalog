'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { runViewTransition } from '@/lib/view-transition';

/**
 * Two-state toggle: flips to the opposite of what is rendered. If that matches the
 * OS preference, the override is cleared ("system") instead of pinned.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === 'dark';

  const toggle = () => {
    const target = isDark ? 'light' : 'dark';
    runViewTransition(
      'theme',
      () => {
        // Apply the class synchronously so the "after" snapshot already shows the new theme;
        // next-themes then persists the choice and keeps the same class.
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(target);
        setTheme(target === systemTheme ? 'system' : target);
      },
      buttonRef.current,
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button ref={buttonRef} variant="outline" size="icon" aria-label={isDark ? t('common.lightMode') : t('common.darkMode')} onClick={toggle} className={cn('relative overflow-hidden rounded-full glass', className)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? 'moon' : 'sun'}
              initial={{ y: -20, rotate: -90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: 20, rotate: 90, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {isDark ? <Moon /> : <Sun />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? t('common.lightMode') : t('common.darkMode')}</TooltipContent>
    </Tooltip>
  );
}

const LOCALES: { value: Locale; label: string; name: string }[] = [
  { value: 'id', label: 'ID', name: 'Bahasa Indonesia' },
  { value: 'en', label: 'EN', name: 'English' },
];

/** Segmented ID / EN switch with a sliding pill. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const uid = useId();
  return (
    <div role="radiogroup" aria-label={t('common.language')} className={cn('glass flex h-9 items-center rounded-full p-0.5', className)}>
      {LOCALES.map(({ value, label, name }) => {
        const active = locale === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={name}
            lang={value}
            onClick={() => value !== locale && runViewTransition('locale', () => setLocale(value))}
            className={cn('relative h-full rounded-full px-3 text-xs font-semibold transition-colors', active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {active && <motion.span layoutId={`locale-pill-${uid}`} className="absolute inset-0 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Preferences({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
