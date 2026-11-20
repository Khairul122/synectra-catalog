'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { BadgeCheck, Instagram, Music2, Youtube } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

interface ProfileHeaderProps {
  profile: Profile | null;
  loading?: boolean;
}

/** Link-in-bio header: banner, overlapping avatar, centered name, bio and social icons. */
export function ProfileHeader({ profile, loading }: ProfileHeaderProps) {
  const { t } = useI18n();
  if (loading) return <ProfileSkeleton />;
  if (!profile) return null;

  const displayName = profile.business_name || profile.display_name || 'Synectra Digital';
  const socials = [
    { href: profile.instagram_url, label: 'Instagram', icon: Instagram },
    { href: profile.tiktok_url, label: 'TikTok', icon: Music2 },
    { href: profile.youtube_url, label: 'YouTube', icon: Youtube },
  ].filter((s) => s.href);

  return (
    <header className="text-center">
      {profile.cover_banner_url && (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-[1200/628] w-full overflow-hidden rounded-3xl shadow-xl shadow-primary/10"
      >
        <Image src={profile.cover_banner_url} alt="" fill priority sizes="600px" unoptimized={profile.cover_banner_url.startsWith('blob:')} className="object-cover" />
      </motion.div>
      )}

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.2 }}
        className={cn('relative mx-auto h-24 w-24', profile.cover_banner_url && '-mt-12')}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-background bg-card ring-2 ring-primary/40">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={displayName} fill sizes="96px" unoptimized={profile.avatar_url.startsWith('blob:')} className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/15 font-display text-4xl font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 inline-flex items-center gap-1.5 text-2xl font-bold">
        {displayName}
        <BadgeCheck className="h-5 w-5 text-primary" aria-label={t('store.verified')} />
      </motion.h1>
      {profile.bio && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mx-auto mt-2 max-w-sm text-balance text-sm leading-relaxed text-muted-foreground">
          {profile.bio}
        </motion.p>
      )}

      {socials.length > 0 && (
        <div className="mt-4 flex justify-center gap-2">
          {socials.map(({ href, label, icon: Icon }, i) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <motion.a
                  href={href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.08, type: 'spring' }}
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </header>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-11 rounded-full" />)}
      </div>
    </div>
  );
}
