import { useEffect, useState } from 'react';

interface DigitalPassportPopupProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productCode?: string | null;
  collection?: string | null;
  composition?: string | null;
}

const MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "'Inter', system-ui, -apple-system, sans-serif";

const PulsingDot = ({ color = '#4ade80' }: { color?: string }) => (
  <span className="relative inline-flex items-center justify-center w-[6px] h-[6px]">
    <span className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-[pulse-halo_2.4s_ease-in-out_infinite]" style={{ background: color }} />
    <span className="relative inline-flex rounded-full h-[6px] w-[6px]" style={{ background: color }} />
  </span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2.5" style={{ margin: '24px 0 12px' }}>
    <span style={{
      fontFamily: MONO, fontSize: 9, fontWeight: 500, textTransform: 'uppercase',
      letterSpacing: '0.15em', color: '#a0a0a0', whiteSpace: 'nowrap',
    }}>{children}</span>
    <span style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
  </div>
);

const DataRow = ({ label, value, last = false }: { label: string; value: string; last?: boolean }) => (
  <div className="flex justify-between items-baseline" style={{
    padding: '14px 0',
    borderBottom: last ? 'none' : '1px solid rgba(214,214,214,0.4)',
  }}>
    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, color: '#6b6b6b' }}>{label}</span>
    <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500, color: '#272727', textAlign: 'right' }}>{value}</span>
  </div>
);

const DEFAULT_DATA = {
  brand: "Pantofola d'Oro",
  collection_label: 'Spring / Summer 2026',
  materials: [
    { component: 'Upper', material: 'Premium Italian leather' },
    { component: 'Lining', material: 'Textile' },
    { component: 'Sole', material: 'Rubber' },
  ],
  material_origin: 'European suppliers',
  production: { country: 'Italy', batch: 'SS26-ITALY-045', date: 'March 2026' },
  care: [
    'Clean with a soft cloth',
    'Avoid prolonged exposure to water',
    'Use appropriate leather care products',
  ],
  repair: 'This product is designed to be repairable. Contact authorized repair services for sole or upper restoration.',
  end_of_life: 'Dispose responsibly according to local recycling guidelines. Where possible, separate materials before disposal.',
};

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

  const data = DEFAULT_DATA;
  const collectionLabel = collection || data.collection_label;
  const productId = productCode ? `PDO-${productCode.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase()}` : 'PDO-00012876';

  // If user provided composition, parse to override default materials
  const materials = composition
    ? [{ component: 'Composition', material: composition }, ...data.materials.slice(1)]
    : data.materials;

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
          position: 'fixed', left: 0, right: 0, bottom: 0,
          maxHeight: '90dvh', background: '#f8f8f8',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center" style={{ padding: '12px 0 4px', flexShrink: 0, position: 'relative' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d6d6d6' }} />
          <button
            onClick={onClose}
            style={{ position: 'absolute', right: 18, top: 10, fontSize: 20, color: '#a0a0a0', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 8px' }}>
          {/* Header label */}
          <div style={{
            fontFamily: MONO, fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: '#272727', margin: '20px 0 16px',
          }}>
            Digital Product Passport
          </div>

          {/* Product identity */}
          <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: '#272727', margin: 0, lineHeight: 1.2 }}>
            {productName}
          </h2>
          <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, color: '#6b6b6b', margin: '4px 0 8px' }}>
            {data.brand}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 400, color: '#a0a0a0', letterSpacing: '0.02em', margin: 0 }}>
            {productCode || 'PDO-SL-2026-001'}
            <span style={{ color: '#d6d6d6', margin: '0 8px' }}>·</span>
            {productId}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 400, color: '#a0a0a0', letterSpacing: '0.02em', margin: '4px 0 0' }}>
            {collectionLabel}
          </p>

          {/* Verified banner */}
          <div style={{
            background: '#272727', borderRadius: 6, padding: '14px 18px',
            margin: '20px 0 8px',
          }}>
            <div className="flex items-center gap-2.5">
              <PulsingDot />
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f8f8f8' }}>
                Verified Product
              </span>
            </div>
            <p style={{ fontFamily: MONO, fontSize: 10, fontWeight: 400, color: '#a0a0a0', margin: '6px 0 0', paddingLeft: 16 }}>
              Registered and verified by {data.brand}
            </p>
          </div>

          {/* Materials */}
          <SectionLabel>Materials & Composition</SectionLabel>
          {materials.map((m, i) => (
            <DataRow key={i} label={m.component} value={m.material} />
          ))}
          <DataRow label="Material Origin" value={data.material_origin} last />

          {/* Production */}
          <SectionLabel>Production</SectionLabel>
          <DataRow label="Country" value={data.production.country} />
          <DataRow label="Batch" value={data.production.batch} />
          <DataRow label="Date" value={data.production.date} last />

          {/* Care */}
          <SectionLabel>Care</SectionLabel>
          <div style={{ padding: '4px 0' }}>
            {data.care.map((line, i) => (
              <div key={i} style={{ fontFamily: MONO, fontSize: 12, color: '#272727', lineHeight: 1.8 }}>
                <span style={{ color: '#d6d6d6', marginRight: 8 }}>—</span>{line}
              </div>
            ))}
          </div>

          {/* Repair & End of life */}
          <SectionLabel>Repair & End of Life</SectionLabel>
          <p style={{ fontFamily: MONO, fontSize: 11, color: '#6b6b6b', lineHeight: 1.6, margin: '0 0 12px' }}>
            {data.repair}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 11, color: '#6b6b6b', lineHeight: 1.6, margin: 0 }}>
            {data.end_of_life}
          </p>

          {/* Attribution footer */}
          <div style={{
            margin: '32px 0 24px', paddingTop: 20, borderTop: '1px solid #e0e0e0', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: '#a0a0a0', lineHeight: 1.8,
            }}>
              Digital Product Passport powered by
            </div>
            <img
              src="/images/ympact-logo-white.png"
              alt="Ympact"
              style={{ height: 14, margin: '6px auto 2px', display: 'block', filter: 'invert(1)', opacity: 0.5 }}
            />
            <div style={{
              fontFamily: MONO, fontSize: 8, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: '#c0c0c0', marginTop: 4,
            }}>
              Aitemz Platform
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalPassportPopup;