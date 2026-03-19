import { useState } from 'react';
import { useCelebrityContentForProduct } from '@/hooks/useCelebrityContent';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function proxyUrl(url: string) {
  return `${SUPABASE_URL}/functions/v1/export-image-proxy?url=${encodeURIComponent(url)}`;
}

interface CelebritySpotlightProps {
  productCode: string | null | undefined;
  productCategory?: string | null;
}

const CelebritySpotlight = ({ productCode, productCategory }: CelebritySpotlightProps) => {
  const { data: celebrities = [], isLoading } = useCelebrityContentForProduct(productCode, productCategory);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (isLoading || celebrities.length === 0) return null;

  const visible = celebrities.filter(c => !hidden.has(c.id));
  if (visible.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-6 sm:py-10" style={{ borderTop: '1px solid hsl(var(--border))' }}>
      <div className="mb-4 sm:mb-6">
        <p
          className="text-[10.5px] uppercase tracking-[0.14em] mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif", color: '#b5ada5', fontWeight: 600 }}
        >
          As Seen On
        </p>
        <h2
          className="text-lg sm:text-xl"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, color: '#1a1a1a' }}
        >
          Celebrity Spotlight
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {visible.map((celeb) => (
          <div key={celeb.id} className="group">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2">
              <img
                src={proxyUrl(celeb.image_url)}
                alt={celeb.celebrity_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setHidden(prev => new Set(prev).add(celeb.id))}
              />
            </div>
            <p
              className="text-xs sm:text-sm text-center"
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#1a1a1a' }}
            >
              {celeb.celebrity_name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CelebritySpotlight;
