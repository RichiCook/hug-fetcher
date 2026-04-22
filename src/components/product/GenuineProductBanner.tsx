import { useState } from 'react';

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L2 3.5V7.5C2 11.09 4.56 14.41 8 15C11.44 14.41 14 11.09 14 7.5V3.5L8 1Z" 
      stroke="#7a6e62" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="#7a6e62" fillOpacity="0.08"/>
    <path d="M5.5 8L7 9.5L10.5 6" stroke="#7a6e62" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PulsingDot = () => (
  <span className="relative inline-flex items-center justify-center w-[6px] h-[6px]">
    <span className="absolute inline-flex h-full w-full rounded-full bg-[#8fbc8f] opacity-40 animate-[pulse-halo_2.4s_ease-in-out_infinite]" />
    <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#8fbc8f]" />
  </span>
);

interface GenuineProductBannerProps {
  productName: string;
  collection?: string | null;
  onViewPassport: () => void;
}

const GenuineProductBanner = ({ productName, collection, onViewPassport }: GenuineProductBannerProps) => {
  return (
    <div
      className="animate-in"
      style={{
        margin: '-72px 12px 0',
        padding: '16px 18px',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderRadius: '6px',
        border: '1px solid rgba(228,224,219,0.55)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.10)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Authenticity badge */}
      <div className="flex items-center gap-1.5">
        <ShieldIcon />
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.18em', color: '#a09080', textTransform: 'uppercase' as const }}>
          Genuine Product
        </span>
      </div>

      {/* Product name */}
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 500, color: '#1a1a1a', marginTop: '8px', lineHeight: 1.3 }}>
        {productName}
      </h1>

      {/* Origin line */}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#b5ada5', marginTop: '4px' }}>
        Made in Italy{collection ? ` · ${collection}` : ''}
      </p>

      {/* DPP tech bar */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: '#272727', borderRadius: '6px', marginTop: '14px',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex items-center justify-center w-[6px] h-[6px]">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-[pulse-halo_2.4s_ease-in-out_infinite]" style={{ background: '#4ade80' }} />
            <span className="relative inline-flex rounded-full h-[6px] w-[6px]" style={{ background: '#4ade80' }} />
          </span>
          <span style={{
            fontFamily: "'Roboto Mono', ui-monospace, monospace", fontSize: '10px', fontWeight: 400,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f8f8f8',
          }}>
            Digital Passport Available
          </span>
        </div>
        <div className="flex items-center" style={{ gap: '14px' }}>
          <img
            src="/images/ympact-logo-white.png"
            alt="Ympact"
            style={{ height: 12, opacity: 0.5 }}
          />
          <button
            onClick={onViewPassport}
            style={{
              fontFamily: "'Roboto Mono', ui-monospace, monospace",
              fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: '#f8f8f8', background: 'transparent',
              border: '1px solid rgba(248,248,248,0.3)', borderRadius: '3px',
              padding: '6px 16px', cursor: 'pointer',
            }}
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenuineProductBanner;
