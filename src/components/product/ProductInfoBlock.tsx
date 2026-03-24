import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import RepairRequestSheet from '@/components/repair/RepairRequestSheet';
import { RepairSettings, DEFAULT_REPAIR_SETTINGS } from '@/hooks/useRepairSettings';

interface ProductInfoBlockProps {
  price?: string | null;
  productCode?: string | null;
  description?: string | null;
  composition?: string | null;
  sourceUrl?: string | null;
  productName?: string;
  productId?: string;
}

const PALETTES: Record<string, string[]> = {
  'warm-naturals': ['#8c7b6b', '#b8a99a', '#d4c8bb', '#ede7e0'],
  'monochrome': ['#1a1a1a', '#555', '#888', '#bbb'],
  'earth-tones': ['#7a5c47', '#a67c5b', '#c9a882', '#e3d5c3'],
  'noir-gold': ['#1a1a1a', '#3d3529', '#8b7355', '#c9b896'],
};

const parseComposition = (comp: string): { name: string; pct: number }[] => {
  const parts: { name: string; pct: number }[] = [];
  const regex = /(\d+)\s*%\s*([A-Za-zÀ-ÿ\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(comp)) !== null) {
    parts.push({ pct: parseInt(m[1]), name: m[2].trim() });
  }
  if (parts.length === 0 && comp) {
    // fallback: just show the raw text
    return [{ pct: 100, name: comp }];
  }
  return parts.sort((a, b) => b.pct - a.pct);
};

const ProductInfoBlock = ({ price, productCode, description, composition, sourceUrl, productName, productId }: ProductInfoBlockProps) => {
  const palette = PALETTES['warm-naturals'];
  const compParts = composition ? parseComposition(composition) : [];
  const [repairSettings, setRepairSettings] = useState<RepairSettings | null>(null);
  const [repairOpen, setRepairOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'repair_service')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const s = { ...DEFAULT_REPAIR_SETTINGS, ...(data.value as any) };
          if (s.enabled) setRepairSettings(s);
        }
      });
  }, []);

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Price row */}
      <div className="flex items-baseline justify-between" style={{ padding: '18px 0 0' }}>
        <div className="flex items-baseline gap-2">
          {price && (
            <>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 500, color: '#b5ada5' }}>RRP:</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>{price}</span>
            </>
          )}
        </div>
        {productCode && (
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#c5c0ba' }}>{productCode}</span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.75, color: '#666', padding: '14px 0 0' }}>
          {description}
        </p>
      )}

      {/* Composition */}
      {compParts.length > 0 && (
        <div style={{ padding: '18px 0 0' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, color: '#b5ada5', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              Composition
            </span>
            <div className="flex items-center gap-1">
              {palette.map((c, i) => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />
              ))}
            </div>
          </div>

          {/* Stacked bar */}
          <div className="flex overflow-hidden" style={{ borderRadius: 4, height: 7, marginTop: 10 }}>
            {compParts.map((part, i) => (
              <div key={i} style={{ width: `${part.pct}%`, background: palette[i % palette.length], height: '100%' }} />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5" style={{ marginTop: 10 }}>
            {compParts.map((part, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: palette[i % palette.length], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#777' }}>
                  {part.pct}% {part.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #e8e4df 20%, #e8e4df 80%, transparent)', margin: '26px 0' }} />

      {/* CTA */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2"
          style={{
            display: 'flex',
            width: '100%',
            borderRadius: 8,
            background: '#1a1a1a',
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '15px',
            fontWeight: 600,
            padding: '16px 0',
            textDecoration: 'none',
            textAlign: 'center' as const,
          }}
        >
          View on our Store
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M5 11L11 5M11 5H6M11 5V10" />
          </svg>
        </a>
      )}

      {/* Footer */}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#ccc', textAlign: 'center' as const, marginTop: 12 }}>
        Powered by Aitems · Product Intelligence
      </p>
    </div>
  );
};

export default ProductInfoBlock;
