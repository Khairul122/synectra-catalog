'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, ImageIcon, Instagram, Loader2, Music2, Palette, Save, Store, Youtube } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/services/api';
import type { Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dropzone, putWithProgress } from '@/components/shared/dropzone';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const PRESET_COLORS = [
  { name: 'Cyan', hex: '#00A8E8' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Slate', hex: '#0F172A' },
];

const DEFAULT_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  business_name: 'Synectra Digital',
  display_name: 'Synectra Digital',
  bio: 'Katalog produk digital, template, dan aset kreatif pilihan.',
  avatar_url: null,
  cover_banner_url: null,
  instagram_url: null,
  tiktok_url: null,
  youtube_url: null,
  theme_color: '#00A8E8',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const validateUrl = (url: string | null | undefined): string | undefined => {
  if (!url || url.trim() === '') return undefined;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

const validateHexColor = (color: string | null | undefined): string | undefined => {
  const hex = color?.trim();
  return hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : undefined;
};

export default function AdminAppearancePage() {
  const { token } = useAdmin();
  const { t, locale } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [progress, setProgress] = useState<{ avatar: number | null; cover: number | null }>({ avatar: null, cover: null });

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoading(true);
    api
      .adminGetProfile(token)
      .then((data) => isMounted && setProfile(data || DEFAULT_PROFILE))
      .catch((err) => {
        if (!isMounted) return;
        toast.error(t('look.loadFailed'), { description: err.message });
        setProfile(DEFAULT_PROFILE);
      })
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [token]);

  const set = (field: keyof Profile, value: string | null) => {
    setProfile((prev) => ({ ...(prev ?? DEFAULT_PROFILE), [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!profile || !token) return;
    for (const [label, value] of [['Instagram', profile.instagram_url], ['TikTok', profile.tiktok_url], ['YouTube', profile.youtube_url]] as const) {
      if (value?.trim() && !validateUrl(value)) return toast.error(t('look.invalidUrl', { label }), { description: t('look.urlFormat') });
    }
    setSaving(true);
    try {
      const updated = await api.adminUpdateProfile(token, profile.id, {
        business_name: profile.business_name ?? undefined,
        display_name: profile.display_name ?? undefined,
        bio: profile.bio ?? undefined,
        avatar_url: profile.avatar_url ?? undefined,
        cover_banner_url: profile.cover_banner_url ?? undefined,
        instagram_url: validateUrl(profile.instagram_url),
        tiktok_url: validateUrl(profile.tiktok_url),
        youtube_url: validateUrl(profile.youtube_url),
        theme_color: validateHexColor(profile.theme_color),
      });
      if (updated) setProfile(updated);
      setDirty(false);
      toast.success(t('look.saved'), { description: t('look.savedSub') });
    } catch (err) {
      toast.error(t('look.saveFailed'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File, kind: 'avatar' | 'cover') => {
    if (!token) return;
    if (!file.type.startsWith('image/')) return toast.error(t('look.errImage'));
    if (file.size > 5 * 1024 * 1024) return toast.error(t('look.errSize'));
    const field = kind === 'avatar' ? 'avatar_url' : 'cover_banner_url';
    const previous = profile?.[field] ?? null;
    set(field, URL.createObjectURL(file));
    setProgress((p) => ({ ...p, [kind]: 0 }));
    try {
      const res = await api.adminGenerateUploadUrl(token, 'public-assets', file.name);
      await putWithProgress(res.uploadUrl, file, (pct) => setProgress((p) => ({ ...p, [kind]: pct })), locale);
      if (!res.publicUrl) throw new Error(t('look.noPublicUrl'));
      set(field, res.publicUrl);
      toast.success(kind === 'avatar' ? t('look.avatarUploaded') : t('look.bannerUploaded'), { description: t('look.rememberSave') });
    } catch (err) {
      set(field, previous);
      toast.error(t('look.uploadFailed'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setTimeout(() => setProgress((p) => ({ ...p, [kind]: null })), 600);
    }
  };

  if (loading || !profile) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-[520px] rounded-3xl" />
        <Skeleton className="hidden h-[640px] rounded-[2.5rem] lg:block" />
      </div>
    );
  }

  const themeColor = validateHexColor(profile.theme_color) ?? '#00A8E8';

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">{t('look.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('look.sub')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="h-11 rounded-full p-1">
            <TabsTrigger value="profile" className="gap-1.5 rounded-full px-4"><Store className="h-4 w-4" /> {t('look.tabProfile')}</TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 rounded-full px-4"><ImageIcon className="h-4 w-4" /> {t('look.tabMedia')}</TabsTrigger>
            <TabsTrigger value="theme" className="gap-1.5 rounded-full px-4"><Palette className="h-4 w-4" /> {t('look.tabTheme')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="glass space-y-4 rounded-3xl p-6 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2">
            <div className="space-y-1.5">
              <Label htmlFor="business_name">{t('look.storeName')}</Label>
              <Input id="business_name" value={profile.business_name ?? ''} onChange={(e) => set('business_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t('look.bio')}</Label>
              <Textarea id="bio" rows={3} maxLength={300} value={profile.bio ?? ''} onChange={(e) => set('bio', e.target.value)} />
              <p className="text-right text-xs text-muted-foreground">{(profile.bio ?? '').length}/300</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ['instagram_url', 'Instagram', Instagram],
                ['tiktok_url', 'TikTok', Music2],
                ['youtube_url', 'YouTube', Youtube],
              ] as const).map(([field, label, Icon]) => {
                const value = profile[field] ?? '';
                const invalid = value.trim() !== '' && !validateUrl(value);
                return (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={field}>{label}</Label>
                    <div className="group relative">
                      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
                      <Input id={field} value={value} onChange={(e) => set(field, e.target.value)} placeholder="https://..." aria-invalid={invalid} className={cn('pl-10', invalid && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15')} />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="media" className="glass space-y-4 rounded-3xl p-6 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2">
            <div className="space-y-1.5">
              <Label>{t('look.banner')}</Label>
              <Dropzone
                accept="image/*"
                label={t('look.bannerDrop')}
                hint={t('look.bannerHint')}
                progress={progress.cover}
                onFile={(f) => upload(f, 'cover')}
                className="aspect-[1200/628]"
                preview={
                  profile.cover_banner_url ? (
                    <img src={profile.cover_banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-40" />
                  ) : undefined
                }
              />
            </div>
            <div className="flex items-center gap-4">
              <Dropzone
                accept="image/*"
                label=""
                progress={progress.avatar}
                onFile={(f) => upload(f, 'avatar')}
                className="h-24 w-24 shrink-0 rounded-full p-0"
                preview={
                  profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-50" />
                  ) : undefined
                }
              />
              <div>
                <p className="text-sm font-medium">{t('look.avatar')}</p>
                <p className="text-xs text-muted-foreground">{t('look.avatarHint')}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="glass space-y-5 rounded-3xl p-6 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {PRESET_COLORS.map(({ name, hex }) => {
                const active = themeColor.toLowerCase() === hex.toLowerCase();
                return (
                  <motion.button
                    key={hex}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => set('theme_color', hex)}
                    className={cn('flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs transition-colors', active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}
                  >
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: hex }}>
                      <AnimatePresence>
                        {active && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="h-4 w-4 text-white" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    {name}
                  </motion.button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={themeColor} onChange={(e) => set('theme_color', e.target.value)} aria-label={t('look.customColor')} className="h-11 w-14 cursor-pointer rounded-xl border bg-transparent p-1" />
              <Input value={profile.theme_color ?? ''} onChange={(e) => set('theme_color', e.target.value)} placeholder="#00A8E8" className="max-w-[160px] font-mono" />
            </div>
          </TabsContent>
        </Tabs>

        {/* Live phone preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('look.preview')}</p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-[300px] rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-2xl">
            <div className="h-[560px] overflow-y-auto rounded-[1.8rem]">
              <div className="relative aspect-[1200/628]" style={{ background: profile.cover_banner_url ? undefined : themeColor }}>
                {profile.cover_banner_url && (
                  <img src={profile.cover_banner_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="px-4 pb-6 text-center">
                <div className="mx-auto -mt-9 h-[72px] w-[72px] overflow-hidden rounded-full border-4 border-background bg-muted">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold" style={{ color: themeColor }}>
                      {(profile.business_name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <motion.p key={profile.business_name} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="mt-2 font-display font-bold">
                  {profile.business_name || t('look.storePlaceholder')}
                </motion.p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{profile.bio}</p>
                <div className="mt-3 flex justify-center gap-2">
                  {[profile.instagram_url && Instagram, profile.tiktok_url && Music2, profile.youtube_url && Youtube].filter(Boolean).map((Icon, i) => {
                    const I = Icon as typeof Instagram;
                    return <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full border"><I className="h-3.5 w-3.5" /></span>;
                  })}
                </div>
                <div className="mt-4 space-y-2">
                  {['Portofolio', 'Konsultasi'].map((t) => (
                    <div key={t} className="rounded-xl border p-2.5 text-left text-xs font-medium">{t}</div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="overflow-hidden rounded-xl border text-left">
                      <div className="aspect-square bg-muted" />
                      <div className="space-y-1.5 p-2">
                        <div className="h-2 w-3/4 rounded bg-muted" />
                        <motion.div layout className="rounded-md py-1 text-center text-[10px] font-semibold text-white" style={{ backgroundColor: themeColor }}>Beli</motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating save bar appears when there are unsaved changes */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="glass fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl p-3 pl-5 shadow-2xl"
          >
            <span className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-warning" /> {t('look.unsaved')}
            </span>
            <Button variant="brand" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} {t('common.save')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
