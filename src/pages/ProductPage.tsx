import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useProducts, Product } from '@/hooks/useProducts';
import { useProductActivations, useActivations, ImageCarouselContent, Activation } from '@/hooks/useActivations';
import { ActivationRenderer } from '@/components/activations/ActivationRenderer';
import { ProductGeneratedLook } from '@/components/ProductGeneratedLook';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft, Settings, Tag } from 'lucide-react';
import ShareToResaleModal from '@/components/ShareToResaleModal';
import { filterImagesBySku } from '@/utils/imageUtils';
import defaultLogo from '@/assets/logo.png';
import { useScanTracking } from '@/hooks/useScanTracking';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import GenuineProductBanner from '@/components/product/GenuineProductBanner';
import ProductInfoBlock from '@/components/product/ProductInfoBlock';
import DigitalPassportPopup from '@/components/product/DigitalPassportPopup';
import CelebritySpotlight from '@/components/product/CelebritySpotlight';
import SimilarProducts from '@/components/product/SimilarProducts';
import CategoryProductCarousel from '@/components/product/CategoryProductCarousel';

const ProductViewer3D = lazy(() => import('@/components/product/ProductViewer3D'));

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getProductBySlug } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [lookPalette, setLookPalette] = useState<string[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [resaleSharingEnabled, setResaleSharingEnabled] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const { trackEvent } = useScanTracking();
  const { settings } = usePlatformSettingsContext();
  const logo = settings.logo_url || defaultLogo;
  const brandName = settings.brand_name || 'Champion';

  const { productActivations } = useProductActivations(product?.id || '');
  const { activations } = useActivations();

  // Get product category segments for matching
  const productCategorySegments = product?.category
    ? product.category.split(' > ').map(s => s.trim()).filter(s => s)
    : [];

  // Get product collection for matching
  const productCollection = (product as any)?.collection || null;

  // Parse product price for matching
  const productPrice = (() => {
    const priceStr = product?.price || '';
    const priceNum = parseFloat(priceStr.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(priceNum) ? null : priceNum;
  })();

  // Filter activations with category, collection, price range, and timing logic
  const autoMatchedByTargeting = activations.filter(activation => {
    const hasCategories = activation.categories && activation.categories.length > 0;
    const hasCollections = activation.collections && activation.collections.length > 0;
    const hasPriceRange = activation.price_min !== null || activation.price_max !== null;
    
    // Check timing constraints
    const now = new Date();
    if (activation.start_date && new Date(activation.start_date) > now) {
      return false; // Not started yet
    }
    if (activation.end_date && new Date(activation.end_date) < now) {
      return false; // Already ended
    }
    
    // If nothing selected → show on ALL products
    if (!hasCategories && !hasCollections && !hasPriceRange) {
      return true;
    }
    
    // Check category match (if categories selected)
    const categoryMatch = !hasCategories || 
      activation.categories!.some(cat => productCategorySegments.includes(cat));
    
    // Check collection match (if collections selected)
    const collectionMatch = !hasCollections ||
      (productCollection && activation.collections!.includes(productCollection));
    
    // Check price match (if price range selected)
    let priceMatch = true;
    if (hasPriceRange && productPrice !== null) {
      const minOk = activation.price_min === null || productPrice >= activation.price_min;
      const maxOk = activation.price_max === null || productPrice <= activation.price_max;
      priceMatch = minOk && maxOk;
    }
    
    // All selected criteria must match
    const criteria = [];
    if (hasCategories) criteria.push(categoryMatch);
    if (hasCollections) criteria.push(collectionMatch);
    if (hasPriceRange) criteria.push(priceMatch);
    
    return criteria.every(c => c);
  });

  // Combine manually added activations with auto-matched ones (avoid duplicates)
  const manualActivationIds = new Set(productActivations.map(pa => pa.activation_id));
  const autoMatchedActivations = autoMatchedByTargeting.filter(a => !manualActivationIds.has(a.id));

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'resale_sharing_enabled')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as { enabled?: boolean };
          setResaleSharingEnabled(val.enabled ?? false);
        }
      });
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) return;
      setLoading(true);
      const p = await getProductBySlug(slug);
      setProduct(p);
      setLoading(false);
      // Track page view with source attribution
      if (p?.product_code) {
        const ref = searchParams.get('ref');
        const source = ref === 'qr' ? 'qr_scan' : 'direct';
        trackEvent('page_view', p.product_code, {
          metadata: { collection: (p as any).collection, category: p.category, source },
        });
        // Clean up ref param
        if (ref) {
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
        }
      }
    };
    loadProduct();
  }, [slug]);

  // Map common color names (IT/EN) to hex
  const colorNameToHex = (name: string): string | null => {
    const map: Record<string, string> = {
      nero: '#1a1a1a', black: '#1a1a1a',
      bianco: '#f5f5f5', white: '#f5f5f5',
      grigio: '#9e9e9e', grey: '#9e9e9e', gray: '#9e9e9e',
      'grigio chiaro': '#c4c4c4', 'light grey': '#c4c4c4', 'light gray': '#c4c4c4',
      'grigio scuro': '#5a5a5a', 'dark grey': '#5a5a5a', 'dark gray': '#5a5a5a',
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
      celeste: '#87ceeb', 'light blue': '#87ceeb', azzurro: '#4a90d9',
      oro: '#c9a84c', gold: '#c9a84c',
      argento: '#b0b0b0', silver: '#b0b0b0',
      cammello: '#c19a6b', camel: '#c19a6b',
      tortora: '#a69279', taupe: '#a69279',
      panna: '#f5f0dc', ivory: '#f5f0dc', avorio: '#f5f0dc',
      corallo: '#e57373', coral: '#e57373',
      turchese: '#1abc9c', turquoise: '#1abc9c',
      lilla: '#c39bd3', lilac: '#c39bd3', lavanda: '#b39ddb', lavender: '#b39ddb',
      kaki: '#8b7d5b', khaki: '#8b7d5b',
      oliva: '#6b8e23', olive: '#6b8e23',
    };
    const key = name.toLowerCase().trim();
    if (map[key]) return map[key];
    // Try partial match
    for (const [k, v] of Object.entries(map)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  };

  // Resolve a palette entry to hex (already hex or color name)
  const resolveColor = (c: string): string | null => {
    if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
    return colorNameToHex(c);
  };

  // Build resolved hex palette
  const resolvedPalette = useMemo(() => {
    return lookPalette.map(resolveColor).filter(Boolean) as string[];
  }, [lookPalette]);

  // Convert hex to HSL values for CSS variables
  const hexToHSL = (hex: string): { h: number; s: number; l: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  // Build dynamic CSS variables from look palette
  const paletteStyle = useMemo(() => {
    if (resolvedPalette.length === 0) return undefined;
    const primary = hexToHSL(resolvedPalette[0]);
    const accent = resolvedPalette.length > 1 ? hexToHSL(resolvedPalette[1]) : primary;
    const tertiary = resolvedPalette.length > 2 ? hexToHSL(resolvedPalette[2]) : accent;
    if (!primary) return undefined;
    return {
      '--look-primary': `${primary.h} ${primary.s}% ${primary.l}%`,
      '--look-accent': accent ? `${accent.h} ${accent.s}% ${accent.l}%` : undefined,
      '--look-tertiary': tertiary ? `${tertiary.h} ${tertiary.s}% ${tertiary.l}%` : undefined,
    } as React.CSSProperties;
  }, [resolvedPalette]);

  // Gather all activations and split by placement
  const allActivationsList = useMemo(() => {
    const manual = productActivations.map(pa => pa.activation).filter(Boolean) as Activation[];
    return [...manual, ...autoMatchedActivations];
  }, [productActivations, autoMatchedActivations]);

  const getPlacementActivations = (placement: string) =>
    allActivationsList.filter(a => {
      if (a.type === 'image_carousel') {
        const p = (a.content as ImageCarouselContent).placement || 'default';
        return p === placement;
      }
      return placement === 'default';
    });

  const renderPlacedActivations = (placement: string) => {
    const acts = getPlacementActivations(placement);
    if (acts.length === 0) return null;
    return (
      <div className="space-y-6">
        {acts.map(a => (
          <div key={a.id} className={a.full_width ? '' : 'max-w-6xl mx-auto px-4'}>
            <ActivationRenderer activation={a} productId={product?.id} />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-light text-foreground mb-4">Product not found</h1>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  // Filter images: remove thumbnails/swatches, clean URLs, then auto-filter by SKU
  const images = filterImagesBySku(
    (product.images || [])
      .filter((img: string) => !img.includes('thumbnail') && !img.includes('swatch'))
      .map((img: string) => img.split('#')[0]),
    product.product_code
  );

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen bg-background transition-colors duration-700" style={paletteStyle}>
      {/* Header — compact on mobile */}
      <header className="border-b border-border sticky top-0 z-50 transition-colors duration-700" style={resolvedPalette.length > 0 ? { backgroundColor: resolvedPalette[0] + '10', borderColor: resolvedPalette[0] + '25', backdropFilter: 'blur(12px)' } : { backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <Link to="/">
            <img src={logo} alt={brandName} className="h-5 sm:h-7" />
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to={`/product/${slug}/edit`}>
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">Edit Activations</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section — edge-to-edge image on mobile */}
      <section className="sm:container sm:max-w-6xl sm:mx-auto sm:px-4 sm:py-10">
        <div className="grid md:grid-cols-2 gap-0 sm:gap-10">
          {/* Image Gallery — swipeable on mobile, full-bleed */}
          <div className="relative">
            {images.length > 0 ? (
              <>
                {/* Mobile: horizontal scroll-snap gallery */}
                <div className="sm:hidden">
                  <div
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      if (idx !== currentImage) setCurrentImage(idx);
                    }}
                    ref={(el) => {
                      // Sync scroll position when currentImage changes from dots
                      if (el && el.children[currentImage]) {
                        const target = el.children[currentImage] as HTMLElement;
                        if (Math.abs(el.scrollLeft - target.offsetLeft) > 10) {
                          el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
                        }
                      }
                    }}
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="w-full shrink-0 snap-center aspect-[3/4] bg-secondary">
                        {!imageError[idx] ? (
                          <img
                            src={img}
                            alt={`${product.name} ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(prev => ({ ...prev, [idx]: true }))}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                            Image unavailable
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Mobile dot indicators */}
                  {images.length > 1 && (
                    <div className="flex justify-center gap-1.5 py-3">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImage(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImage ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                          aria-label={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop: existing button-based navigation */}
                <div className="hidden sm:block">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
                    {!imageError[currentImage] ? (
                      <img
                        src={images[currentImage]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(prev => ({ ...prev, [currentImage]: true }))}
                        loading="eager"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Image unavailable
                      </div>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3">
                      <Button variant="secondary" size="icon" onClick={prevImage} className="rounded-full shadow-lg h-10 w-10 opacity-80 hover:opacity-100">
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button variant="secondary" size="icon" onClick={nextImage} className="rounded-full shadow-lg h-10 w-10 opacity-80 hover:opacity-100">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                  {images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImage(idx)}
                          className={`w-16 h-20 rounded overflow-hidden shrink-0 border-2 transition-colors ${
                            idx === currentImage ? 'border-primary' : 'border-transparent hover:border-border'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-[3/4] sm:rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground">No image available</span>
              </div>
            )}
          </div>

          {/* New Genuine Product Banner + Info Block (replaces old product info) */}
        </div>
      </section>

      {/* Placed activations: above details */}
      {renderPlacedActivations('above_details')}

      <GenuineProductBanner
        productName={product.name}
        collection={(product as any).collection}
        onViewPassport={() => setPassportOpen(true)}
      />

      <ProductInfoBlock
        price={product.price}
        productCode={product.product_code}
        description={product.description}
        composition={product.composition}
        sourceUrl={product.source_url}
        productName={product.name}
        productId={product.id}
      />

      <DigitalPassportPopup
        open={passportOpen}
        onClose={() => setPassportOpen(false)}
        productName={product.name}
        productCode={product.product_code}
        collection={(product as any).collection}
        composition={product.composition}
      />

      {/* 3D Viewer — below product details & passport */}
      {(product as any).model_3d_url && (
        <section className="sm:container sm:max-w-6xl sm:mx-auto sm:px-4 sm:pt-6">
          <Suspense fallback={
            <div className="w-full bg-black flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          }>
            <ProductViewer3D
              modelUrl={(product as any).model_3d_url}
              panoramaUrl={(product as any).panorama_url}
            />
          </Suspense>
        </section>
      )}

      {/* Football Shirts — single product carousel */}
      <CategoryProductCarousel
        excludeProductId={product.id}
        settingsKey="featured_carousel_football"
        fallbackCategory="Clothing"
        fallbackNameFilter="Soccer"
        title="Football Shirts"
        layout="single"
      />

      {/* Lifestyle Shoes — horizontal scroll carousel */}
      <CategoryProductCarousel
        excludeProductId={product.id}
        settingsKey="featured_carousel_shoes"
        fallbackCategory="Sneakers"
        title="Lifestyle Shoes"
        layout="scroll"
      />

      <ShareToResaleModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        product={product}
      />

      {/* Celebrity Spotlight */}
      <CelebritySpotlight productCode={product.product_code} productCategory={product.category} />

      {/* AI-Curated Total Look */}
      {product.product_code && (
        <ProductGeneratedLook 
          productCode={product.product_code} 
          cachedLook={(product as any).generated_look || null}
          onTrackEvent={trackEvent}
          onColorPaletteReady={setLookPalette}
        />
      )}

      {/* Activations Section */}
      {(productActivations.length > 0 || autoMatchedActivations.length > 0) && (
        <section className="py-6 sm:py-8">
          <div className="space-y-6">
            {productActivations.map((pa) =>
              pa.activation ? (
                <div key={pa.id} className={pa.activation.full_width ? '' : 'max-w-6xl mx-auto px-4'}>
                  <ActivationRenderer activation={pa.activation} />
                </div>
              ) : null
            )}
            {autoMatchedActivations.map((activation) => (
              <div key={activation.id} className={activation.full_width ? '' : 'max-w-6xl mx-auto px-4'}>
                <ActivationRenderer activation={activation} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Similar Products */}
      {product.product_code && (
        <SimilarProducts
          productId={product.id}
          productCode={product.product_code}
          category={product.category}
          collection={(product as any).collection}
        />
      )}

      {/* Related Products: Wear With */}
      {product.wear_with && product.wear_with.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-6 sm:py-10" style={resolvedPalette.length > 0 ? { borderTop: `1px solid ${resolvedPalette[0]}25` } : { borderTop: '1px solid hsl(var(--border))' }}>
          <h2 className="text-lg sm:text-2xl font-light text-foreground mb-4 sm:mb-6">Complete the Look</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {product.wear_with.slice(0, 4).map((item: any, idx: number) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                {item.price && (
                  <p className="text-xs text-muted-foreground">{item.price}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Related Products: You May Also Like */}
      {product.you_may_also_like && product.you_may_also_like.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-6 sm:py-10" style={resolvedPalette.length > 0 ? { borderTop: `1px solid ${resolvedPalette[0]}25` } : { borderTop: '1px solid hsl(var(--border))' }}>
          <h2 className="text-lg sm:text-2xl font-light text-foreground mb-4 sm:mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {product.you_may_also_like.slice(0, 4).map((item: any, idx: number) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                {item.price && (
                  <p className="text-xs text-muted-foreground">{item.price}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer — minimal on mobile */}
      <footer className="mt-6 sm:mt-10" style={resolvedPalette.length > 0 ? { borderTop: `1px solid ${resolvedPalette[0]}25` } : { borderTop: '1px solid hsl(var(--border))' }}>
        <div className="max-w-6xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center justify-between">
            <Link to="/">
              <img src={logo} alt={brandName} className="h-4 sm:h-5 opacity-40" />
            </Link>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/">
                <ArrowLeft className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Back to Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductPage;
