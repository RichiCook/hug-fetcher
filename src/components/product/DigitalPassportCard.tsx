interface DigitalPassportCardProps {
  onView: () => void;
}

const DigitalPassportCard = ({ onView }: DigitalPassportCardProps) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        background: '#272727',
        borderRadius: '5px',
        margin: '12px',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="relative inline-flex items-center justify-center w-[6px] h-[6px]">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-[pulse-halo_2.4s_ease-in-out_infinite]"
            style={{ background: '#4ade80' }}
          />
          <span
            className="relative inline-flex rounded-full h-[6px] w-[6px]"
            style={{ background: '#4ade80' }}
          />
        </span>
        <span
          style={{
            fontFamily: "'Roboto Mono', ui-monospace, monospace",
            fontSize: '10px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#f8f8f8',
          }}
        >
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
          onClick={onView}
          style={{
            fontFamily: "'Roboto Mono', ui-monospace, monospace",
            fontSize: '9px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#f8f8f8',
            background: 'transparent',
            border: '1px solid rgba(248,248,248,0.3)',
            borderRadius: '3px',
            padding: '6px 16px',
            cursor: 'pointer',
          }}
        >
          View
        </button>
      </div>
    </div>
  );
};

export default DigitalPassportCard;
