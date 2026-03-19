import { useState, useEffect, useCallback } from 'react';
import { useCelebrityContentForProduct } from '@/hooks/useCelebrityContent';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const visible = celebrities.filter(c => !hidden.has(c.id));

  const next = useCallback(() => {
    if (visible.length === 0) return;
    setCurrent(prev => (prev + 1) % visible.length);
  }, [visible.length]);

  const prev = useCallback(() => {
    if (visible.length === 0) return;
    setCurrent(prev => (prev - 1 + visible.length) % visible.length);
  }, [visible.length]);

  useEffect(() => {
    if (isPaused || visible.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, isPaused, visible.length]);

  useEffect(() => {
    if (current >= visible.length && visible.length > 0) {
      setCurrent(0);
    }
  }, [visible.length, current]);

  if (isLoading || visible.length === 0) return null;

  const celeb = visible[current];
  if (!celeb) return null;

  return (
    <section
      className="max-w-6xl mx-auto px-4 py-6 sm:py-10"
      style={{ borderTop: '1px solid hsl(var(--border))' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mb-4 sm:mb-6 text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.14em] mb-1 text-muted-foreground"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
        >
          As Seen On
        </p>
        <h2
          className="text-lg sm:text-xl text-foreground"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
        >
          Celebrity Spotlight
        </h2>
      </div>

      <div className="relative flex items-center justify-center gap-4">
        {visible.length > 1 && (
          <button
            onClick={prev}
            className="shrink-0 p-2 rounded-full border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="w-56 sm:w-64 md:w-72">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-3">
            <img
              key={celeb.id}
              src={proxyUrl(celeb.image_url)}
              alt={celeb.celebrity_name}
              className="w-full h-full object-cover animate-in fade-in duration-500"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setHidden(prev => new Set(prev).add(celeb.id))}
            />
          </div>
          <p
            className="text-sm sm:text-base text-center text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
          >
            {celeb.celebrity_name}
          </p>
        </div>

        {visible.length > 1 && (
          <button
            onClick={next}
            className="shrink-0 p-2 rounded-full border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {visible.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {visible.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === current ? 'bg-foreground w-4' : 'bg-muted-foreground/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CelebritySpotlight;
