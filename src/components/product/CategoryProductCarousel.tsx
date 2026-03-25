import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
}

interface CategoryProductCarouselProps {
  excludeProductId: string;
  category: string;
  title: string;
  /** 'single' = full-width one-at-a-time carousel, 'scroll' = horizontal scroll like SimilarProducts */
  layout: 'single' | 'scroll';
  /** Filter product names to those containing this substring (case-insensitive) */
  nameFilter?: string;
  limit?: number;
}

const CategoryProductCarousel = ({ excludeProductId, category, title, layout, nameFilter, limit = 20 }: CategoryProductCarouselProps) => {
  const [products, setProducts] = useState<CarouselProduct[]>([]);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('products')
        .select('id, name, price, images, slug, category, collection, product_code')
        .neq('id', excludeProductId)
        .eq('category', category)
        .limit(limit);

      if (nameFilter) {
        query = query.ilike('name', `%${nameFilter}%`);
      }

      const { data } = await query;
      if (data) {
        setProducts(data.map(p => ({ ...p, images: normalizeImages(p.images) })));
      }
    };
    load();
  }, [excludeProductId, category, nameFilter, limit]);

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
        /* Full-width single product carousel */
        <div className="relative px-5">
          {(() => {
            const p = products[current];
            const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
            return (
              <Link to={`/product/${p.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ borderRadius: 12, border: '1px solid #e4e0db', background: '#fff', overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '4/5', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img && (
                      <img
                        src={img}
                        alt={p.name}
                        style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                        referrerPolicy="no-referrer"
                        loading="lazy"
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
              </Link>
            );
          })()}

          {/* Navigation arrows */}
          {products.length > 1 && (
            <>
              <button
                onClick={(e) => { e.preventDefault(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #e4e0db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: '#1a1a1a' }} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #e4e0db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: '#1a1a1a' }} />
              </button>
            </>
          )}

          {/* Dots */}
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
        /* Horizontal scroll — same as SimilarProducts */
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(p => {
            const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
            return (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                className="shrink-0 snap-start"
                style={{ minWidth: 148, maxWidth: 148, textDecoration: 'none' }}
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
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CategoryProductCarousel;
