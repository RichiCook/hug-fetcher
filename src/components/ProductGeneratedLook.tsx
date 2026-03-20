import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { Sparkles, RefreshCw, Loader2, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import LookCardV2 from '@/components/product/LookCardV2';

interface LookConfig {
  modelReference?: string | null;
  environmentReference?: string | null;
  styleReferences?: string[];
  colorReferences?: string[];
  [key: string]: string | string[] | null | undefined;
}

interface GeneratedLook {
  product_codes: string[];
  hero_product_code?: string;
  name: string;
  description: string;
  color_palette: string[];
  reasoning: string;
  generated_at: string;
  look_image?: string;
  config?: LookConfig;
}

interface LookProduct {
  id: string;
  product_code: string;
  name: string;
  price: string | null;
  images: string[];
  slug: string;
  color: string | null;
  category: string | null;
  source_url: string | null;
}

interface LookWithProducts {
  look: GeneratedLook;
  products: LookProduct[];
  lookImage: string | null;
  generatingImage: boolean;
}

interface ProductGeneratedLookProps {
  productCode: string;
  cachedLook: GeneratedLook | GeneratedLook[] | null;
  onTrackEvent?: (eventType: 'scan' | 'page_view' | 'look_product_click' | 'look_regenerate' | 'lead_capture', productCode: string, options?: { targetProductCode?: string; lookProductCodes?: string[]; metadata?: Record<string, unknown> }) => void;
  onColorPaletteReady?: (colors: string[]) => void;
}

// Map common color names to hex
const colorNameToHex: Record<string, string> = {
  nero: '#1a1a1a', black: '#1a1a1a',
  bianco: '#f5f5f5', white: '#f5f5f5',
  grigio: '#9e9e9e', grey: '#9e9e9e', gray: '#9e9e9e',
  'grigio chiaro': '#c4c4c4', 'light grey': '#c4c4c4',
  'grigio scuro': '#5a5a5a', 'dark grey': '#5a5a5a',
  rosso: '#c0392b', red: '#c0392b',
  blu: '#2c3e99', blue: '#2c3e99', navy: '#1b2a4a',
  verde: '#27ae60', green: '#27ae60',
  giallo: '#f1c40f', yellow: '#f1c40f',
  arancione: '#e67e22', orange: '#e67e22',
  rosa: '#e08e9d', pink: '#e08e9d',
  viola: '#8e44ad', purple: '#8e44ad',
  marrone: '#6d4c41', brown: '#6d4c41',
  beige: '#d4c5a9', crema: '#f5f0e1', cream: '#f5f0e1',
  bordeaux: '#722f37', burgundy: '#722f37',
  celeste: '#87ceeb', azzurro: '#4a90d9',
  oro: '#c9a84c', gold: '#c9a84c',
  argento: '#b0b0b0', silver: '#b0b0b0',
  cammello: '#c19a6b', camel: '#c19a6b',
  tortora: '#a69279', taupe: '#a69279',
  panna: '#f5f0dc', ivory: '#f5f0dc', avorio: '#f5f0dc',
  corallo: '#e57373', coral: '#e57373',
  turchese: '#1abc9c', turquoise: '#1abc9c',
  kaki: '#8b7d5b', khaki: '#8b7d5b',
  oliva: '#6b8e23', olive: '#6b8e23',
};

const resolveColorToHex = (c: string): string | null => {
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
  const key = c.toLowerCase().trim();
  if (colorNameToHex[key]) return colorNameToHex[key];
  for (const [k, v] of Object.entries(colorNameToHex)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
};

const INITIAL_LOOKS = 3;

export const ProductGeneratedLook = ({ productCode, cachedLook, onTrackEvent, onColorPaletteReady }: ProductGeneratedLookProps) => {
  const { toast } = useToast();
  const [looks, setLooks] = useState<LookWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [panningEnabled, setPanningEnabled] = useState(false);
  const [animConfig, setAnimConfig] = useState<{ duration: number; zoom: number; intensity: number }>({ duration: 20, zoom: 1.06, intensity: 1 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const generatingRef = useRef(false);
  const usedProductCodesRef = useRef<Set<string>>(new Set());
  const [layoutVersion, setLayoutVersion] = useState<'v1' | 'v2' | 'v2.1'>('v2');

  // Fetch layout version preference
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'looks_layout_version')
      .single()
      .then(({ data }) => {
        const val = data?.value as any;
        if (val?.version === 'v1') setLayoutVersion('v1');
        else if (val?.version === 'v2.1') setLayoutVersion('v2.1');
        else setLayoutVersion('v2');
      });
  }, []);

  useEffect(() => {
    const fetchDisplaySettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'look_display_settings')
          .single();
        const val = data?.value as any;
        if (val) {
          if ('panning_enabled' in val) setPanningEnabled(val.panning_enabled);
          setAnimConfig({
            duration: val.animation_duration ?? 20,
            zoom: val.animation_zoom ?? 1.06,
            intensity: val.animation_intensity ?? 1,
          });
        }
      } catch { /* silently fail */ }
    };
    fetchDisplaySettings();
  }, []);

  // Parallax scroll effect
  useEffect(() => {
    const handleParallax = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      if (rect.top < viewH && rect.bottom > 0) {
        const progress = (viewH - rect.top) / (viewH + rect.height);
        setParallaxOffset((progress - 0.5) * 40); // -20px to +20px range
      }
    };
    window.addEventListener('scroll', handleParallax, { passive: true });
    return () => window.removeEventListener('scroll', handleParallax);
  }, []);

  const fetchLookProducts = async (productCodes: string[]): Promise<LookProduct[]> => {
    if (productCodes.length === 0) return [];
    const { data, error } = await supabase
      .from('products')
      .select('id, product_code, name, price, images, slug, color, category, source_url')
      .in('product_code', productCodes);
    if (error) return [];
    const seen = new Set<string>();
    return (data || []).filter(p => {
      if (!p.product_code || seen.has(p.product_code)) return false;
      seen.add(p.product_code);
      return true;
    }).map(p => ({
      id: p.id,
      product_code: p.product_code || '',
      name: p.name,
      price: p.price,
      slug: p.slug,
      images: normalizeImages(p.images),
      color: p.color,
      category: p.category,
      source_url: p.source_url,
    }));
  };

  // Upload a base64 image to storage and return the public URL
  const uploadImageToStorage = async (base64Data: string, lookIndex: number): Promise<string | null> => {
    try {
      // If it's already a URL (not base64), return as-is
      if (base64Data.startsWith('http')) return base64Data;
      
      // Convert base64 to blob
      const base64Content = base64Data.split(',')[1] || base64Data;
      const mimeMatch = base64Data.match(/data:([^;]+);/);
      const mime = mimeMatch?.[1] || 'image/png';
      const ext = mime.includes('webp') ? 'webp' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
      
      const byteChars = atob(base64Content);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mime });
      
      const filePath = `${productCode}/look-${lookIndex}-${Date.now()}.${ext}`;
      
      const { error } = await supabase.storage
        .from('look-images')
        .upload(filePath, blob, { upsert: true, contentType: mime });
      
      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }
      
      const { data: urlData } = supabase.storage.from('look-images').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    }
  };

  // Cache all looks (with images) to the product's generated_look field
  const cacheLooks = async (allLooks: LookWithProducts[]) => {
    try {
      const looksToCache = allLooks
        .filter(l => l.lookImage || l.look.look_image)
        .map(l => ({ ...l.look, look_image: l.lookImage || l.look.look_image }));
      if (looksToCache.length === 0) return;
      // Store as array in generated_look
      await supabase.from('products').update({ 
        generated_look: (looksToCache.length === 1 ? looksToCache[0] : looksToCache) as any 
      }).eq('product_code', productCode);
    } catch { /* silent */ }
  };

  const generateLookImage = async (products: LookProduct[], lookData: GeneratedLook, lookIndex: number, retryCount = 0) => {
    if (products.length === 0) return;
    setLooks(prev => prev.map((l, i) => i === lookIndex ? { ...l, generatingImage: true } : l));
    try {
      const { data, error } = await supabase.functions.invoke('generate-look-image', {
        body: {
          products: products.map(p => ({
            name: p.name, color: p.color, category: p.category,
            image: getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0]
          })),
          lookName: lookData.name,
          lookDescription: lookData.description,
          lookStyle: lookData.config ? undefined : 'elegant',
          config: lookData.config
        }
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit') && retryCount < 1) {
          setTimeout(() => generateLookImage(products, lookData, lookIndex, retryCount + 1), 3000);
          return;
        }
        return;
      }
      if (data?.image) {
        // Upload base64 to storage for persistent caching
        const storageUrl = await uploadImageToStorage(data.image, lookIndex);
        const finalImage = storageUrl || data.image;
        
        setLooks(prev => {
          const updated = prev.map((l, i) => i === lookIndex ? { ...l, lookImage: finalImage, generatingImage: false } : l);
          cacheLooks(updated);
          return updated;
        });
      }
    } catch (err) {
      if (retryCount < 1) {
        setTimeout(() => generateLookImage(products, lookData, lookIndex, retryCount + 1), 2000);
        return;
      }
    } finally {
      setLooks(prev => prev.map((l, i) => i === lookIndex ? { ...l, generatingImage: false } : l));
    }
  };

  const generateSingleLook = async (forceRegenerate = true): Promise<LookWithProducts | null> => {
    try {
      const excludeCodes = Array.from(usedProductCodesRef.current);
      const { data, error } = await supabase.functions.invoke('generate-look-for-product', {
        body: { 
          product_code: productCode, 
          force_regenerate: forceRegenerate,
          exclude_product_codes: excludeCodes
        }
      });
      if (error || data?.error || !data?.look) return null;
      const products = await fetchLookProducts(data.look.product_codes || []);
      if (products.length === 0) return null;
      // Track newly used product codes (exclude hero product so it can repeat)
      for (const code of data.look.product_codes || []) {
        if (code !== productCode) {
          usedProductCodesRef.current.add(code);
        }
      }
      return { look: data.look, products, lookImage: null, generatingImage: false };
    } catch {
      return null;
    }
  };

  const loadInitialLooks = async () => {
    setLoading(true);
    usedProductCodesRef.current.clear();
    const results: LookWithProducts[] = [];

    // Restore cached looks (supports single object or array)
    const cachedLooks: GeneratedLook[] = cachedLook
      ? Array.isArray(cachedLook) ? cachedLook : [cachedLook]
      : [];

    for (const cl of cachedLooks) {
      const products = await fetchLookProducts(cl.product_codes || []);
      if (products.length > 0) {
        results.push({ look: cl, products, lookImage: cl.look_image || null, generatingImage: false });
        for (const code of cl.product_codes || []) {
          if (code !== productCode) usedProductCodesRef.current.add(code);
        }
      }
    }

    if (results.length === 0) {
      // Generate first look (not forced, uses cache)
      try {
        const { data, error } = await supabase.functions.invoke('generate-look-for-product', {
          body: { product_code: productCode, force_regenerate: false }
        });
        if (!error && data?.look) {
          const products = await fetchLookProducts(data.look.product_codes || []);
          if (products.length > 0) {
            results.push({ look: data.look, products, lookImage: data.look.look_image || null, generatingImage: false });
            for (const code of data.look.product_codes || []) {
              if (code !== productCode) usedProductCodesRef.current.add(code);
            }
          }
        }
      } catch { /* continue */ }
    }

    // Generate remaining looks in parallel for speed
    const remaining = INITIAL_LOOKS - results.length;
    if (remaining > 0) {
      const promises = Array.from({ length: remaining }, () => generateSingleLook(true));
      const settled = await Promise.allSettled(promises);
      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value) results.push(s.value);
      }
    }

    setLooks(results);
    setLoading(false);

    // Generate images for all looks
    results.forEach((r, idx) => {
      if (!r.lookImage && r.products.length > 0) {
        // Stagger image generation to avoid rate limits
        setTimeout(() => generateLookImage(r.products, r.look, idx), idx * 500);
      }
    });
  };

  const loadMoreLooks = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setLoadingMore(true);
    
    try {
      const newLook = await generateSingleLook(true);
      if (newLook) {
        setLooks(prev => {
          const newLooks = [...prev, newLook];
          const newIdx = newLooks.length - 1;
          generateLookImage(newLook.products, newLook.look, newIdx);
          return newLooks;
        });
      }
    } catch (err) {
      console.error('Error loading more looks:', err);
    } finally {
      setLoadingMore(false);
      generatingRef.current = false;
    }
  }, [productCode]);

  // Emit first look's palette
  const firstPalette = useMemo(() => {
    if (looks.length === 0 || !looks[0].look.color_palette) return [];
    return looks[0].look.color_palette.map(resolveColorToHex).filter(Boolean) as string[];
  }, [looks]);

  useEffect(() => {
    if (firstPalette.length > 0) onColorPaletteReady?.(firstPalette);
  }, [firstPalette]);

  useEffect(() => {
    loadInitialLooks();
  }, [productCode]);

  // Handle scroll to detect reaching end for infinite loading
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentLookIndex(idx);
    // Load more when reaching last 2 looks
    if (idx >= looks.length - 2 && !generatingRef.current) {
      loadMoreLooks();
    }
  }, [looks.length, loadMoreLooks]);

  const scrollToLook = (direction: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const newIdx = direction === 'next' ? currentLookIndex + 1 : currentLookIndex - 1;
    if (newIdx < 0 || newIdx >= looks.length) return;
    el.scrollTo({ left: newIdx * el.clientWidth, behavior: 'smooth' });
  };

  // Calculate total price for a look
  const calculateTotal = (lookProducts: LookProduct[]): string | null => {
    const prices = lookProducts
      .map(p => p.price).filter(Boolean)
      .map(p => {
        const cleaned = p!.replace(/[^\d.,]/g, '');
        if (cleaned.includes(',') && !cleaned.includes('.')) return parseFloat(cleaned.replace(',', '.'));
        if (cleaned.includes('.') && cleaned.includes(',')) return parseFloat(cleaned.replace(',', ''));
        return parseFloat(cleaned) || 0;
      });
    if (prices.length === 0) return null;
    const total = prices.reduce((sum, p) => sum + p, 0);
    const currencyMatch = lookProducts[0]?.price?.match(/[€$£¥]/);
    const currency = currencyMatch ? currencyMatch[0] : '€';
    return `${currency}${total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // V2 / V2.1 layout
  if (layoutVersion === 'v2' || layoutVersion === 'v2.1') {
    return (
      <LookCardV2
        looks={looks}
        productCode={productCode}
        loading={loading}
        loadingMore={loadingMore}
        onTrackEvent={onTrackEvent}
        onScroll={(idx) => {
          setCurrentLookIndex(idx);
          if (idx >= looks.length - 2 && !generatingRef.current) {
            loadMoreLooks();
          }
        }}
        calculateTotal={calculateTotal}
        variant={layoutVersion === 'v2.1' ? 'editorial' : 'refined'}
      />
    );
  }

  // V1 layout below
  if (loading) {
    return (
      <section className="container max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12 border-t border-border">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-light text-foreground">AI-Curated Looks</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Curating perfect looks...</span>
          </div>
        </div>
      </section>
    );
  }

  if (looks.length === 0) return null;

  const currentResolvedPalette = looks[currentLookIndex]?.look.color_palette?.map(resolveColorToHex).filter(Boolean) as string[] || [];

  return (
    <section
      ref={sectionRef}
      className="container max-w-6xl mx-auto px-0 sm:px-4 py-8 sm:py-12 border-t border-border transition-colors duration-700"
      style={currentResolvedPalette.length >= 2
        ? { background: `linear-gradient(135deg, ${currentResolvedPalette[0]}08 0%, ${currentResolvedPalette[1]}10 50%, ${currentResolvedPalette[currentResolvedPalette.length - 1]}08 100%)`, borderColor: `${currentResolvedPalette[0]}25` }
        : undefined
      }
    >
      <div className="px-3 sm:px-0 flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-light text-foreground">AI-Curated Looks</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{currentLookIndex + 1} / {looks.length}</span>
          {/* Desktop nav arrows */}
          <div className="hidden sm:flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollToLook('prev')} disabled={currentLookIndex === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollToLook('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Swipeable look groups container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
      >
        {looks.map((lookItem, lookIdx) => {
          const look = lookItem.look;
          const lookProducts = lookItem.products;
          const resolvedPalette = look.color_palette?.map(resolveColorToHex).filter(Boolean) as string[] || [];
          const totalPrice = calculateTotal(lookProducts);

          return (
            <div key={lookIdx} className="w-full shrink-0 snap-center px-3 sm:px-0">
              {/* Look info */}
              {look.name && <p className="text-sm text-primary font-medium mb-1">{look.name}</p>}
              {look.description && <p className="text-sm text-muted-foreground mb-2">{look.description}</p>}

              {/* Color palette swatches */}
              {resolvedPalette.length > 0 && (
                <div className="flex items-center gap-1.5 mb-4">
                  {resolvedPalette.map((color, idx) => (
                    <div key={idx} className="w-4 h-4 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color }} title={look.color_palette?.[idx] || color} />
                  ))}
                </div>
              )}

              {/* PRODUCT RECOMMENDATIONS (moved above outfit image) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6 mb-6">
                {lookProducts.map((product) => {
                  const isHeroProduct = product.product_code === productCode || product.product_code === look.hero_product_code;
                  const productOnlyImage = getFlatLayImage(filterImagesBySku(product.images, product.product_code), product.category) || product.images[0];
                  const productLink = product.source_url || `/product/${product.slug}`;
                  const isExternal = !!product.source_url;

                  const content = (
                    <>
                      <div className={`aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2 sm:mb-3 ${isHeroProduct ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                        {productOnlyImage && (
                          <img src={productOnlyImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm text-foreground truncate flex-1">{product.name}</p>
                        {isHeroProduct && <span className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded">Featured</span>}
                      </div>
                      {product.price && <p className="text-xs sm:text-sm text-muted-foreground">{product.price}</p>}
                    </>
                  );

                  return isExternal ? (
                    <a key={product.id} href={productLink} target="_blank" rel="noopener noreferrer" className="group"
                      onClick={() => onTrackEvent?.('look_product_click', productCode, { targetProductCode: product.product_code, lookProductCodes: look.product_codes })}>
                      {content}
                    </a>
                  ) : (
                    <Link key={product.id} to={productLink} className="group"
                      onClick={() => onTrackEvent?.('look_product_click', productCode, { targetProductCode: product.product_code, lookProductCodes: look.product_codes })}>
                      {content}
                    </Link>
                  );
                })}
              </div>

              {totalPrice && (
                <div className="mb-6 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Complete this look for <span className="text-foreground font-medium">{totalPrice}</span>
                  </p>
                </div>
              )}

              {/* TOTAL OUTFIT IMAGE (moved below product recommendations) */}
              <div className="mb-4">
                {lookItem.generatingImage ? (
                  <div className="aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden bg-secondary flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generating model image...</p>
                  </div>
                ) : lookItem.lookImage ? (
                  <div
                    className="aspect-[3/4] max-w-md mx-auto rounded-xl overflow-hidden bg-secondary shadow-lg"
                    style={{
                      '--kb-duration': `${animConfig.duration}s`,
                      '--kb-zoom': animConfig.zoom,
                      '--kb-intensity': animConfig.intensity,
                      perspective: '800px',
                    } as React.CSSProperties}
                  >
                    <img
                      src={lookItem.lookImage}
                      alt={`Model wearing ${look.name || 'the complete look'}`}
                      className={`w-full h-full object-cover ${panningEnabled ? 'animate-ken-burns' : ''} will-change-transform`}
                      style={{
                        transform: `translateY(${parallaxOffset * 1.2}px) scale(${1.05 + Math.abs(parallaxOffset) * 0.001}) rotateX(${parallaxOffset * -0.05}deg)`,
                        transition: 'transform 0.15s ease-out',
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] max-w-md mx-auto rounded-lg overflow-hidden bg-secondary flex flex-col items-center justify-center gap-3">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <Button variant="outline" size="sm" onClick={() => generateLookImage(lookProducts, look, lookIdx)} disabled={lookItem.generatingImage || lookProducts.length === 0}>
                      Generate Model Image
                    </Button>
                  </div>
                )}
              </div>

              {look.reasoning && (
                <p className="text-xs text-muted-foreground italic mb-4">{look.reasoning}</p>
              )}
            </div>
          );
        })}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="w-full shrink-0 snap-center flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating more looks...</span>
            </div>
          </div>
        )}
      </div>

      {/* Dot indicators for looks */}
      {looks.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-4 px-3">
          {looks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
              }}
              className={`w-2 h-2 rounded-full transition-colors ${idx === currentLookIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              aria-label={`Go to look ${idx + 1}`}
            />
          ))}
          {loadingMore && <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />}
        </div>
      )}

      {/* Swipe hint on mobile */}
      {looks.length > 1 && currentLookIndex === 0 && (
        <p className="text-center text-xs text-muted-foreground mt-2 sm:hidden animate-pulse">
          Swipe for more looks →
        </p>
      )}
    </section>
  );
};

