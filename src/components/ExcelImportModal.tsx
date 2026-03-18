import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PRODUCT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'product_code', label: 'Product Code' },
  { key: 'price', label: 'Price' },
  { key: 'description', label: 'Description' },
  { key: 'composition', label: 'Composition' },
  { key: 'care_instructions', label: 'Care Instructions' },
  { key: 'category', label: 'Category' },
  { key: 'color', label: 'Color' },
  { key: 'collection', label: 'Collection' },
  { key: 'source_url', label: 'Source URL' },
  { key: 'images', label: 'Images (comma-separated URLs)' },
] as const;

type FieldKey = (typeof PRODUCT_FIELDS)[number]['key'];

// Robust header matching helpers
const normalizeColumnName = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[_\s]+/g, ' ')        // Normalize whitespace
    .trim();

const FIELD_ALIASES: Record<string, string[]> = {
  name: ['name', 'product name', 'title', 'nome', 'nome prodotto', 'prodotto'],
  product_code: ['product code', 'code', 'sku', 'codice', 'codice prodotto', 'articolo', 'ref', 'reference'],
  price: ['price', 'prezzo', 'costo', 'cost', 'retail price', 'prezzo vendita'],
  description: ['description', 'descrizione', 'desc', 'details', 'dettagli'],
  composition: ['composition', 'composizione', 'material', 'materiale', 'fabric', 'tessuto'],
  care_instructions: ['care instructions', 'care', 'cura', 'istruzioni', 'lavaggio', 'manutenzione'],
  category: ['category', 'categories', 'categoria', 'categorie', 'department', 'type', 'tipo', 'reparto', 'classe', 'sottoclasse', 'sub category', 'subcategory'],
  color: ['color', 'colour', 'colore', 'variante colore', 'color variant'],
  collection: ['collection', 'collezione', 'season', 'stagione', 'linea', 'line'],
  source_url: ['source url', 'url', 'link', 'product url', 'source'],
  images: ['images', 'image', 'immagini', 'immagine', 'image url', 'photo', 'foto'],
};

const findBestHeaderMatch = (headers: string[], fieldKey: string): string | undefined => {
  const normalizedHeaders = headers.map(normalizeColumnName);
  const aliases = FIELD_ALIASES[fieldKey] || [fieldKey.replace(/_/g, ' ')];
  const normalizedAliases = aliases.map(normalizeColumnName);

  // Priority 1: Exact match
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }

  // Priority 2: Starts with
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.findIndex((h) => h.startsWith(alias));
    if (idx !== -1) return headers[idx];
  }

  // Priority 3: Contains
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(alias));
    if (idx !== -1) return headers[idx];
  }

  return undefined;
};

interface ImportResults {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const generateSlug = (name: string, productCode: string | undefined, index: number): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = productCode
    ? `-${productCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`
    : `-${Date.now().toString(36)}${index.toString(36)}`;
  return `${base}${suffix}`;
};

export const ExcelImportModal = ({ onImportComplete }: { onImportComplete?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'done'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({} as Record<FieldKey, string>);
  const [collectionOverride, setCollectionOverride] = useState('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setStep('upload');
    setHeaders([]);
    setRows([]);
    setMapping({} as Record<FieldKey, string>);
    setCollectionOverride('');
    setProgress(0);
    setResults(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          toast({ title: 'Empty file', description: 'No data found in the Excel file', variant: 'destructive' });
          return;
        }

        const fileHeaders = Object.keys(jsonData[0]);
        setHeaders(fileHeaders);
        setRows(jsonData);

        // Auto-map columns using robust multi-tier matching
        const autoMapping: Record<string, string> = {};
        for (const field of PRODUCT_FIELDS) {
          const match = findBestHeaderMatch(fileHeaders, field.key);
          if (match) autoMapping[field.key] = match;
        }
        setMapping(autoMapping as Record<FieldKey, string>);
        setStep('mapping');
      } catch (err) {
        toast({ title: 'Error reading file', description: 'Could not parse the Excel file', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!mapping.name) {
      toast({ title: 'Name required', description: 'Please map the Name field before importing', variant: 'destructive' });
      return;
    }

    setStep('importing');
    const importResults: ImportResults = { created: 0, skipped: 0, failed: 0, errors: [] };

    let globalRowIndex = 0;

    // Process in batches of 20
    const batchSize = 20;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const withCode: any[] = [];
      const withoutCode: any[] = [];

      for (const row of batch) {
        const name = String(row[mapping.name] || '').trim();
        if (!name) {
          importResults.skipped++;
          globalRowIndex++;
          continue;
        }

        const productCode = mapping.product_code ? String(row[mapping.product_code] || '').trim() : '';
        const imagesRaw = mapping.images ? String(row[mapping.images] || '') : '';
        const images = imagesRaw
          ? imagesRaw.split(',').map((u) => u.trim()).filter(Boolean)
          : [];

        const product = {
          name,
          slug: generateSlug(name, productCode || undefined, globalRowIndex),
          product_code: productCode || null,
          price: mapping.price ? String(row[mapping.price] || '').trim() || null : null,
          description: mapping.description ? String(row[mapping.description] || '').trim() || null : null,
          composition: mapping.composition ? String(row[mapping.composition] || '').trim() || null : null,
          care_instructions: mapping.care_instructions ? String(row[mapping.care_instructions] || '').trim() || null : null,
          category: mapping.category ? String(row[mapping.category] || '').trim() || null : null,
          color: mapping.color ? String(row[mapping.color] || '').trim() || null : null,
          collection: collectionOverride.trim() || (mapping.collection ? String(row[mapping.collection] || '').trim() || null : null),
          source_url: mapping.source_url ? String(row[mapping.source_url] || '').trim() || null : null,
          images: images,
        };

        if (productCode) {
          withCode.push(product);
        } else {
          withoutCode.push(product);
        }
        globalRowIndex++;
      }

      // Handle products with product_code: check existing, update or insert
      if (withCode.length > 0) {
        const codes = withCode.map((p: any) => p.product_code).filter(Boolean);
        const { data: existing } = await supabase
          .from('products')
          .select('id, product_code')
          .in('product_code', codes);
        
        const existingMap = new Map((existing || []).map((e: any) => [e.product_code, e.id]));
        
        const toUpdate = withCode.filter((p: any) => existingMap.has(p.product_code));
        const toInsert = withCode.filter((p: any) => !existingMap.has(p.product_code));

        // Update existing products one by one
        for (const product of toUpdate) {
          const id = existingMap.get((product as any).product_code);
          const { slug, ...updateData } = product as any;
          const { error } = await supabase.from('products').update(updateData).eq('id', id);
          if (error) {
            importResults.failed++;
            importResults.errors.push(`Update "${(product as any).name}": ${error.message}`);
          } else {
            importResults.created++;
          }
        }

        // Insert new products
        if (toInsert.length > 0) {
          const { error } = await supabase.from('products').insert(toInsert as any);
          if (error) {
            importResults.failed += toInsert.length;
            importResults.errors.push(`Batch ${Math.floor(i / batchSize) + 1} (insert with code): ${error.message}`);
          } else {
            importResults.created += toInsert.length;
          }
        }
      }

      // Insert products without product_code (unique slug guarantees no collision)
      if (withoutCode.length > 0) {
        const { error } = await supabase.from('products').insert(withoutCode as any);
        if (error) {
          importResults.failed += withoutCode.length;
          importResults.errors.push(`Batch ${Math.floor(i / batchSize) + 1} (insert): ${error.message}`);
        } else {
          importResults.created += withoutCode.length;
        }
      }

      setProgress(Math.min(100, Math.round(((i + batchSize) / rows.length) * 100)));
    }

    setResults(importResults);
    setStep('done');

    if (importResults.created > 0) {
      onImportComplete?.();
    }
  };

  const updateMapping = (field: FieldKey, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === '_none_' ? '' : value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Products from Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="w-full border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Click to upload an Excel file</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files supported</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Found <strong>{rows.length}</strong> rows. Map your Excel columns to product fields:
            </p>

            <div className="max-h-[40vh] overflow-y-auto">
              <div className="space-y-3 pr-4">
                {PRODUCT_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <Label className="w-40 text-sm shrink-0">
                      {field.label}
                      {'required' in field && field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    <Select
                      value={mapping[field.key] || '_none_'}
                      onValueChange={(v) => updateMapping(field.key, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Skip this field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">— Skip —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <Label className="w-40 text-sm shrink-0">Collection Override</Label>
                  <Input
                    value={collectionOverride}
                    onChange={(e) => setCollectionOverride(e.target.value)}
                    placeholder="Set same collection for all products"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">Preview (first 3 rows):</p>
              <ScrollArea className="max-h-24">
                <div className="space-y-1 text-xs font-mono">
                  {rows.slice(0, 3).map((row, i) => (
                    <div key={i} className="truncate text-muted-foreground">
                      {mapping.name ? row[mapping.name] : '—'} | {mapping.product_code ? row[mapping.product_code] : '—'} | {mapping.price ? row[mapping.price] : '—'}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleImport} disabled={!mapping.name}>
                Import {rows.length} Products
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="py-8 space-y-4 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-foreground">Importing products...</p>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && results && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              {results.failed === 0 ? (
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-primary" />
              ) : (
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-destructive" />
              )}
              <p className="text-lg font-medium text-foreground">Import Complete</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{results.created}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-muted-foreground">{results.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{results.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <ScrollArea className="max-h-24 border border-border rounded-lg p-2">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err}</p>
                ))}
              </ScrollArea>
            )}

            <div className="flex justify-end">
              <Button onClick={() => { setOpen(false); reset(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
