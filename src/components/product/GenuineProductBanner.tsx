interface GenuineProductBannerProps {
  productName: string;
  collection?: string | null;
}

const GenuineProductBanner = ({ productName, collection }: GenuineProductBannerProps) => {
  return (
    <div
      className="animate-in"
      style={{
        margin: '0 12px',
        padding: '12px 14px',
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
      {/* Product name */}
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 500, color: '#1a1a1a', lineHeight: 1.25 }}>
        {productName}
      </h1>

      {/* Origin line */}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11.5px', color: '#b5ada5', marginTop: '2px' }}>
        Made in Italy{collection ? ` · ${collection}` : ''}
      </p>
    </div>
  );
};

export default GenuineProductBanner;
