import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ExternalLink, ChevronDown } from 'lucide-react';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';

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
  description?: string | null;
}

interface SimilarItem {
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

interface ProductPreviewSheetProps {
  product: LookProduct | null;
  onClose: () => void;
}

const ProductPreviewSheet = ({ product, onClose }: ProductPreviewSheetProps) => {
  const [visible, setVisible] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<SimilarItem[]>([]);
  const [showSimilar, setShowSimilar] = useState(true);
  const [fullProduct, setFullProduct] = useState<LookProduct | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const imgScrollRef = useRef<HTMLDivElement>(null);

  // Fetch setting
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'quick_preview_similar_enabled').single()
      .then(({ data }) => {
        if ((data?.value as any)?.enabled === false) setShowSimilar(false);
      });
  }, []);

  // Load full product data (for description + all images)
  useEffect(() => {
    if (!product) { setFullProduct(null); return; }
    supabase.from('products')
      .select('id, product_code, name, price, images, slug, color, category, source_url, description')
      .eq('id', product.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullProduct({
            ...data,
            product_code: data.product_code || '',
            images: normalizeImages(data.images),
          } as LookProduct);
        } else {
          setFullProduct(product);
        }
      });
  }, [product?.id]);

  // Load similar products
  useEffect(() => {
    if (!product || !showSimilar) { setSimilarProducts([]); return; }
    const load = async () => {
      const { data } = await supabase.from('products')
        .select('id, name, price, images, slug, category, collection, product_code, source_url')
        .neq('id', product.id)
        .eq('category', product.category || '')
        .limit(8);
      if (data && data.length > 0) {
        setSimilarProducts(data.map(p => ({ ...p, images: normalizeImages(p.images) })));
      }
    };
    load();
  }, [product?.id, showSimilar]);

  useEffect(() => {
    if (product) {
      setCurrentImg(0);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [product]);

  if (!product && !visible) return null;

  const p = fullProduct || product;
  const allImages = filterImagesBySku(p?.images || [], p?.product_code);
  const images = allImages.length > 0 ? allImages : (p?.images || []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  // Swipe-to-close handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (sheet && sheet.scrollTop > 5) return;
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const sheet = sheetRef.current;
    if (sheet && sheet.scrollTop > 5) { setDragging(false); setDragY(0); return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    if (dragY > 80) {
      handleClose();
    }
    setDragY(0);
    setDragging(false);
  };

  const handleImgScroll = () => {
    const el = imgScrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== currentImg) setCurrentImg(idx);
  };

  const getTag = (sp: SimilarItem): string | null => {
    if (sp.collection) return sp.collection;
    if (sp.category && p?.category) {
      const segs = p.category.split(' > ');
      const pSegs = sp.category.split(' > ');
      for (let i = segs.length - 1; i >= 0; i--) {
        if (pSegs.includes(segs[i])) return segs[i];
      }
    }
    return 'Similar';
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.45)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: `translate(-50%, ${visible ? dragY : window.innerHeight}px)`,
          width: 'min(393px, 100%)', zIndex: 10001,
          background: '#fff',
          borderRadius: '14px 14px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
          transition: dragging ? 'none' : 'transform 350ms cubic-bezier(.16,1,.3,1)',
          maxHeight: '85vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Handle + Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px 0', position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
          <button
            onClick={handleClose}
            style={{ position: 'absolute', right: 16, top: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X style={{ width: 20, height: 20, color: '#ccc' }} />
          </button>
        </div>

        {/* Image Carousel */}
        <div style={{ position: 'relative' }}>
          <div
            ref={imgScrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={handleImgScroll}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                className="w-full shrink-0 snap-center"
                style={{ aspectRatio: '1/1', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
              >
                <img
                  src={img}
                  alt={`${p?.name} ${idx + 1}`}
                  style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
          {/* Image pagination dots */}
          {images.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0' }}>
              {images.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentImg ? 14 : 5,
                    height: 4,
                    borderRadius: 2,
                    background: idx === currentImg ? '#1a1a1a' : '#ddd',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div style={{ padding: '16px 20px 0' }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {p?.name}
          </h3>
          {(p?.price || p?.product_code) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '6px 0 0' }}>
              {p?.price && (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                  {p.price}
                </span>
              )}
              {p?.product_code && (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c5c0ba' }}>
                  {p.product_code}
                </span>
              )}
            </div>
          )}
          {(p as any)?.description && (
            <details style={{ margin: '10px 0 0' }}>
              <summary style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5',
                cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>Description</span>
                <ChevronDown style={{ width: 12, height: 12 }} />
              </summary>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888', lineHeight: 1.65, margin: '6px 0 0' }}>
                {(p as any).description}
              </p>
            </details>
          )}
        </div>

        {/* CTA */}
        {p?.source_url && (
          <div style={{ padding: '16px 20px 20px' }}>
            <a
              href={p.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: 13, borderRadius: 6,
                background: '#1a1a1a', color: '#fff',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Check on our Store
              <ExternalLink style={{ width: 13, height: 13, opacity: 0.5 }} />
            </a>
          </div>
        )}

        {/* You May Also Like */}
        {showSimilar && similarProducts.length > 0 && (
          <>
            {/* Divider */}
            <div style={{ height: 1, margin: '0 0 20px', background: 'linear-gradient(90deg, transparent, #e8e4df 20%, #e8e4df 80%, transparent)' }} />

            <div style={{ padding: '0 20px' }}>
              <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                You may also like
              </h4>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c5c0ba', margin: '2px 0 14px' }}>
                Based on this product
              </p>
            </div>

            <div
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: 28 }}
            >
              {similarProducts.map(sp => {
                const img = getFlatLayImage(filterImagesBySku(sp.images, sp.product_code), sp.category) || sp.images[0];
                const tag = getTag(sp);
                return (
                  <a
                    key={sp.id}
                    href={sp.source_url || `/product/${sp.slug}`}
                    target={sp.source_url ? '_blank' : undefined}
                    rel={sp.source_url ? 'noopener noreferrer' : undefined}
                    className="shrink-0 snap-start"
                    style={{ minWidth: 140, maxWidth: 140, textDecoration: 'none' }}
                  >
                    <div style={{ borderRadius: 8, border: '1px solid #e4e0db', background: '#fff', overflow: 'hidden' }}>
                      <div style={{ aspectRatio: '1/1', background: '#f7f7f5', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {img && (
                          <img src={img} alt={sp.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} referrerPolicy="no-referrer" loading="lazy" />
                        )}
                      </div>
                      <div style={{ padding: '6px 8px 8px' }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{sp.name}</p>
                        {sp.price && (
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#b5ada5', margin: '2px 0 0' }}>{sp.price}</p>
                        )}
                        {tag && (
                          <span style={{
                            display: 'inline-block', marginTop: 4,
                            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
                            color: '#8b7355', background: '#f5f0eb',
                            border: '1px solid #ebe4db', borderRadius: 3,
                            padding: '2px 7px',
                          }}>{tag}</span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ProductPreviewSheet;
