import { useState, useRef, useCallback } from 'react';
import { ShoppingBag, Loader2, Sparkles, Search, Globe, Zap, Pause, Play, X, Save, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FirecrawlService, FashionProduct } from '@/utils/FirecrawlService';
import { FreeScraperService } from '@/utils/FreeScraperService';
import { firecrawlApi } from '@/lib/api/firecrawl';
import { useToast } from '@/hooks/use-toast';

export interface ScrapeResult {
  url: string;
  product?: FashionProduct;
  error?: string;
  status: 'pending' | 'loading' | 'success' | 'error';
}

interface ScrapeFormProps {
  onResults: (results: ScrapeResult[]) => void;
  isApiKeySet: boolean;
  usePremiumMode: boolean;
}

// Preset URL patterns for common e-commerce platforms
const URL_PATTERNS = {
  none: { label: 'No filter (all URLs)', pattern: null },
  html_only: { label: 'HTML pages only (.html)', pattern: /\.html$/i },
  shopify: { label: 'Shopify (/products/)', pattern: /\/products\/[^/]+$/ },
  woocommerce: { label: 'WooCommerce (/product/)', pattern: /\/product\/[^/]+\/?$/ },
  zara: { label: 'Zara style (-p\d+.html)', pattern: /-p\d+\.html$/i },
  hm: { label: 'H&M (/productpage.)', pattern: /\/productpage\.[^/]+$/ },
  asos: { label: 'ASOS (/prd/)', pattern: /\/prd\/\d+/ },
  generic_product: { label: 'Generic /product/', pattern: /\/products?\/[^/]+\/?$/ },
  maxmara: { label: 'MaxMara (/p/)', pattern: /\/p\/\d+/ },
  // La Perla: long hyphenated slugs at root level (4+ hyphen-separated words)
  laperla: { label: 'La Perla (long slugs)', pattern: /^\/[a-z0-9]+(?:-[a-z0-9]+){3,}\/?$/i },
  // Generic long slug pattern
  long_slug: { label: 'Long slug URLs (4+ parts)', pattern: /^\/[^/]+(?:-[^/]+){3,}\/?$/ },
  // Root-level single segment (any slug at root)
  root_slug: { label: 'Root-level slugs (/*)', pattern: /^\/[a-z0-9][a-z0-9-]*[a-z0-9]\/?$/i },
} as const;

type PatternKey = keyof typeof URL_PATTERNS;

// Field options for scraping
const SCRAPE_FIELDS = {
  price: { label: 'Price', default: true },
  images: { label: 'Images', default: true },
  description: { label: 'Description', default: true },
  care_instructions: { label: 'Care Instructions', default: true },
  composition: { label: 'Composition/Materials', default: true },
  color: { label: 'Categories/Color', default: true },
  collection: { label: 'Collection', default: true },
  product_code: { label: 'Product Code', default: true },
  wear_with: { label: 'Wear With / Styling', default: false },
  you_may_also_like: { label: 'Related Products', default: false },
} as const;

type ScrapeFieldKey = keyof typeof SCRAPE_FIELDS;

// Storage key for saved URLs
const SAVED_URLS_KEY = 'scrapeform_saved_urls';

export const ScrapeForm = ({ onResults, isApiKeySet, usePremiumMode }: ScrapeFormProps) => {
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [brandUrl, setBrandUrl] = useState('');
  const [urlPattern, setUrlPattern] = useState<PatternKey>('none');
  const [crawlCategories, setCrawlCategories] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showUrlList, setShowUrlList] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<ScrapeFieldKey, boolean>>(
    Object.fromEntries(
      Object.entries(SCRAPE_FIELDS).map(([key, val]) => [key, val.default])
    ) as Record<ScrapeFieldKey, boolean>
  );
  const pauseRef = useRef(false);
  const { toast } = useToast();

  const toggleField = (field: ScrapeFieldKey) => {
    setSelectedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const togglePause = useCallback(() => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(pauseRef.current);
  }, []);

  const waitWhilePaused = async () => {
    while (pauseRef.current) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  // URL management functions
  const urlList = urls.split(/[\n,]/).map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http'));

  const removeUrl = (urlToRemove: string) => {
    const newUrls = urlList.filter(u => u !== urlToRemove);
    setUrls(newUrls.join('\n'));
  };

  const clearAllUrls = () => {
    setUrls('');
    toast({ title: "Cleared", description: "All URLs removed" });
  };

  const saveUrlsToStorage = () => {
    if (urlList.length === 0) {
      toast({ title: "Nothing to save", description: "No URLs to save", variant: "destructive" });
      return;
    }
    localStorage.setItem(SAVED_URLS_KEY, JSON.stringify(urlList));
    toast({ title: "Saved", description: `${urlList.length} URLs saved locally` });
  };

  const loadUrlsFromStorage = () => {
    const saved = localStorage.getItem(SAVED_URLS_KEY);
    if (saved) {
      try {
        const savedUrls = JSON.parse(saved) as string[];
        setUrls(prev => {
          const existing = prev.trim();
          const newUrls = savedUrls.join('\n');
          return existing ? `${existing}\n${newUrls}` : newUrls;
        });
        toast({ title: "Loaded", description: `${savedUrls.length} saved URLs loaded` });
      } catch {
        toast({ title: "Error", description: "Failed to load saved URLs", variant: "destructive" });
      }
    } else {
      toast({ title: "No saved URLs", description: "No URLs found in storage" });
    }
  };

  const deleteSavedUrls = () => {
    localStorage.removeItem(SAVED_URLS_KEY);
    toast({ title: "Deleted", description: "Saved URLs removed from storage" });
  };

  // Filter product data based on selected fields
  const filterProductFields = (product: FashionProduct): FashionProduct => {
    const filtered: Partial<FashionProduct> = { name: product.name }; // Always keep name
    
    if (selectedFields.price && product.price) filtered.price = product.price;
    if (selectedFields.images && product.images) filtered.images = product.images;
    if (selectedFields.description && product.description) filtered.description = product.description;
    if (selectedFields.care_instructions && product.careInstructions) filtered.careInstructions = product.careInstructions;
    if (selectedFields.composition && product.composition) filtered.composition = product.composition;
    // Note: color field maps to categories in FashionProduct (no dedicated color field)
    if (selectedFields.color && product.categories) filtered.categories = product.categories;
    if (selectedFields.collection && product.collection) filtered.collection = product.collection;
    if (selectedFields.product_code && product.productCode) filtered.productCode = product.productCode;
    if (selectedFields.wear_with && product.wearWith) filtered.wearWith = product.wearWith;
    if (selectedFields.you_may_also_like && product.youMayAlsoLike) filtered.youMayAlsoLike = product.youMayAlsoLike;
    
    return filtered as FashionProduct;
  };

  const handleBrandSearch = async () => {
    if (!brandUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a brand URL",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Use premium (Edge Function) or free service based on mode
      let result: { success: boolean; urls?: string[]; error?: string };
      
      if (usePremiumMode) {
        // Use new Edge Function for deep product discovery
        const patternConfig = URL_PATTERNS[urlPattern];
        const patternStr = patternConfig.pattern ? patternConfig.pattern.source : undefined;
        
        result = await firecrawlApi.discoverProducts(brandUrl, {
          pattern: patternStr,
          deepCrawl: true,
          maxCategories: 30,
          limit: 5000,
        });
        
        console.log('Premium discovery result:', result);
      } else {
        result = await FreeScraperService.discoverUrls(brandUrl, { crawlCategories });
      }
      
      if (result.success && result.urls) {
        let filteredUrls = result.urls;
        
        // Only apply client-side pattern filter for free mode
        // Premium mode handles filtering server-side
        if (!usePremiumMode) {
          const selectedPattern = URL_PATTERNS[urlPattern];
          if (selectedPattern.pattern) {
            filteredUrls = result.urls.filter(url => {
              try {
                const urlObj = new URL(url);
                return selectedPattern.pattern!.test(urlObj.pathname + urlObj.search);
              } catch {
                return false;
              }
            });
            
            console.log('Pattern:', selectedPattern.label);
            console.log('Filtered from', result.urls.length, 'to', filteredUrls.length, 'URLs');
          }
        }
        
        if (filteredUrls.length === 0) {
          const baseMessage = urlPattern !== 'none'
            ? `No URLs matched the "${URL_PATTERNS[urlPattern].label}" pattern.` 
            : "No product URLs found on this site.";
          
          const suggestion = !usePremiumMode 
            ? " This site may be blocking free mode. Try enabling Premium Mode with Firecrawl for better results."
            : " Try a different filter or check if the URL is correct.";
          
          toast({
            title: "No matching products found",
            description: baseMessage + suggestion,
            variant: "destructive",
          });
        } else {
          setUrls(prev => {
            const existing = prev.trim();
            const newUrls = filteredUrls.join('\n');
            return existing ? `${existing}\n${newUrls}` : newUrls;
          });
          
          // Show stats if available (from premium mode)
          const stats = (result as { stats?: { mappedUrls: number; categoriesCrawled: number } }).stats;
          const description = stats
            ? `Found ${filteredUrls.length} product URLs (mapped ${stats.mappedUrls} pages, crawled ${stats.categoriesCrawled} categories)`
            : `Found ${filteredUrls.length} product URLs`;
          
          toast({
            title: "Products found!",
            description,
          });
        }
      } else {
        toast({
          title: "Search failed",
          description: result.error || "Failed to search brand",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Search failed",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
  };
  
  const urlCount = parseUrls(urls).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urlList = parseUrls(urls);
    
    if (urlList.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    
    const results: ScrapeResult[] = urlList.map(url => ({
      url,
      status: 'pending' as const
    }));
    
    onResults(results);

    // Get selected field names for reference (services extract all, can filter later)
    const fieldsToExtract = Object.entries(selectedFields)
      .filter(([_, enabled]) => enabled)
      .map(([field]) => field);
    console.log('[ScrapeForm] Fields to extract:', fieldsToExtract);

    for (let i = 0; i < urlList.length; i++) {
      // Wait if paused
      await waitWhilePaused();
      
      const url = urlList[i];
      setCurrentUrl(url);
      
      // Update status to loading
      results[i].status = 'loading';
      onResults([...results]);

      try {
        // Use premium or free service based on mode
        const result = usePremiumMode
          ? await FirecrawlService.scrapeFashionProduct(url)
          : await FreeScraperService.scrapeFashionProduct(url);

        if (result.success && result.data?.json) {
          // Apply field filtering
          const filteredProduct = filterProductFields(result.data.json);
          results[i] = {
            url,
            product: filteredProduct,
            status: 'success'
          };
        } else {
          results[i] = {
            url,
            error: result.error || 'Failed to extract product data',
            status: 'error'
          };
        }
      } catch (error) {
        results[i] = {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        };
      }

      setProgress(((i + 1) / urlList.length) * 100);
      onResults([...results]);
    }
    
    // Reset pause state
    pauseRef.current = false;
    setIsPaused(false);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    toast({
      title: "Scraping Complete",
      description: `${successCount} succeeded, ${errorCount} failed`,
    });

    setIsLoading(false);
    setCurrentUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Brand Search Section */}
      <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <Label className="text-sm font-medium text-foreground">
            Discover Product URLs
          </Label>
        </div>
        
        {/* Brand URL Input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Brand/Shop URL</Label>
          <Input
            type="url"
            value={brandUrl}
            onChange={(e) => setBrandUrl(e.target.value)}
            placeholder="https://brand.com or https://brand.com/shop"
            className="bg-background border-border"
            disabled={isSearching || (usePremiumMode && !isApiKeySet)}
          />
        </div>
        
        {/* URL Pattern Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            URL Pattern Filter <span className="text-primary">(optional)</span>
          </Label>
          <Select
            value={urlPattern}
            onValueChange={(value: PatternKey) => setUrlPattern(value)}
            disabled={isSearching || (usePremiumMode && !isApiKeySet)}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Select pattern..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(URL_PATTERNS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select a pattern to filter only product page URLs
          </p>
        </div>

        {/* Category crawling option - only for free mode */}
        {!usePremiumMode && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="crawlCategories"
              checked={crawlCategories}
              onCheckedChange={(checked) => setCrawlCategories(checked === true)}
              disabled={isSearching}
            />
            <Label htmlFor="crawlCategories" className="text-xs text-muted-foreground cursor-pointer">
              Deep crawl category pages (finds more products but slower)
            </Label>
          </div>
        )}
        
        <Button
          type="button"
          variant="secondary"
          onClick={handleBrandSearch}
          disabled={isSearching || !brandUrl.trim() || (usePremiumMode && !isApiKeySet)}
          className="w-full"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Find Products
            </>
          )}
        </Button>
      </div>

      {/* Product URLs Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="urls" className="text-sm font-medium text-foreground">
            Product URLs
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlList(!showUrlList)}
              className="h-6 px-2 text-xs"
            >
              {showUrlList ? 'Text View' : 'List View'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {urlCount} URL{urlCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {showUrlList && urlList.length > 0 ? (
          <ScrollArea className="h-[180px] rounded-md border border-border bg-background p-2">
            <div className="space-y-1">
              {urlList.map((url, idx) => (
                <div 
                  key={`${url}-${idx}`}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 group"
                >
                  <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                  <span className="text-xs font-mono flex-1 truncate">{url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUrl(url)}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    disabled={isLoading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Textarea
            id="urls"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="Paste product URLs (one per line or comma-separated)

https://store.com/product/jacket-12345
https://store.com/product/pants-67890
https://store.com/product/shoes-11111"
            className="min-h-[140px] text-sm bg-background border-border font-mono resize-y"
            disabled={isLoading || (usePremiumMode && !isApiKeySet)}
          />
        )}
        
        {/* URL Management Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveUrlsToStorage}
            disabled={urlCount === 0 || isLoading}
            className="h-7 text-xs"
          >
            <Save className="w-3 h-3 mr-1" />
            Save URLs
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadUrlsFromStorage}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            Load Saved
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={deleteSavedUrls}
            disabled={isLoading}
            className="h-7 text-xs text-muted-foreground"
          >
            Delete Saved
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllUrls}
            disabled={urlCount === 0 || isLoading}
            className="h-7 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Field Selection */}
      <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
        <Label className="text-sm font-medium text-foreground">
          Fields to Extract
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(SCRAPE_FIELDS).map(([key, { label }]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`field-${key}`}
                checked={selectedFields[key as ScrapeFieldKey]}
                onCheckedChange={() => toggleField(key as ScrapeFieldKey)}
                disabled={isLoading}
              />
              <Label 
                htmlFor={`field-${key}`} 
                className="text-xs text-muted-foreground cursor-pointer"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isPaused ? 'Paused' : 'Scraping'} {Math.round(progress)}% complete
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={togglePause}
                className="h-7 px-2"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <span className="text-foreground font-medium">
                {Math.round((progress / 100) * urlCount)} / {urlCount}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground truncate">
            {isPaused ? 'Paused at: ' : 'Current: '}{currentUrl}
          </p>
        </div>
      )}

      <div className={`p-4 rounded-lg ${usePremiumMode ? 'bg-primary/5 border border-primary/20' : 'bg-green-500/5 border border-green-500/20'}`}>
        <div className="flex items-start gap-3">
          {usePremiumMode ? (
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          ) : (
            <Zap className="w-5 h-5 text-green-500 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {usePremiumMode ? 'Premium AI Extraction' : 'Free Basic Extraction'}
            </p>
            <p className="text-xs text-muted-foreground">
              {usePremiumMode
                ? 'Each URL is processed with AI for accurate product code, images, price, description, and "wear with" items'
                : 'Basic HTML parsing via CORS proxy. Works for many sites but may be less accurate than premium mode.'}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || urlCount === 0 || (usePremiumMode && !isApiKeySet)}
        className="w-full h-12 text-base font-semibold glow-effect"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Extracting {urlCount} Products...
          </>
        ) : (
          <>
            <ShoppingBag className="w-5 h-5 mr-2" />
            Extract {urlCount > 0 ? `${urlCount} Product${urlCount !== 1 ? 's' : ''}` : 'Products'}
          </>
        )}
      </Button>

      {!isApiKeySet && usePremiumMode && (
        <p className="text-center text-sm text-muted-foreground">
          Please add your Firecrawl API key above to use premium mode
        </p>
      )}
    </form>
  );
};
