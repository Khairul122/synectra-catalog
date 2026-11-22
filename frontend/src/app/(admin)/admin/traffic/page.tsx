'use client';

import { useEffect, useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TrafficCount, TrafficSummary } from '@/types';

const RANGES: { days: number; key: MessageKey }[] = [
  { days: 1, key: 'traffic.range1' },
  { days: 7, key: 'traffic.range7' },
  { days: 30, key: 'traffic.range30' },
  { days: 90, key: 'traffic.range90' },
];

export default function TrafficPage() {
  const { token } = useAdmin();
  const { t, intl } = useI18n();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<TrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .adminGetTraffic(token, days)
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(err.message || t('traffic.loadError')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, days, reloadKey]);

  const countryName = useMemo(() => {
    const names = new Intl.DisplayNames([intl], { type: 'region' });
    return (code: string) => {
      try {
        return names.of(code) ?? code;
      } catch {
        return code;
      }
    };
  }, [intl]);

  const peak = Math.max(1, ...(data?.daily.map((d) => d.pageviews + d.clicks) ?? [0]));
  const stats = [
    { label: t('traffic.pageviews'), value: data?.pageviews ?? 0 },
    { label: t('traffic.visitors'), value: data?.visitors ?? 0 },
    { label: t('traffic.clicks'), value: data?.clicks ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">{t('traffic.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('traffic.sub')}</p>
        </div>
        <div role="group" aria-label={t('traffic.rangeLabel')} className="inline-flex rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                days === r.days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(r.key)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} retrying={loading} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-5">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 font-mono text-3xl font-bold">{s.value.toLocaleString(intl)}</p>}
              </div>
            ))}
          </div>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-bold">{t('traffic.daily')}</h2>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> {t('traffic.pageviews')}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {t('traffic.clicks')}</span>
            </div>
            {loading ? (
              <Skeleton className="mt-4 h-40 w-full" />
            ) : (
              <div className="mt-4 flex h-40 items-end gap-1">
                {data?.daily.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.pageviews} ${t('traffic.pageviews')}, ${d.clicks} ${t('traffic.clicks')}`}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <div className="w-full rounded-t-sm bg-amber-500" style={{ height: `${(d.clicks / peak) * 100}%` }} />
                    <div className="w-full bg-primary" style={{ height: `${(d.pageviews / peak) * 100}%` }} />
                  </div>
                ))}
              </div>
            )}
            {!loading && data && data.daily.length > 1 && (
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{data.daily[0].date}</span>
                <span>{data.daily[data.daily.length - 1].date}</span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankList title={t('traffic.topPages')} items={data?.topPages} loading={loading} empty={t('traffic.none')} />
            <RankList title={t('traffic.topClicks')} items={data?.topClicks} loading={loading} empty={t('traffic.none')} />
            <RankList
              title={t('traffic.countries')}
              items={data?.countries.map((c) => ({ ...c, key: `${countryName(c.key)} (${c.key})` }))}
              loading={loading}
              empty={t('traffic.none')}
            />
            <RankList title={t('traffic.referrers')} items={data?.referrers} loading={loading} empty={t('traffic.directOnly')} />
          </div>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-bold">{t('traffic.recent')}</h2>
            <p className="text-sm text-muted-foreground">{t('traffic.recentSub')}</p>
            {loading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !data?.recent.length ? (
              <EmptyState icon={Inbox} title={t('traffic.emptyTitle')} description={t('traffic.emptySub')} className="border-0 bg-transparent" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.time')}</TableHead>
                      <TableHead>{t('traffic.event')}</TableHead>
                      <TableHead>{t('traffic.location')}</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleString(intl, { dateStyle: 'short', timeStyle: 'short' })}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className={cn('mr-2 rounded px-1.5 py-0.5 text-[11px] font-semibold', e.type === 'click' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-primary/15 text-primary')}>
                            {e.type === 'click' ? t('traffic.click') : t('traffic.view')}
                          </span>
                          <span className="break-words text-sm" title={e.target ?? undefined}>
                            {e.type === 'click' ? `${e.label || e.target} · ${e.path}` : e.path}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {e.country ? `${countryName(e.country)}${e.city ? `, ${e.city}` : ''}` : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{e.ip ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function RankList({ title, items, loading, empty }: { title: string; items?: TrafficCount[]; loading: boolean; empty: string }) {
  const max = Math.max(1, ...(items?.map((i) => i.count) ?? [0]));
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-bold">{title}</h2>
      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
        </div>
      ) : !items?.length ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1.5 text-sm">
              <span className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${(item.count / max) * 100}%` }} aria-hidden />
              <span className="relative min-w-0 truncate" title={item.key}>{item.key}</span>
              <span className="relative shrink-0 font-mono font-semibold">{item.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
