'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface CategoryFilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  search: string;
  onSearch: (value: string) => void;
}

export function CategoryFilterBar({ categories, selectedCategory, onSelectCategory, search, onSearch }: CategoryFilterBarProps) {
  const { t } = useI18n();
  const all = [{ value: '', label: t('store.all') }, ...categories.map((c) => ({ value: c, label: c }))];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="store-search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('store.search')}
          aria-label={t('store.search')}
          className="rounded-full pl-10 pr-9"
        />
        {search && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => onSearch('')}
            aria-label={t('store.clearSearch')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </div>

      {categories.length > 0 && (
        <div role="tablist" aria-label={t('store.filter')} className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
          {all.map(({ value, label }) => {
            const active = selectedCategory === value;
            return (
              <button
                key={label}
                role="tab"
                aria-selected={active}
                onClick={() => onSelectCategory(value)}
                className={cn(
                  'relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 rounded-full bg-primary shadow-lg shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
