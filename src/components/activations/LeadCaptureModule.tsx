import { useState, useEffect } from 'react';
import { LeadCaptureContent } from '@/hooks/useActivations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LeadCaptureModuleProps {
  content: LeadCaptureContent;
  activationId: string;
  productId?: string;
  productCode?: string;
  onLeadCapture?: () => void;
  hideTitle?: boolean;
}

const emailSchema = z.string().email('Please enter a valid email address');
const phoneSchema = z.string().regex(/^[+]?[\d\s()-]{7,}$/, 'Please enter a valid phone number').optional().or(z.literal(''));

export const LeadCaptureModule = ({ content, activationId, productId, productCode, onLeadCapture, hideTitle = false }: LeadCaptureModuleProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rewardCode, setRewardCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [styleVariant, setStyleVariant] = useState<'classic' | 'refined'>('refined');
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'lead_capture_style').single()
      .then(({ data }) => {
        const v = (data?.value as any)?.style;
        if (v === 'classic') setStyleVariant('classic');
      });
  }, []);

  const validate = (): boolean => {
    const newErrors: { email?: string; phone?: string } = {};
    try { emailSchema.parse(email); } catch (e: any) { newErrors.email = e.errors?.[0]?.message || 'Invalid email'; }
    if (content.collectPhone && phone) {
      try { phoneSchema.parse(phone); } catch (e: any) { newErrors.phone = e.errors?.[0]?.message || 'Invalid phone'; }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('capture-lead', {
        body: {
          email,
          name: content.collectName ? name : undefined,
          phone: content.collectPhone ? phone : undefined,
          activationId,
          productId,
          rewardType: content.rewardType,
          rewardPrefix: content.rewardPrefix,
        },
      });
      if (error) throw error;
      setSubmitted(true);
      setRewardCode(data.rewardCode);
      onLeadCapture?.();
      if (content.rewardType === 'code_email') {
        toast({
          title: data.emailSent ? 'Success!' : 'Lead captured!',
          description: data.emailSent ? 'Your reward code has been sent to your email.' : 'Your reward code is shown below.',
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Classic style — original rendering
  if (styleVariant === 'classic') {
    return <ClassicLeadCapture content={content} hideTitle={hideTitle} submitted={submitted} rewardCode={rewardCode} email={email} setEmail={setEmail} name={name} setName={setName} phone={phone} setPhone={setPhone} submitting={submitting} errors={errors} onSubmit={handleSubmit} />;
  }

  // Refined style — luxury aesthetic
  if (submitted) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0ece7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle style={{ width: 28, height: 28, color: '#8b7355' }} />
        </div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>
          {content.thankYouMessage || 'Thank you!'}
        </h3>
        {rewardCode && (
          <div style={{ margin: '20px auto 0', padding: '16px 20px', background: '#f8f5f1', border: '1px solid #e8e4df', borderRadius: 8, maxWidth: 280 }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#b5ada5', margin: '0 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Your reward code</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.08em', margin: 0 }}>{rewardCode}</p>
          </div>
        )}
        {content.rewardType === 'code_email' && (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5', marginTop: 14 }}>
            We've also sent this code to your email.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 20px', background: content.backgroundColor || '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 14, color: '#1a1a1a' }}>✦</span>
        {!hideTitle && (
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: content.textColor || '#1a1a1a', letterSpacing: '0.02em', margin: 0 }}>
            {content.title || 'Get Your Reward'}
          </h3>
        )}
      </div>

      {content.description && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: content.textColor ? `${content.textColor}99` : '#888', lineHeight: 1.55, margin: '0 0 20px', paddingLeft: 22 }}>
          {content.description}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Email */}
        <div>
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: content.textColor || '#1a1a1a', letterSpacing: '0.04em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' }}>
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: '#1a1a1a',
              background: '#f8f5f1',
              border: errors.email ? '1.5px solid #c0392b' : '1px solid #e4e0db',
              borderRadius: 6,
              outline: 'none',
              transition: 'border-color 200ms ease',
              boxSizing: 'border-box' as const,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#8b7355'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? '#c0392b' : '#e4e0db'; }}
          />
          {errors.email && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c0392b', marginTop: 4 }}>{errors.email}</p>
          )}
        </div>

        {/* Name */}
        {content.collectName && (
          <div>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: content.textColor || '#1a1a1a', letterSpacing: '0.04em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: '#1a1a1a',
                background: '#f8f5f1',
                border: '1px solid #e4e0db',
                borderRadius: 6,
                outline: 'none',
                transition: 'border-color 200ms ease',
                boxSizing: 'border-box' as const,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8b7355'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e4e0db'; }}
            />
          </div>
        )}

        {/* Phone */}
        {content.collectPhone && (
          <div>
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: content.textColor || '#1a1a1a', letterSpacing: '0.04em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' }}>
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: '#1a1a1a',
                background: '#f8f5f1',
                border: errors.phone ? '1.5px solid #c0392b' : '1px solid #e4e0db',
                borderRadius: 6,
                outline: 'none',
                transition: 'border-color 200ms ease',
                boxSizing: 'border-box' as const,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#8b7355'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = errors.phone ? '#c0392b' : '#e4e0db'; }}
            />
            {errors.phone && (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#c0392b', marginTop: 4 }}>{errors.phone}</p>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: 14,
            borderRadius: 6,
            background: submitting ? '#555' : '#1a1a1a',
            color: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 200ms ease',
            marginTop: 4,
          }}
        >
          {submitting ? (
            <>
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
              Submitting…
            </>
          ) : (
            content.buttonText || 'Get My Reward'
          )}
        </button>
      </form>
    </div>
  );
};

/** Classic (v1) lead capture — preserves original styling */
const ClassicLeadCapture = ({
  content, hideTitle, submitted, rewardCode, email, setEmail, name, setName, phone, setPhone, submitting, errors, onSubmit
}: {
  content: LeadCaptureContent; hideTitle: boolean; submitted: boolean; rewardCode: string | null;
  email: string; setEmail: (v: string) => void; name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void; submitting: boolean;
  errors: { email?: string; phone?: string }; onSubmit: (e: React.FormEvent) => void;
}) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor: content.backgroundColor || undefined,
    backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: content.textColor || undefined,
  };

  if (submitted) {
    return (
      <div className="p-8 rounded-lg border border-border text-center" style={containerStyle}>
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-semibold mb-2">{content.thankYouMessage || 'Thank you!'}</h3>
        {rewardCode && (
          <div className="mt-6 p-6 bg-primary/10 rounded-lg">
            <p className="text-sm mb-2 opacity-80">Your reward code:</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{rewardCode}</p>
          </div>
        )}
        {content.rewardType === 'code_email' && (
          <p className="text-sm opacity-80 mt-4">We've also sent this code to your email!</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 rounded-lg border border-border" style={containerStyle}>
      <div className="flex items-center gap-3 mb-4">
        <Gift className="w-6 h-6" />
        {!hideTitle && <h3 className="text-xl font-semibold">{content.title || 'Get Your Reward'}</h3>}
      </div>
      {content.description && <p className="mb-6 opacity-80">{content.description}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="lead-email">Email *</Label>
          <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className={errors.email ? 'border-destructive' : ''} />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
        </div>
        {content.collectName && (
          <div>
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
          </div>
        )}
        {content.collectPhone && (
          <div>
            <Label htmlFor="lead-phone">Phone</Label>
            <Input id="lead-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" className={errors.phone ? 'border-destructive' : ''} />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>) : (content.buttonText || 'Get My Reward')}
        </Button>
      </form>
    </div>
  );
};
