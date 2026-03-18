import { useState } from 'react';
import { Copy, Check, ExternalLink, Tag, FileText, Image, Package, ChevronDown, ChevronUp, AlertCircle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { FashionProduct } from '@/utils/FirecrawlService';
import { ScrapeResult } from '@/components/ScrapeForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportAsJson, exportAsCsv, exportAsExcel, copyProductsJson } from '@/utils/exportUtils';
import { getMainProductImage } from '@/utils/imageUtils';
interface ProductCardProps {
  result: ScrapeResult;
  index: number;
}

const ProductCard = ({ result, index }: ProductCardProps) => {
  const [isOpen, setIsOpen] = useState(result.status === 'success');
  const [selectedImage, setSelectedImage] = useState(0);
  const product = result.product;

  if (result.status === 'pending') {
    return (
      <div className="p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {index + 1}
          </div>
          <p className="text-sm text-muted-foreground font-mono truncate flex-1">{result.url}</p>
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
      </div>
    );
  }

  if (result.status === 'loading') {
    return (
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-sm text-foreground font-mono truncate flex-1">{result.url}</p>
          <span className="text-xs text-primary">Extracting...</span>
        </div>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-mono truncate">{result.url}</p>
            <p className="text-xs text-destructive mt-1">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl card-gradient border border-border overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary/50 shrink-0">
            {(() => { const img = getMainProductImage(product.images, product.productCode, product.categories?.[product.categories.length - 1]); return img; })() ? (
              <img
                src={getMainProductImage(product.images, product.productCode, product.categories?.[product.categories.length - 1])!}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/48x48?text=Err';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-foreground truncate">{product.name || 'Unknown Product'}</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-primary font-semibold">{product.price}</span>
              <span className="text-muted-foreground font-mono text-xs">{product.productCode}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product.collection && (
              <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent-foreground border border-accent/30 font-medium">
                {product.collection}
              </span>
            )}
            {product.wearWith && product.wearWith.filter(item => item.name || item.url).length > 0 && (
              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                {product.wearWith.filter(item => item.name || item.url).length} wear with
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Images */}
              <div className="space-y-3">
                {product.images && product.images.length > 0 && (
                  <>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary/50 border border-border">
                      <img
                        src={product.images[selectedImage]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x533?text=Error';
                        }}
                      />
                    </div>
                    {product.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {product.images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`shrink-0 w-12 h-16 rounded overflow-hidden border-2 transition-all ${
                              selectedImage === idx ? 'border-primary' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={img}
                              alt={`${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/48x64?text=Err';
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View Original <ExternalLink className="w-3 h-3" />
                </a>

                {product.collection && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <Tag className="w-4 h-4 text-accent-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Collection</p>
                      <p className="font-semibold text-foreground">{product.collection}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                  <Tag className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Product Code</p>
                    <p className="font-mono font-semibold text-foreground">{product.productCode || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <ScrollArea className="h-24 rounded bg-secondary/30 border border-border p-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {product.description || 'No description'}
                    </p>
                  </ScrollArea>
                </div>

                {product.composition && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Composition</p>
                    <p className="text-sm text-foreground">{product.composition}</p>
                  </div>
                )}

                {product.careInstructions && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Care Instructions</p>
                    <p className="text-sm text-foreground">{product.careInstructions}</p>
                  </div>
                )}

                {product.categories && product.categories.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {product.categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wear With */}
            {product.wearWith && product.wearWith.filter(item => item.name || item.url).length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-foreground">Wear With ({product.wearWith.filter(item => item.name || item.url).length})</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {product.wearWith.filter(item => item.name || item.url).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg bg-secondary/30 border border-border hover:border-primary/50 overflow-hidden"
                    >
                      <div className="aspect-square bg-secondary/50 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Img';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs font-bold text-primary">{item.price}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* You May Also Like */}
            {product.youMayAlsoLike && product.youMayAlsoLike.filter(item => item.name || item.url).length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium text-muted-foreground">You May Also Like ({product.youMayAlsoLike.filter(item => item.name || item.url).length})</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {product.youMayAlsoLike.filter(item => item.name || item.url).map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg bg-muted/30 border border-border hover:border-muted-foreground/50 overflow-hidden"
                    >
                      <div className="aspect-square bg-muted/50 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Img';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs font-bold text-muted-foreground">{item.price}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface BulkResultsDisplayProps {
  results: ScrapeResult[];
}

export const BulkResultsDisplay = ({ results }: BulkResultsDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const successResults = results.filter(r => r.status === 'success');
  const errorResults = results.filter(r => r.status === 'error');

  const products = successResults.map(r => ({ url: r.url, product: r.product }));

  const handleExportJson = () => {
    exportAsJson(products);
    toast({ title: "Exported", description: "JSON file downloaded" });
  };

  const handleExportCsv = () => {
    exportAsCsv(products);
    toast({ title: "Exported", description: "CSV file downloaded" });
  };

  const handleExportExcel = () => {
    exportAsExcel(products);
    toast({ title: "Exported", description: "Excel file downloaded" });
  };

  const handleCopyJson = async () => {
    await copyProductsJson(products);
    setCopied(true);
    toast({ title: "Copied!", description: "All product data copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Summary & Actions */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
        <div className="flex-1 flex items-center gap-4">
          <div className="text-sm">
            <span className="text-green-400 font-medium">{successResults.length}</span>
            <span className="text-muted-foreground"> succeeded</span>
          </div>
          {errorResults.length > 0 && (
            <div className="text-sm">
              <span className="text-destructive font-medium">{errorResults.length}</span>
              <span className="text-muted-foreground"> failed</span>
            </div>
          )}
        </div>
        {successResults.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyJson}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-2">Copy</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <ProductCard key={result.url + index} result={result} index={index} />
        ))}
      </div>
    </div>
  );
};
