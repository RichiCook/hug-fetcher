import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductRow } from '@/hooks/useScanAnalytics';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

interface Props {
  rows: ProductRow[];
}

export function ProductAnalyticsTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof ProductRow>('pageViews');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = rows.filter(r => r.code.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleSort = (key: keyof ProductRow) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ k, label }: { k: keyof ProductRow; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </TableHead>
  );

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search product code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader k="code" label="Product" />
              <SortHeader k="scans" label="Scans" />
              <SortHeader k="pageViews" label="Views" />
              <SortHeader k="clicks" label="Clicks" />
              <SortHeader k="leads" label="Leads" />
              <SortHeader k="topLocation" label="Top Location" />
              <SortHeader k="lastSeen" label="Last Seen" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
            ) : sorted.map(r => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell>{r.scans}</TableCell>
                <TableCell>{r.pageViews}</TableCell>
                <TableCell>{r.clicks}</TableCell>
                <TableCell>{r.leads}</TableCell>
                <TableCell className="text-xs">{r.topLocation}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(r.lastSeen), 'MMM d, HH:mm')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
