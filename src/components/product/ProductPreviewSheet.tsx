import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';

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

interface ProductPreviewSheetProps {
  product: LookProduct | null;
  onClose: () => void;
}

const ProductPreviewSheet = ({ product, onClose }: ProductPreviewSheetProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (product) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [product]);

  if (!product && !visible) return null;

  const image = getFlatLayImage(filterImagesBySku(product?.images || [], product?.product_code), product?.category) || product?.images?.[0];

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
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
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: `translate(-50%, ${visible ? '0' : '100%'})`,
        width: 'min(393px, 100%)', zIndex: 10001,
        background: '#fff',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
        transition: 'transform 350ms cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Handle + Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px 0', position: 'relative' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
          <button
            onClick={handleClose}
            style={{ position: 'absolute', right: 16, top: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X style={{ width: 20, height: 20, color: '#999' }} />
          </button>
        </div>

        {/* Product Image */}
        <div style={{ width: '100%', aspectRatio: '1/1', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {image && (
            <img
              src={image}
              alt={product?.name}
              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '16px 20px 24px' }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {product?.name}
          </h3>
          {product?.price && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '6px 0 16px' }}>
              {product.price}
            </p>
          )}
          {product?.source_url && (
            <a
              href={product.source_url}
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
          )}
        </div>
      </div>
    </>
  );
};

export default ProductPreviewSheet;
