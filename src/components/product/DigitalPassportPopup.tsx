import { useEffect, useState } from 'react';

interface DigitalPassportPopupProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productCode?: string | null;
  collection?: string | null;
  composition?: string | null;
}

const PulsingDot = () => (
  <span className="relative inline-flex items-center justify-center w-[6px] h-[6px]">
    <span className="absolute inline-flex h-full w-full rounded-full bg-[#8fbc8f] opacity-40 animate-[pulse-halo_2.4s_ease-in-out_infinite]" />
    <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#8fbc8f]" />
  </span>
);

const ICON_STYLE = { stroke: '#aaa', strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STYLE}><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2.5 2 9.5 0 12M8 2c-2 2.5-2 9.5 0 12"/></svg>
);
const WrenchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STYLE}><path d="M10.5 2.5a3.5 3.5 0 00-4.87 4.17L3 9.3V13h3.7l2.63-2.63A3.5 3.5 0 0010.5 2.5z"/></svg>
);
const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STYLE}><path d="M13.5 8.5l-5 5a1 1 0 01-1.41 0L2.5 8.91V2.5h6.41l4.59 4.59a1 1 0 010 1.41z"/><circle cx="5.5" cy="5.5" r="1"/></svg>
);
const FactoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STYLE}><path d="M2 14V8l3-2v2l3-2v2l3-2v6H2zM13 4V2h1v12"/></svg>
);
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STYLE}><path d="M8 1.5A4.5 4.5 0 0112.5 6C12.5 9.5 8 14.5 8 14.5S3.5 9.5 3.5 6A4.5 4.5 0 018 1.5z"/><circle cx="8" cy="6" r="1.5"/></svg>
);
const RecycleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON_STYLE}><path d="M5.5 2L8 5.5 3 5.5zM10.5 2L8 5.5 13 5.5zM3 10L5.5 6.5M13 10L10.5 6.5M5.5 14H10.5M3 10h2.5v4M13 10h-2.5v4"/></svg>
);

const PALETTES = ['#8c7b6b', '#b8a99a', '#d4c8bb', '#ede7e0'];

const parseComposition = (comp: string): { name: string; pct: number }[] => {
  const parts: { name: string; pct: number }[] = [];
  const regex = /(\d+)\s*%\s*([A-Za-zÀ-ÿ\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(comp)) !== null) {
    parts.push({ pct: parseInt(m[1]), name: m[2].trim() });
  }
  return parts.sort((a, b) => b.pct - a.pct);
};

const DATA_ROWS = [
  { icon: <GlobeIcon />, label: 'Carbon Footprint', value: '4.2 kg CO₂e' },
  { icon: <WrenchIcon />, label: 'Repairability Score', value: '7.2 / 10' },
  { icon: <TagIcon />, label: 'Durability Class', value: 'B' },
  { icon: <FactoryIcon />, label: 'Manufacturing', value: 'Italy' },
  { icon: <MapPinIcon />, label: 'Materials Origin', value: 'Italy / France' },
];

const DigitalPassportPopup = ({ open, onClose, productName, productCode, collection, composition }: DigitalPassportPopupProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible) return null;

  const compParts = composition ? parseComposition(composition) : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
        opacity: animating ? 1 : 0, transition: 'opacity 0.3s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: 38, bottom: 38, left: 22, right: 22,
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: animating ? 'translateY(0)' : 'translateY(20px)',
          opacity: animating ? 1 : 0,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px 0', flexShrink: 0 }}>
          {/* Handle + Close */}
          <div className="flex items-center justify-between">
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
            <button onClick={onClose} style={{ fontSize: 18, color: '#ccc', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          {/* Title */}
          <div className="flex items-start gap-2.5" style={{ marginTop: 16 }}>
            <div style={{ width: 16, flexShrink: 0, paddingTop: 6 }}>
              <PulsingDot />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
                Digital Product Passport
              </h2>
            </div>
          </div>

          {/* Product reference */}
          <div style={{ marginLeft: 26, marginTop: 8 }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 500, color: '#555', margin: 0 }}>{productName}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#b0a89e', margin: '3px 0 0' }}>
              {productCode && <>{productCode} · </>}Made in Italy
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, margin: '3px 0 0' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>EU ESPR Compliant</span>
              <span style={{ color: '#b0a89e' }}> · Updated 2025-11-14</span>
            </p>
          </div>

          <div style={{ borderBottom: '1px solid #f0ece7', marginTop: 14 }} />
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>
          {/* Data rows */}
          {DATA_ROWS.map((row, i) => (
            <div key={i} className="flex items-center gap-2.5" style={{ padding: '12px 0', borderBottom: i < DATA_ROWS.length - 1 ? '1px solid #f0ece7' : 'none' }}>
              <div style={{ width: 16, flexShrink: 0 }}>{row.icon}</div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#777', flex: 1 }}>{row.label}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{row.value}</span>
            </div>
          ))}

          {/* Recyclability */}
          <div className="flex gap-2.5" style={{ padding: '12px 0', borderTop: '1px solid #f0ece7' }}>
            <div style={{ width: 16, flexShrink: 0, paddingTop: 2 }}><RecycleIcon /></div>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#777' }}>Recyclability</span>
              <div className="flex justify-between" style={{ marginTop: 6 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#aaa' }}>Heel</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Recyclable steel</span>
              </div>
              <div className="flex justify-between" style={{ marginTop: 4 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#aaa' }}>Upper</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Textile recycling</span>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div style={{ marginTop: 16 }}>
            <div style={{ marginLeft: 26 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#b5ada5', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                Certifications
              </span>
              <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                {['OEKO-TEX® Standard 100', 'ISO 14001'].map((cert) => (
                  <span key={cert} style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
                    padding: '5px 12px', borderRadius: 5, background: '#f5f0eb', color: '#8b7355', border: '1px solid #ebe4db',
                  }}>{cert}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Composition */}
          {compParts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginLeft: 26 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#b5ada5', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  Composition
                </span>
                <div className="flex overflow-hidden" style={{ borderRadius: 4, height: 6, marginTop: 8 }}>
                  {compParts.map((part, i) => (
                    <div key={i} style={{ width: `${part.pct}%`, background: PALETTES[i % PALETTES.length], height: '100%' }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1" style={{ marginTop: 8 }}>
                  {compParts.map((part, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTES[i % PALETTES.length], display: 'inline-block' }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#777' }}>{part.pct}% {part.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalPassportPopup;
