import { Link2 } from 'lucide-react';
import { brandFill, detectPlatform } from '@/lib/social-platforms';
import { cn } from '@/lib/utils';

/** Official brand mark for a social URL; unknown sites get a generic link icon. */
export function SocialIcon({ url, className }: { url: string; className?: string }) {
  const platform = detectPlatform(url);
  if (!platform) return <Link2 className={cn('h-5 w-5', className)} aria-hidden />;
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill={brandFill(platform.color)} aria-hidden>
      <path d={platform.path} />
    </svg>
  );
}

export const socialLabel = (url: string) => {
  const platform = detectPlatform(url);
  if (platform) return platform.label;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
