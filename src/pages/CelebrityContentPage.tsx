import { useState, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Trash2, Search, Star, ExternalLink } from 'lucide-react';
import { useCelebrityContent, extractProductCode } from '@/hooks/useCelebrityContent';
import * as XLSX from 'xlsx';

const CelebrityContentPage = () => {
  const { items, isLoading, upsertMany, toggleActive, deleteItem } = useCelebrityContent();
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Find header row (contains "Celebrity")
      let headerIdx = rows.findIndex(r =>
        r.some((c: any) => typeof c === 'string' && c.toLowerCase().includes('celebrity'))
      );
      if (headerIdx === -1) headerIdx = 0;

      const dataRows = rows.slice(headerIdx + 1).filter(r => r[1] && r[2]); // need celebrity + image

      const parsed = dataRows.map(r => {
        const celebrity_name = String(r[1] || '').trim();
        const image_url = String(r[2] || '').trim();
        const shop_url = String(r[3] || '').trim();
        const product_code = extractProductCode(shop_url);
        return { celebrity_name, image_url, product_code, shop_url: shop_url || null, is_active: true };
      }).filter(r => r.celebrity_name && r.image_url);

      if (parsed.length === 0) {
        toast.error('No valid rows found in the Excel file');
        return;
      }

      await upsertMany.mutateAsync(parsed);
      toast.success(`Imported ${parsed.length} celebrity entries`);
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }, [upsertMany]);

  const filtered = items.filter(item =>
    item.celebrity_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.product_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const matched = filtered.filter(i => i.product_code);
  const unmatched = filtered.filter(i => !i.product_code);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <AppHeader />

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Star className="w-6 h-6" />
                Celebrity Content
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage celebrity images linked to product pages
              </p>
            </div>
            <div>
              <input
                type="file"
                accept=".xlsx,.xls"
                id="celeb-import"
                className="hidden"
                onChange={handleFileImport}
              />
              <Button asChild disabled={importing}>
                <label htmlFor="celeb-import" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {importing ? 'Importing...' : 'Import Excel'}
                </label>
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by celebrity or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Badge variant="secondary">{items.length} total</Badge>
            <Badge variant="outline" className="text-green-600">{items.filter(i => i.product_code).length} matched</Badge>
            <Badge variant="outline" className="text-amber-600">{items.filter(i => !i.product_code).length} unmatched</Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-6">
              {unmatched.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-amber-600 mb-3 uppercase tracking-wider">
                    Unmatched (no SKU extracted — linked to category pages)
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {unmatched.map(item => (
                      <CelebCard key={item.id} item={item} onToggle={toggleActive.mutate} onDelete={deleteItem.mutate} />
                    ))}
                  </div>
                </div>
              )}

              {matched.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-green-600 mb-3 uppercase tracking-wider">
                    Matched to Products
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {matched.map(item => (
                      <CelebCard key={item.id} item={item} onToggle={toggleActive.mutate} onDelete={deleteItem.mutate} />
                    ))}
                  </div>
                </div>
              )}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {items.length === 0
                    ? 'No celebrity content yet. Import an Excel file to get started.'
                    : 'No results match your search.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function CelebCard({
  item,
  onToggle,
  onDelete,
}: {
  item: any;
  onToggle: (args: { id: string; is_active: boolean }) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className={`overflow-hidden transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
      <div className="aspect-[3/4] relative bg-secondary">
        <img
          src={item.image_url}
          alt={item.celebrity_name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <Switch
            checked={item.is_active}
            onCheckedChange={(checked) => onToggle({ id: item.id, is_active: checked })}
            className="scale-75"
          />
        </div>
      </div>
      <CardContent className="p-2.5">
        <p className="text-sm font-medium text-foreground truncate">{item.celebrity_name}</p>
        {item.product_code ? (
          <p className="text-xs text-muted-foreground font-mono truncate">{item.product_code}</p>
        ) : (
          <p className="text-xs text-amber-500">No SKU</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          {item.shop_url && (
            <a href={item.shop_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              <ExternalLink className="w-3 h-3" /> Shop
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CelebrityContentPage;
