import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';

interface SimilarProduct {
  id: string;
  name: string;
  price: string | null;
  images: string[];
  slug: string;
  category: string | null;
  collection: string | null;
  product_code: string | null;
}

interface SimilarProductsProps {
  productId: string;
  productCode: string | null;
  category: string | null;
  collection: string | null;
}

const SimilarProducts = ({ productId, productCode, category, collection }: SimilarProductsProps) => {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [enabled, setEnabled] = useState(true);

  // Check if similar products is enabled
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'similar_products_enabled')
      .single()
      .then(({ data }) => {
        const val = data?.value as any;
        if (val?.enabled === false) setEnabled(false);
      });
  }, []);
  useEffect(() => {
    const fetch = async () => {
      if (!category && !collection) return;

      let query = supabase
        .from('products')
        .select('id, name, price, images, slug, category, collection, product_code')
        .neq('id', productId)
        .limit(12);

      // Prefer same category, fallback to collection
      if (category) {
        query = query.eq('category', category);
      } else if (collection) {
        query = query.eq('collection', collection);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setProducts(data.map(p => ({ ...p, images: normalizeImages(p.images) })));
      } else if (category && collection) {
        // Fallback to collection if category returned nothing
        const { data: fallback } = await supabase
          .from('products')
          .select('id, name, price, images, slug, category, collection, product_code')
          .neq('id', productId)
          .eq('collection', collection)
          .limit(12);
        if (fallback) setProducts(fallback.map(p => ({ ...p, images: normalizeImages(p.images) })));
      }
    };
    fetch();
  }, [productId, category, collection]);

  if (products.length === 0) return null;

  // Generate tag for each product
  const getTag = (p: SimilarProduct): string | null => {
    if (collection && p.collection === collection) return p.collection;
    if (category) {
      const segments = category.split(' > ');
      const pSegments = (p.category || '').split(' > ');
      // Find common deepest segment
      for (let i = segments.length - 1; i >= 0; i--) {
        if (pSegments.includes(segments[i])) return segments[i];
      }
    }
    return null;
  };

  return (
    <section className="py-8 border-t" style={{ borderColor: '#e4e0db' }}>
      {/* Header */}
      <div className="px-5 mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Similar Products
          </h2>
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c5c0ba' }}>Based on style</span>
      </div>

      {/* Carousel */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map(p => {
          const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
          const tag = getTag(p);
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
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</p>
                  {p.price && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#b5ada5', margin: '2px 0 0' }}>{p.price}</p>
                  )}
                  {tag && (
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
                      color: '#8b7355', background: '#f5f0eb',
                      border: '1px solid #ebe4db', borderRadius: 3,
                      padding: '2px 7px'
                    }}>{tag}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SimilarProducts;
