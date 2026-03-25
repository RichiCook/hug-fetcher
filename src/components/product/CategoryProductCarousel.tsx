import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProduct {
  id: string;
  name: string;
  price: string | null;
  images: string[];
  slug: string;
  category: string | null;
  collection: string | null;
  product_code: string | null;
  source_url: string | null;
}

interface CarouselSettings {
  categories: string[];
  nameFilter: string;
  featuredProductIds: string[];
  excludedProductIds: string[];
  linkToBrandWebsite: boolean;
}

interface CategoryProductCarouselProps {
  excludeProductId: string;
  /** Settings key in app_settings table */
  settingsKey: string;
  /** Fallback category if no settings exist */
  fallbackCategory?: string;
  /** Fallback name filter */
  fallbackNameFilter?: string;
  title: string;
  /** 'single' = full-width one-at-a-time carousel, 'scroll' = horizontal scroll */
  layout: 'single' | 'scroll';
  limit?: number;
}

const DEFAULT_SETTINGS: CarouselSettings = {
  categories: [],
  nameFilter: '',
  featuredProductIds: [],
  excludedProductIds: [],
  linkToBrandWebsite: true,
};

const CategoryProductCarousel = ({
  excludeProductId, settingsKey, fallbackCategory, fallbackNameFilter, title, layout, limit = 20,
}: CategoryProductCarouselProps) => {
  const [products, setProducts] = useState<CarouselProduct[]>([]);
  const [current, setCurrent] = useState(0);
  const [settings, setSettings] = useState<CarouselSettings>(DEFAULT_SETTINGS);
  const navigate = useNavigate();

  // Touch / swipe state
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const swiping = useRef(false);

  // Load settings
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', settingsKey)
      .single()
      .then(({ data }) => {
        if (data?.value) {
          setSettings({ ...DEFAULT_SETTINGS, ...(data.value as any) });
        }
      });
  }, [settingsKey]);

  // Load products
  useEffect(() => {
    const load = async () => {
      const cats = settings.categories.length > 0 ? settings.categories : (fallbackCategory ? [fallbackCategory] : []);
      if (cats.length === 0 && settings.featuredProductIds.length === 0) return;

      let allProducts: CarouselProduct[] = [];

      // If featured products specified, load those first
      if (settings.featuredProductIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, images, slug, category, collection, product_code, source_url')
          .in('id', settings.featuredProductIds)
          .neq('id', excludeProductId);
        if (data) allProducts = data.map(p => ({ ...p, images: normalizeImages(p.images) }));
      }

      // Load by category
      if (cats.length > 0) {
        let query = supabase
          .from('products')
          .select('id, name, price, images, slug, category, collection, product_code, source_url')
          .neq('id', excludeProductId)
          .in('category', cats)
          .limit(limit);

        const nf = settings.nameFilter || fallbackNameFilter;
        if (nf) {
          query = query.ilike('name', `%${nf}%`);
        }

        const { data } = await query;
        if (data) {
          const existingIds = new Set(allProducts.map(p => p.id));
          const newProducts = data
            .filter(p => !existingIds.has(p.id))
            .map(p => ({ ...p, images: normalizeImages(p.images) }));
          allProducts = [...allProducts, ...newProducts];
        }
      }

      // Exclude products
      if (settings.excludedProductIds.length > 0) {
        const excludeSet = new Set(settings.excludedProductIds);
        allProducts = allProducts.filter(p => !excludeSet.has(p.id));
      }

      setProducts(allProducts);
    };
    load();
  }, [excludeProductId, settings, fallbackCategory, fallbackNameFilter, limit]);

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    swiping.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0) {
        setCurrent(i => (i + 1) % products.length);
      } else {
        setCurrent(i => (i - 1 + products.length) % products.length);
      }
    }
    touchDeltaX.current = 0;
  }, [products.length]);

  const handleProductClick = (p: CarouselProduct) => {
    if (settings.linkToBrandWebsite && p.source_url) {
      window.open(p.source_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/product/${p.slug}`);
    }
  };

  if (products.length === 0) return null;

  const prev = () => setCurrent(i => (i - 1 + products.length) % products.length);
  const next = () => setCurrent(i => (i + 1) % products.length);

  return (
    <section className="py-8 border-t" style={{ borderColor: '#e4e0db' }}>
      {/* Header */}
      <div className="px-5 mb-4 flex justify-between items-center">
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c5c0ba' }}>
          {layout === 'single' ? `${current + 1} / ${products.length}` : `${products.length} items`}
        </span>
      </div>

      {layout === 'single' ? (
        <div
          className="relative px-5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {(() => {
            const p = products[current];
            const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
            return (
              <div
                onClick={() => handleProductClick(p)}
                style={{ cursor: 'pointer', borderRadius: 12, border: '1px solid #e4e0db', background: '#fff', overflow: 'hidden' }}
              >
                <div style={{ aspectRatio: '4/5', overflow: 'hidden' }}>
                  {img && (
                    <img
                      src={img}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      draggable={false}
                    />
                  )}
                </div>
                <div style={{ padding: '12px 16px 16px' }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{p.name}</p>
                  {p.price && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#b5ada5', margin: '4px 0 0' }}>{p.price}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {products.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #e4e0db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: '#1a1a1a' }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #e4e0db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: '#1a1a1a' }} />
              </button>
            </>
          )}

          {products.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {products.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ background: idx === current ? '#1a1a1a' : '#d4d0cb' }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(p => {
            const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
            return (
              <div
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="shrink-0 snap-start cursor-pointer"
                style={{ minWidth: 148, maxWidth: 148 }}
              >
                <div style={{ borderRadius: 8, border: '1px solid #e4e0db', background: '#fff', overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1/1', background: '#f7f7f5', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img && (
                      <img
                        src={img}
                        alt={p.name}
                        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    {p.price && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#b5ada5', margin: '2px 0 0' }}>{p.price}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CategoryProductCarousel;
