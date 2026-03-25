import { useState, useRef, useCallback } from 'react';
import { ImageCarouselContent } from '@/hooks/useActivations';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  content: ImageCarouselContent;
  hideTitle?: boolean;
}

export const ImageCarouselModule = ({ content }: Props) => {
  const slides = content.slides || [];
  const [current, setCurrent] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const swiping = useRef(false);

  const prev = () => { setSlideDir('right'); setCurrent(i => (i - 1 + slides.length) % slides.length); };
  const next = () => { setSlideDir('left'); setCurrent(i => (i + 1) % slides.length); };

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
      if (touchDeltaX.current < 0) { setSlideDir('left'); setCurrent(i => (i + 1) % slides.length); }
      else { setSlideDir('right'); setCurrent(i => (i - 1 + slides.length) % slides.length); }
    }
    touchDeltaX.current = 0;
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div
      className="w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative">
        <div
          key={`${current}-${slideDir}`}
          className={slideDir === 'left' ? 'animate-slide-in-left' : slideDir === 'right' ? 'animate-slide-in-right' : ''}
          onAnimationEnd={() => setSlideDir(null)}
        >
          <div style={{ aspectRatio: '4/5', overflow: 'hidden', width: '100%' }}>
            <img
              src={slide.imageUrl}
              alt={slide.caption || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
              loading="lazy"
              draggable={false}
            />
          </div>
          {slide.caption && (
            <div style={{
              width: '100%',
              padding: '14px 20px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: '#1a1a1a',
              background: '#fff',
              lineHeight: 1.5,
            }}>
              {slide.caption}
            </div>
          )}
        </div>

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #e4e0db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: '#1a1a1a' }} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #e4e0db', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: '#1a1a1a' }} />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setSlideDir(idx > current ? 'left' : 'right'); setCurrent(idx); }}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: idx === current ? '#1a1a1a' : '#d4d0cb' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
