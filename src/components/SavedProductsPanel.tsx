import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, ChevronDown, ChevronUp, X, Download, FileText, FileSpreadsheet, ExternalLink, Search, Eye, EyeOff, RefreshCw, Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SavedProduct } from '@/hooks/useSavedProducts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { exportAsJson, exportAsCsv, exportAsExcel, exportAsPdf, ExportProduct } from '@/utils/exportUtils';
import { filterImagesBySku, getFlatLayImage, parseImages, getMainProductImage } from '@/utils/imageUtils';
import { ProductQRCode } from './ProductQRCode';
import { ProductPreviewCard } from './ProductPreviewCard';
import { ExportProgressDialog } from './ExportProgressDialog';
import { Checkbox } from '@/components/ui/checkbox';

interface SavedProductsPanelProps {
  savedProducts: SavedProduct[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onDeleteDuplicates: () => Promise<number>;
  onToggleAvailability?: (id: string, isAvailable: boolean) => Promise<boolean>;
  onBulkToggleAvailability?: (ids: string[], isAvailable: boolean) => Promise<boolean>;
  onCheckAvailability?: () => Promise<{ markedUnavailable: number; markedAvailable: number; totalStoreSkus: number; totalDbProducts: number }>;
  onClassifyShoes?: () => Promise<{ classified: number; total: number; alreadyClassified: number; summary: Record<string, number> }>;
}

export const SavedProductsPanel = ({ savedProducts, loading = false, onDelete, onClearAll, onDeleteDuplicates, onToggleAvailability, onBulkToggleAvailability, onCheckAvailability, onClassifyShoes }: SavedProductsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState('');
  const [exportCurrent, setExportCurrent] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isClassifyingShoes, setIsClassifyingShoes] = useState(false);
  const { toast } = useToast();

  const filteredProducts = savedProducts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.color?.toLowerCase().includes(q) ||
      p.collection?.toLowerCase().includes(q)
    );
  });

  const allFilteredSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every(p => selectedIds.has(p.id));
  }, [filteredProducts, selectedIds]);

  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const products: ExportProduct[] = savedProducts.map(s => ({
    url: s.source_url || '', 
    product: {
      name: s.name,
      productCode: s.product_code || undefined,
      price: s.price || undefined,
      description: s.description || undefined,
      images: s.images,
    }
  }));

  const handleExportJson = () => {
    exportAsJson(products, `saved-products-${Date.now()}.json`);
    toast({ title: "Exported", description: "JSON file downloaded" });
  };

  const handleExportCsv = () => {
    exportAsCsv(products, `saved-products-${Date.now()}.csv`);
    toast({ title: "Exported", description: "CSV file downloaded" });
  };

  const handleExportExcel = () => {
    exportAsExcel(products, `saved-products-${Date.now()}.xlsx`);
    toast({ title: "Exported", description: "Excel file downloaded" });
  };

  const handleExportPdf = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportPhase('Preparing products...');

    // Use selected products if any, otherwise all
    const sourceProducts = someSelected
      ? savedProducts.filter(p => selectedIds.has(p.id))
      : savedProducts;

    setExportCurrent(0);
    setExportTotal(sourceProducts.length);

    // Sort products by SKU similarity
    const sorted = [...sourceProducts].sort((a, b) => {
      const codeA = (a.product_code || '').toLowerCase();
      const codeB = (b.product_code || '').toLowerCase();
      if (!codeA && !codeB) return 0;
      if (!codeA) return 1;
      if (!codeB) return -1;
      return codeA.localeCompare(codeB);
    });

    const pdfProducts = sorted.map(s => {
      const allImages = parseImages(s.images);
      const skuFiltered = filterImagesBySku(allImages, s.product_code);
      const bestImage = getFlatLayImage(skuFiltered, s.category) || skuFiltered[0];
      return {
        name: s.name,
        productCode: s.product_code || undefined,
        category: s.category || undefined,
        collection: s.collection || undefined,
        image: bestImage || undefined,
        shortCode: s.short_code || undefined,
      };
    });

    try {
      await exportAsPdf(pdfProducts, `product-demo-${Date.now()}.pdf`, undefined, (current, total, phase) => {
        setExportCurrent(current);
        setExportTotal(total);
        if (phase) setExportPhase(phase);
      });
      toast({ title: "Exported!", description: `PDF with ${pdfProducts.length} products downloaded` });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, savedProducts, selectedIds, someSelected, toast]);

  if (!loading && savedProducts.length === 0) return null;

  return (
    <>
    <ExportProgressDialog
      open={isExporting}
      phase={exportPhase}
      current={exportCurrent}
      total={exportTotal}
    />
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
          <Bookmark className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">Saved Products</span>
          {loading ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground animate-pulse">
              Loading…
            </span>
          ) : (
            <>
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {savedProducts.length}
              </span>
              {savedProducts.filter(p => !p.is_available).length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive">
                  {savedProducts.filter(p => !p.is_available).length} unavailable
                </span>
              )}
            </>
          )}
          <div className="flex-1" />
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, category, color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {onCheckAvailability && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCheckingAvailability}
                  onClick={async () => {
                    setIsCheckingAvailability(true);
                    try {
                      const result = await onCheckAvailability();
                      const changes = result.markedUnavailable + result.markedAvailable;
                      toast({
                        title: changes > 0 ? "Availability updated" : "All up to date",
                        description: changes > 0
                          ? `${result.markedUnavailable} marked unavailable, ${result.markedAvailable} restored to available (${result.totalStoreSkus} SKUs checked)`
                          : `All products match the store (${result.totalStoreSkus} SKUs checked)`,
                      });
                    } catch (err) {
                      toast({ title: "Check failed", description: String(err), variant: "destructive" });
                    } finally {
                      setIsCheckingAvailability(false);
                    }
                  }}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isCheckingAvailability ? 'animate-spin' : ''}`} />
                  {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
                </Button>
              )}
              {onClassifyShoes && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isClassifyingShoes}
                  onClick={async () => {
                    setIsClassifyingShoes(true);
                    try {
                      const result = await onClassifyShoes();
                      if (result.classified === 0 && result.alreadyClassified > 0) {
                        toast({
                          title: "All shoes classified",
                          description: `All ${result.total} shoes are already classified`,
                        });
                      } else {
                        const summaryStr = Object.entries(result.summary)
                          .map(([type, count]) => `${type}: ${count}`)
                          .join(', ');
                        toast({
                          title: "Classification complete",
                          description: `Classified ${result.classified} shoes (${summaryStr})`,
                        });
                      }
                    } catch (err) {
                      toast({ title: "Classification failed", description: String(err), variant: "destructive" });
                    } finally {
                      setIsClassifyingShoes(false);
                    }
                  }}
                >
                  <Footprints className={`w-4 h-4 mr-1 ${isClassifyingShoes ? 'animate-pulse' : ''}`} />
                  {isClassifyingShoes ? 'Classifying...' : 'Classify Shoes'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover">
                  <DropdownMenuItem onClick={handleExportJson}>
                    <FileText className="w-4 h-4 mr-2" />
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCsv}>
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} disabled={isExporting}>
                    <FileText className="w-4 h-4 mr-2" />
                    {isExporting ? 'Generating...' : someSelected ? `Export Demo (${selectedIds.size})` : 'Export Demo'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Remove Duplicates
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove duplicates?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all duplicate products. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      const count = await onDeleteDuplicates();
                      toast({ title: "Duplicates removed", description: `${count} duplicate(s) deleted` });
                    }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {onBulkToggleAvailability && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const unavailableIds = filteredProducts.filter(p => !p.is_available).map(p => p.id);
                      if (unavailableIds.length === 0) {
                        toast({ title: "All available", description: "All visible products are already marked as available" });
                        return;
                      }
                      const success = await onBulkToggleAvailability(unavailableIds, true);
                      if (success) toast({ title: "Updated", description: `${unavailableIds.length} products marked as available` });
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    All Available
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const availableIds = filteredProducts.filter(p => p.is_available).map(p => p.id);
                      if (availableIds.length === 0) {
                        toast({ title: "All unavailable", description: "All visible products are already marked as unavailable" });
                        return;
                      }
                      const success = await onBulkToggleAvailability(availableIds, false);
                      if (success) toast({ title: "Updated", description: `${availableIds.length} products marked as unavailable` });
                    }}
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    All Unavailable
                  </Button>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all products?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all {savedProducts.length} saved products. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Select all + selection info */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {someSelected ? `${selectedIds.size} selected` : 'Select all'}
              </span>
              {someSelected && (
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No products match "{searchQuery}"</p>
                ) : (
                filteredProducts.map(saved => (
                  <div 
                    key={saved.id} 
                    className={`flex items-center gap-2 p-3 rounded-lg border border-border overflow-hidden ${saved.is_available ? 'bg-secondary/30' : 'bg-destructive/5 opacity-60'} ${selectedIds.has(saved.id) ? 'ring-1 ring-primary' : ''}`}
                  >
                    <Checkbox
                      checked={selectedIds.has(saved.id)}
                      onCheckedChange={() => toggleSelect(saved.id)}
                      aria-label={`Select ${saved.name}`}
                      className="shrink-0"
                    />
                    <div className="w-10 h-10 rounded overflow-hidden bg-secondary/50 shrink-0">
                      {getMainProductImage(saved.images, saved.product_code, saved.category) ? (
                        <img
                          src={getMainProductImage(saved.images, saved.product_code, saved.category)!}
                          alt={saved.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Bookmark className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium text-foreground truncate">
                        {saved.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {saved.product_code} · {new Date(saved.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {saved.category && (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary truncate max-w-[200px]">
                            {saved.category}
                          </span>
                        )}
                        {saved.color && (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground capitalize">
                            {saved.color}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <ProductPreviewCard product={saved} />
                      {saved.short_code && (
                        <ProductQRCode shortCode={saved.short_code} productName={saved.name} />
                      )}
                      <Link to={`/product/${saved.slug}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                      {onToggleAvailability && (
                        <Switch
                          checked={saved.is_available}
                          onCheckedChange={(checked) => onToggleAvailability(saved.id, checked)}
                          title={saved.is_available ? 'Available — used in looks' : 'Unavailable — excluded from looks'}
                          className="scale-[0.65] shrink-0"
                        />
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove "{saved.name}" from your saved products.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(saved.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
    </>
  );
};
