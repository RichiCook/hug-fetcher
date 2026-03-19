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
        margin: '8px 12px 0',
        padding: '16px 18px',
        background: '#fff',
        borderRadius: '6px',
        border: '1px solid #e4e0db',
        boxShadow: '0 1px 10px rgba(0,0,0,0.025)',
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

      {/* Divider */}
      <div style={{ borderTop: '1px solid #f0ece7', marginTop: '14px', paddingTop: '14px' }}>
        {/* Passport row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PulsingDot />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#a09890' }}>
              Digital Passport Available
            </span>
          </div>
          <button
            onClick={onViewPassport}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 500,
              color: '#1a1a1a',
              background: 'none',
              border: '1px solid #ddd8d2',
              borderRadius: '5px',
              padding: '7px 18px',
              cursor: 'pointer',
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
