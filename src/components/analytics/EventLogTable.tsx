import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanEvent } from '@/hooks/useScanAnalytics';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const EVENT_COLORS: Record<string, string> = {
  scan: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  page_view: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  look_product_click: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  look_regenerate: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  lead_capture: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

interface Props {
  events: ScanEvent[];
}

const PAGE_SIZE = 25;

export function EventLogTable({ events }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filtered = events.filter(e => {
    if (typeFilter && e.event_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.product_code.toLowerCase().includes(q) ||
        e.session_id.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const eventTypes = Array.from(new Set(events.map(e => e.event_type)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={typeFilter === null ? 'default' : 'outline'} onClick={() => { setTypeFilter(null); setPage(0); }}>All</Button>
          {eventTypes.map(t => (
            <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} onClick={() => { setTypeFilter(t); setPage(0); }}>
              {t.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Session</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No events</TableCell></TableRow>
            ) : paged.map(e => {
              const meta = e.metadata as any;
              return (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${EVENT_COLORS[e.event_type] || ''}`} variant="secondary">
                      {e.event_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.product_code}</TableCell>
                  <TableCell className="text-xs">{meta?.source === 'qr_scan' ? '🔲 QR' : meta?.source === 'direct' ? '🌐 Direct' : '—'}</TableCell>
                  <TableCell className="text-xs">{meta?.country ? `${meta.city || '?'}, ${meta.country}` : '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.session_id.slice(0, 8)}…</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} events</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button size="icon" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
