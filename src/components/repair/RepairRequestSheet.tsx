import { useState, useRef } from 'react';
import { X, Camera, Upload, Check, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RepairSettings, DamageType, PriceRule } from '@/hooks/useRepairSettings';

interface RepairRequestSheetProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productCode?: string | null;
  productId?: string;
  repairSettings: RepairSettings;
}

const COUNTRIES = [
  'Italy', 'France', 'Germany', 'United Kingdom', 'Spain', 'United States',
  'Japan', 'China', 'South Korea', 'Australia', 'Canada', 'Switzerland',
  'Netherlands', 'Belgium', 'Austria', 'Portugal', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Greece', 'Turkey',
  'Brazil', 'Mexico', 'India', 'Russia', 'UAE', 'Saudi Arabia', 'Other',
];

const RepairRequestSheet = ({ open, onClose, productName, productCode, productId, repairSettings }: RepairRequestSheetProps) => {
  const [step, setStep] = useState(1);
  const [selectedDamage, setSelectedDamage] = useState<DamageType | null>(null);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 4;

  const getPriceRule = (): PriceRule | undefined =>
    repairSettings.priceRules.find(r => r.damageType === selectedDamage?.name);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;
    files.slice(0, remaining).forEach(file => {
      setPhotos(prev => [...prev, { file, url: URL.createObjectURL(file) }]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!selectedDamage) return;
    setSubmitting(true);
    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('repair-photos').upload(path, photo.file);
        if (!error) {
          const { data } = supabase.storage.from('repair-photos').getPublicUrl(path);
          photoUrls.push(data.publicUrl);
        }
      }

      const priceRule = getPriceRule();

      // Insert repair request
      await supabase.from('repair_requests' as any).insert({
        product_id: productId || null,
        user_email: email || null,
        user_name: name || null,
        damage_type: selectedDamage.name,
        photos: photoUrls,
        country: country || null,
        city: city || null,
        warranty_status: 'unknown',
        estimated_cost_min: priceRule?.min || null,
        estimated_cost_max: priceRule?.max || null,
        status: 'submitted',
      } as any);

      // Send email via edge function
      if (repairSettings.repairEmail) {
        await supabase.functions.invoke('send-repair-email', {
          body: {
            to: repairSettings.repairEmail,
            productName,
            productCode,
            damageType: selectedDamage.name,
            damageDescription: selectedDamage.description,
            photos: photoUrls,
            customerEmail: email,
            customerName: name,
            country,
            city,
            estimatedCostMin: priceRule?.min,
            estimatedCostMax: priceRule?.max,
            returnShippingCost: repairSettings.returnShippingCost,
            emailFields: repairSettings.emailFields.filter(f => f.enabled),
          },
        });
      }

      setSubmitted(true);
    } catch (e) {
      console.error('Repair submit error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedDamage(null);
    setPhotos([]);
    setCountry('');
    setCity('');
    setEmail('');
    setName('');
    setSubmitted(false);
    onClose();
  };

  if (!open) return null;

  const priceRule = getPriceRule();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={handleClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 z-50"
        style={{
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 393,
          borderRadius: '14px 14px 0 0',
          background: '#fff',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUp 350ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        {/* Handle + close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0', margin: '0 auto' }} />
          <button onClick={handleClose} className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-gray-100">
            <X size={18} strokeWidth={1.5} color="#999" />
          </button>
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div className="flex gap-1 px-4 pt-2 pb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1" style={{ height: 3, borderRadius: 2, background: i < step ? '#1a1a1a' : '#e8e4df', transition: 'background 300ms ease' }} />
            ))}
          </div>
        )}

        <div className="px-5 pb-6">
          {submitted ? (
            <ConfirmationScreen
              productName={productName}
              damageType={selectedDamage?.name || ''}
              photoCount={photos.length}
              onDone={handleClose}
            />
          ) : step === 1 ? (
            <Step1DamageType
              damageTypes={repairSettings.damageTypes}
              selected={selectedDamage}
              onSelect={setSelectedDamage}
              productName={productName}
              productCode={productCode}
              onContinue={() => setStep(2)}
            />
          ) : step === 2 ? (
            <Step2Photos
              photos={photos}
              onUpload={handlePhotoUpload}
              onRemove={removePhoto}
              fileInputRef={fileInputRef}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          ) : step === 3 ? (
            <Step3Location
              country={country}
              city={city}
              email={email}
              customerName={name}
              onCountryChange={setCountry}
              onCityChange={setCity}
              onEmailChange={setEmail}
              onNameChange={setName}
              repairCentreAddress={repairSettings.repairCentreAddress}
              estimatedTurnaround={repairSettings.estimatedTurnaround}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
            />
          ) : (
            <Step4Payment
              priceRule={priceRule}
              returnShippingCost={repairSettings.returnShippingCost}
              warrantyCoverRepair={repairSettings.warrantyCoverRepair}
              damageTypeName={selectedDamage?.name || ''}
              submitting={submitting}
              onBack={() => setStep(3)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </>
  );
};

/* ============ STEP COMPONENTS ============ */

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2.5 mb-4">
    {icon}
    <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>{title}</h2>
  </div>
);

const WrenchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const TruckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ActionButton = ({ children, onClick, disabled, variant = 'primary' }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: variant === 'primary' ? '100%' : undefined,
      flex: variant === 'secondary' ? 1 : undefined,
      borderRadius: 6,
      background: variant === 'primary' ? (disabled ? '#ccc' : '#1a1a1a') : '#fff',
      color: variant === 'primary' ? '#fff' : '#1a1a1a',
      border: variant === 'secondary' ? '1px solid #e4e0db' : 'none',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      fontWeight: 600,
      padding: '14px 0',
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'center' as const,
    }}
  >
    {children}
  </button>
);

/* Step 1 */
function Step1DamageType({ damageTypes, selected, onSelect, productName, productCode, onContinue }: {
  damageTypes: DamageType[]; selected: DamageType | null; onSelect: (d: DamageType) => void;
  productName: string; productCode?: string | null; onContinue: () => void;
}) {
  return (
    <>
      <SectionHeader icon={<WrenchIcon />} title="Request a Repair" />
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5', marginBottom: 16 }}>
        {productName} · {productCode || 'N/A'}
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>
        What needs repairing?
      </p>
      <div className="space-y-2 mb-5">
        {damageTypes.map(dt => {
          const isSelected = selected?.id === dt.id;
          return (
            <button
              key={dt.id}
              onClick={() => onSelect(dt)}
              className="w-full flex items-center justify-between text-left"
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                border: `1px solid ${isSelected ? '#1a1a1a' : '#e8e4df'}`,
                background: isSelected ? '#1a1a1a' : '#fff',
              }}
            >
              <div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: isSelected ? '#fff' : '#1a1a1a' }}>{dt.name}</span>
                <br />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.6)' : '#b5ada5' }}>{dt.description}</span>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isSelected ? '#fff' : '#ddd'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
              </div>
            </button>
          );
        })}
      </div>
      <ActionButton onClick={onContinue} disabled={!selected}>Continue</ActionButton>
    </>
  );
}

/* Step 2 */
function Step2Photos({ photos, onUpload, onRemove, fileInputRef, onBack, onContinue }: {
  photos: { file: File; url: string }[]; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void; fileInputRef: React.RefObject<HTMLInputElement>;
  onBack: () => void; onContinue: () => void;
}) {
  return (
    <>
      <SectionHeader icon={<CameraIcon />} title="Damage Assessment" />
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5', marginBottom: 16 }}>
        Photos help us pre-assess and provide an accurate estimate
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p, i) => (
          <div key={i} className="relative shrink-0" style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
            >
              <X size={12} color="#fff" />
            </button>
          </div>
        ))}
        {photos.length < 5 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 flex flex-col items-center justify-center"
            style={{ width: 80, height: 80, borderRadius: 8, border: '1.5px dashed #ddd8d2', background: '#faf9f7' }}
          >
            <Upload size={16} strokeWidth={1.5} color="#b5ada5" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#b5ada5', marginTop: 4 }}>Add</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
      </div>

      {photos.length >= 2 && (
        <div className="flex items-center gap-2 mb-4" style={{ padding: '12px 14px', borderRadius: 8, background: '#f5f0eb' }}>
          <Check size={16} strokeWidth={1.5} color="#8b7355" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8b7355' }}>
            Pre-assessment ready · Our team will review within 24 hours
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <ActionButton onClick={onBack} variant="secondary">Back</ActionButton>
        <ActionButton onClick={onContinue}>{photos.length === 0 ? 'Skip photos' : 'Continue'}</ActionButton>
      </div>
    </>
  );
}

/* Step 3 */
function Step3Location({ country, city, email, customerName, onCountryChange, onCityChange, onEmailChange, onNameChange, repairCentreAddress, estimatedTurnaround, onBack, onContinue }: {
  country: string; city: string; email: string; customerName: string;
  onCountryChange: (v: string) => void; onCityChange: (v: string) => void;
  onEmailChange: (v: string) => void; onNameChange: (v: string) => void;
  repairCentreAddress: string; estimatedTurnaround: string;
  onBack: () => void; onContinue: () => void;
}) {
  return (
    <>
      <SectionHeader icon={<TruckIcon />} title="Shipping Details" />
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5', marginBottom: 16 }}>
        You ship to us. We repair and return to you.
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 4 }}>Your name</label>
          <input
            value={customerName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Full name"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e4df', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            placeholder="your@email.com"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e4df', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 4 }}>Country</label>
          <div className="relative">
            <select
              value={country}
              onChange={e => onCountryChange(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e4df', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', appearance: 'none', background: '#fff' }}
            >
              <option value="">Select country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" color="#999" />
          </div>
        </div>
        <div>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 4 }}>City</label>
          <input
            value={city}
            onChange={e => onCityChange(e.target.value)}
            placeholder="City"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e4df', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none' }}
          />
        </div>
      </div>

      {country && (
        <div className="mb-4" style={{ padding: '14px 16px', borderRadius: 8, background: '#f7f7f5', border: '1px solid #eee' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#b5ada5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ship to</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1a1a1a', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{repairCentreAddress}</p>
          <div style={{ height: 1, background: '#e8e4df', margin: '10px 0' }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#8b7355' }}>⏱ {estimatedTurnaround}</p>
        </div>
      )}

      <div className="flex gap-2">
        <ActionButton onClick={onBack} variant="secondary">Back</ActionButton>
        <ActionButton onClick={onContinue} disabled={!email}>Continue</ActionButton>
      </div>
    </>
  );
}

/* Step 4 */
function Step4Payment({ priceRule, returnShippingCost, warrantyCoverRepair, damageTypeName, submitting, onBack, onSubmit }: {
  priceRule?: PriceRule; returnShippingCost: number; warrantyCoverRepair: boolean;
  damageTypeName: string; submitting: boolean; onBack: () => void; onSubmit: () => void;
}) {
  return (
    <>
      <SectionHeader icon={<ShieldIcon />} title="Warranty & Payment" />

      {/* Warranty card */}
      <div className="mb-4" style={{ padding: '14px 16px', borderRadius: 8, background: '#f7f7f5' }}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
            Warranty Status
          </span>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888', marginTop: 6 }}>
          Standard repair fees apply. Warranty status confirmed after inspection.
        </p>
      </div>

      {/* Cost estimate */}
      {priceRule && (
        <div className="mb-4" style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid #e8e4df' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#b5ada5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Estimated cost</p>
          <div className="flex justify-between mb-1">
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#666' }}>{damageTypeName}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>€{priceRule.min} – €{priceRule.max}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#666' }}>Return shipping</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>€{returnShippingCost}</span>
          </div>
          {warrantyCoverRepair && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#8b7355', fontStyle: 'italic', marginTop: 8 }}>
              May be covered under warranty — confirmed after inspection
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <ActionButton onClick={onBack} variant="secondary">Back</ActionButton>
        <ActionButton onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Request'}
        </ActionButton>
      </div>
    </>
  );
}

/* Confirmation */
function ConfirmationScreen({ productName, damageType, photoCount, onDone }: {
  productName: string; damageType: string; photoCount: number; onDone: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="flex justify-center mb-4">
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f5f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={20} strokeWidth={1.5} color="#8b7355" style={{ opacity: 0.8 }} />
        </div>
      </div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
        Repair Request Submitted
      </h2>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888', marginBottom: 20 }}>
        We'll review your request and get back to you by email.
      </p>

      <div className="text-left" style={{ padding: '14px 16px', borderRadius: 8, background: '#f7f7f5', marginBottom: 20 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#b5ada5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Summary</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1a1a1a' }}>{productName}</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888' }}>Repair type: {damageType}</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888' }}>Photos: {photoCount}</p>
      </div>

      <ActionButton onClick={onDone}>Done</ActionButton>
    </div>
  );
}

export default RepairRequestSheet;
