import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export interface ScanEvent {
  id: string;
  session_id: string;
  event_type: string;
  product_code: string;
  target_product_code: string | null;
  look_product_codes: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PairScore {
  id: string;
  product_code_a: string;
  product_code_b: string;
  score: number;
  click_count: number;
  view_count: number;
  conversion_count: number;
  updated_at: string;
}

export type DatePreset = '24h' | '7d' | '30d' | '90d' | 'all';
export type SourceFilter = 'all' | 'qr_scan' | 'direct';

export interface ProductRow {
  code: string;
  scans: number;
  pageViews: number;
  clicks: number;
  leads: number;
  topLocation: string;
  lastSeen: string;
}

export interface SessionRow {
  sessionId: string;
  products: string[];
  location: string;
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
}

function getDateRange(preset: DatePreset): { start: Date | null; end: Date } {
  const end = endOfDay(new Date());
  switch (preset) {
    case '24h': return { start: startOfDay(subDays(new Date(), 1)), end };
    case '7d': return { start: startOfDay(subDays(new Date(), 7)), end };
    case '30d': return { start: startOfDay(subDays(new Date(), 30)), end };
    case '90d': return { start: startOfDay(subDays(new Date(), 90)), end };
    case 'all': return { start: null, end };
  }
}

export function useScanAnalytics() {
  const queryClient = useQueryClient();
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const dateRange = useMemo(() => {
    if (customStart && customEnd) return { start: startOfDay(customStart), end: endOfDay(customEnd) };
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const { data: scanEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['scan-events', dateRange.start?.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('scan_events')
        .select('*')
        .order('created_at', { ascending: false })
        .lte('created_at', dateRange.end.toISOString());

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start.toISOString());
      }

      // Fetch in batches to exceed 1000 limit
      const all: unknown[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await query.range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return all as unknown as ScanEvent[];
    },
  });

  const { data: pairScores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['pair-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_pair_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as PairScore[];
    },
  });

  const aggregateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('aggregate-pair-scores');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pair-scores'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clear_scan_events' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-events'] });
    },
  });

  // Apply source filter
  const filteredEvents = useMemo(() => {
    if (sourceFilter === 'all') return scanEvents;
    return scanEvents.filter(e => {
      const source = (e.metadata as any)?.source;
      return source === sourceFilter;
    });
  }, [scanEvents, sourceFilter]);

  // KPI totals
  const totalScans = filteredEvents.filter(e => e.event_type === 'scan').length;
  const totalPageViews = filteredEvents.filter(e => e.event_type === 'page_view').length;
  const totalClicks = filteredEvents.filter(e => e.event_type === 'look_product_click').length;
  const totalLeads = filteredEvents.filter(e => e.event_type === 'lead_capture').length;

  // Stacked daily data
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; scans: number; page_views: number; clicks: number; leads: number }> = {};
    filteredEvents.forEach(e => {
      const day = e.created_at.split('T')[0];
      if (!map[day]) map[day] = { date: day, scans: 0, page_views: 0, clicks: 0, leads: 0 };
      if (e.event_type === 'scan') map[day].scans++;
      else if (e.event_type === 'page_view') map[day].page_views++;
      else if (e.event_type === 'look_product_click') map[day].clicks++;
      else if (e.event_type === 'lead_capture') map[day].leads++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents]);

  // Top products (most viewed)
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents
      .filter(e => e.event_type === 'page_view' || e.event_type === 'scan')
      .forEach(e => { counts[e.product_code] = (counts[e.product_code] || 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));
  }, [filteredEvents]);

  // Per-product detail table
  const productRows = useMemo((): ProductRow[] => {
    const map: Record<string, { scans: number; pageViews: number; clicks: number; leads: number; locations: Record<string, number>; lastSeen: string }> = {};
    filteredEvents.forEach(e => {
      const code = e.product_code;
      if (!map[code]) map[code] = { scans: 0, pageViews: 0, clicks: 0, leads: 0, locations: {}, lastSeen: e.created_at };
      if (e.event_type === 'scan') map[code].scans++;
      else if (e.event_type === 'page_view') map[code].pageViews++;
      else if (e.event_type === 'look_product_click') map[code].clicks++;
      else if (e.event_type === 'lead_capture') map[code].leads++;
      if (e.created_at > map[code].lastSeen) map[code].lastSeen = e.created_at;
      const meta = e.metadata as any;
      if (meta?.country) {
        const loc = `${meta.city || 'Unknown'}, ${meta.country}`;
        map[code].locations[loc] = (map[code].locations[loc] || 0) + 1;
      }
    });
    return Object.entries(map).map(([code, d]) => {
      const topLoc = Object.entries(d.locations).sort(([, a], [, b]) => b - a)[0];
      return {
        code,
        scans: d.scans,
        pageViews: d.pageViews,
        clicks: d.clicks,
        leads: d.leads,
        topLocation: topLoc ? topLoc[0] : '—',
        lastSeen: d.lastSeen,
      };
    }).sort((a, b) => (b.scans + b.pageViews) - (a.scans + a.pageViews));
  }, [filteredEvents]);

  // Location breakdown
  const topLocations = useMemo(() => {
    const counts: Record<string, { country: string; city: string; count: number }> = {};
    filteredEvents.forEach(e => {
      const meta = e.metadata as any;
      if (meta?.country) {
        const key = `${meta.country}|${meta.city || 'Unknown'}`;
        if (!counts[key]) counts[key] = { country: meta.country, city: meta.city || 'Unknown', count: 0 };
        counts[key].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [filteredEvents]);

  // Sessions
  const sessionRows = useMemo((): SessionRow[] => {
    const map: Record<string, { products: Set<string>; location: string; count: number; first: string; last: string }> = {};
    filteredEvents.forEach(e => {
      const sid = e.session_id;
      if (!map[sid]) map[sid] = { products: new Set(), location: '', count: 0, first: e.created_at, last: e.created_at };
      map[sid].products.add(e.product_code);
      map[sid].count++;
      if (e.created_at < map[sid].first) map[sid].first = e.created_at;
      if (e.created_at > map[sid].last) map[sid].last = e.created_at;
      const meta = e.metadata as any;
      if (meta?.country && !map[sid].location) {
        map[sid].location = `${meta.city || 'Unknown'}, ${meta.country}`;
      }
    });
    return Object.entries(map)
      .map(([sessionId, d]) => ({
        sessionId: sessionId.slice(0, 8) + '…',
        products: Array.from(d.products),
        location: d.location || '—',
        eventCount: d.count,
        firstSeen: d.first,
        lastSeen: d.last,
      }))
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 50);
  }, [filteredEvents]);

  // CSV export
  const exportCsv = useCallback(() => {
    const headers = ['Timestamp', 'Event Type', 'Product Code', 'Target Product', 'Source', 'Country', 'City', 'Session ID'];
    const rows = filteredEvents.map(e => {
      const meta = e.metadata as any;
      return [
        e.created_at,
        e.event_type,
        e.product_code,
        e.target_product_code || '',
        meta?.source || '',
        meta?.country || '',
        meta?.city || '',
        e.session_id,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  return {
    // Filters
    datePreset, setDatePreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    sourceFilter, setSourceFilter,
    // Data
    scanEvents: filteredEvents,
    pairScores,
    eventsLoading,
    scoresLoading,
    // KPIs
    totalScans, totalPageViews, totalClicks, totalLeads,
    // Charts & tables
    dailyData,
    topProducts,
    topLocations,
    productRows,
    sessionRows,
    // Actions
    aggregate: aggregateMutation.mutate,
    aggregating: aggregateMutation.isPending,
    clearEvents: clearMutation.mutate,
    clearing: clearMutation.isPending,
    exportCsv,
  };
}
