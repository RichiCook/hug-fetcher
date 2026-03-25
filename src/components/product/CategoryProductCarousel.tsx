import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';

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
  /** Current product ID to exclude */
  excludeProductId: string;
  /** Category to filter by */
  category: string;
  /** Section title */
  title: string;
  /** Layout: 'column' for single-column vertical, 'scroll' for horizontal scroll like SimilarProducts */
  layout: 'column' | 'scroll';
  /** Max items to show */
  limit?: number;
}

const CategoryProductCarousel = ({ excludeProductId, category, title, layout, limit = 12 }: CategoryProductCarouselProps) => {
  const [products, setProducts] = useState<CarouselProduct[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, images, slug, category, collection, product_code')
        .neq('id', excludeProductId)
        .eq('category', category)
        .limit(limit);
      if (data) {
        setProducts(data.map(p => ({ ...p, images: normalizeImages(p.images) })));
      }
    };
    load();
  }, [excludeProductId, category, limit]);

  if (products.length === 0) return null;

  return (
    <section className="py-8 border-t" style={{ borderColor: '#e4e0db' }}>
      {/* Header */}
      <div className="px-5 mb-4 flex justify-between items-center">
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c5c0ba' }}>
          {products.length} items
        </span>
      </div>

      {layout === 'scroll' ? (
        /* Horizontal scroll — same as SimilarProducts */
        <div
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
      ) : (
        /* Single column — stacked cards */
        <div className="px-5 space-y-3">
          {products.map(p => {
            const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
            return (
              <Link
                key={p.id}
                to={`/product/${p.slug}`}
                className="flex items-center gap-4"
                style={{ textDecoration: 'none', borderRadius: 8, border: '1px solid #e4e0db', background: '#fff', overflow: 'hidden', padding: 8 }}
              >
                <div style={{ width: 80, height: 80, flexShrink: 0, background: '#f7f7f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  {p.price && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5', margin: '2px 0 0' }}>{p.price}</p>
                  )}
                  {p.collection && (
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
                      color: '#8b7355', background: '#f5f0eb',
                      border: '1px solid #ebe4db', borderRadius: 3,
                      padding: '2px 7px'
                    }}>{p.collection}</span>
                  )}
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
