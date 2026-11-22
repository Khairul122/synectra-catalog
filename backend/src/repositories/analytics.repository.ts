import { supabaseAdmin } from '../infrastructure/supabase.admin';

export interface AnalyticsEventInput {
  type: 'pageview' | 'click';
  path: string;
  label?: string | null;
  target?: string | null;
  referrer?: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
}

export type AnalyticsEvent = AnalyticsEventInput & { id: number; created_at: string };

type Count = { key: string; count: number };

export interface TrafficSummary {
  days: number;
  pageviews: number;
  clicks: number;
  visitors: number;
  daily: { date: string; pageviews: number; clicks: number }[];
  topPages: Count[];
  topClicks: Count[];
  countries: Count[];
  referrers: Count[];
  recent: AnalyticsEvent[];
}

// ponytail: aggregates in JS over at most MAX_ROWS events. Move to SQL views/RPC once traffic outgrows it.
const MAX_ROWS = 20_000;

function top(values: (string | null | undefined)[], limit = 10): Count[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

export class AnalyticsRepository {
  async insert(event: AnalyticsEventInput): Promise<void> {
    const { error } = await supabaseAdmin.from('analytics_events').insert(event);
    if (error) throw new Error(`AnalyticsRepository.insert failed: ${error.message}`);
  }

  async summary(days: number): Promise<TrafficSummary> {
    const since = new Date(Date.now() - days * 86_400_000);
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw new Error(`AnalyticsRepository.summary failed: ${error.message}`);

    const events = (data || []) as AnalyticsEvent[];
    const views = events.filter((e) => e.type === 'pageview');
    const clicks = events.filter((e) => e.type === 'click');

    // One bucket per day (UTC+7, the store's timezone) so empty days still show on the chart.
    const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
    const daily = new Map<string, { pageviews: number; clicks: number }>();
    for (let i = days - 1; i >= 0; i--) daily.set(dayKey(new Date(Date.now() - i * 86_400_000).toISOString()), { pageviews: 0, clicks: 0 });
    for (const e of events) {
      const bucket = daily.get(dayKey(e.created_at));
      if (bucket) bucket[e.type === 'pageview' ? 'pageviews' : 'clicks'] += 1;
    }

    return {
      days,
      pageviews: views.length,
      clicks: clicks.length,
      visitors: new Set(views.map((e) => e.ip).filter(Boolean)).size,
      daily: [...daily].map(([date, v]) => ({ date, ...v })),
      topPages: top(views.map((e) => e.path)),
      topClicks: top(clicks.map((e) => e.label || e.target)),
      countries: top(views.map((e) => e.country), 20),
      referrers: top(views.map((e) => e.referrer)),
      recent: events.slice(0, 100),
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
