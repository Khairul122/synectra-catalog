'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Link } from '@/types';

/** Full-width pill buttons, the core link-in-bio block. */
export function LinkBlockList({ links }: { links: Link[] }) {
  const activeLinks = links.filter((l) => l.is_active).sort((a, b) => a.sort_order - b.sort_order);
  if (activeLinks.length === 0) return null;

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.45 } } }}
      className="mt-8 space-y-3"
    >
      {activeLinks.map((link) => (
        <motion.li key={link.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
          <motion.a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-2 pr-4 shadow-sm transition-shadow hover:shadow-glow',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:rotate-6 group-hover:scale-110">
              <Globe className="h-5 w-5" />
            </span>
            <span className="flex-1 truncate text-center text-sm font-semibold">{link.title}</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </motion.a>
        </motion.li>
      ))}
    </motion.ul>
  );
}
