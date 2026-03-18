import { useState } from 'react';
import { LeadCaptureContent } from '@/hooks/useActivations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

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
  const { toast } = useToast();

  const validate = (): boolean => {
    const newErrors: { email?: string; phone?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e: any) {
      newErrors.email = e.errors?.[0]?.message || 'Invalid email';
    }

    if (content.collectPhone && phone) {
      try {
        phoneSchema.parse(phone);
      } catch (e: any) {
        newErrors.phone = e.errors?.[0]?.message || 'Invalid phone';
      }
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
        if (data.emailSent) {
          toast({
            title: 'Success!',
            description: 'Your reward code has been sent to your email.',
          });
        } else if (data.emailError) {
          console.warn('Email not sent:', data.emailError);
          // Still show success but inform the code is shown on screen as fallback
          toast({
            title: 'Lead captured!',
            description: 'Your reward code is shown below.',
          });
        }
      }
    } catch (error: any) {
      console.error('Error capturing lead:', error);
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: content.backgroundColor || undefined,
    backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: content.textColor || undefined,
  };

  if (submitted) {
    return (
      <div 
        className="p-8 rounded-lg border border-border text-center"
        style={containerStyle}
      >
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-semibold mb-2">
          {content.thankYouMessage || 'Thank you!'}
        </h3>
        
        {/* Always show the code - either as primary (screen) or as fallback (email failed) */}
        {rewardCode && (
          <div className="mt-6 p-6 bg-primary/10 rounded-lg">
            <p className="text-sm mb-2 opacity-80">Your reward code:</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{rewardCode}</p>
          </div>
        )}
        
        {content.rewardType === 'code_email' && (
          <p className="text-sm opacity-80 mt-4">
            We've also sent this code to your email!
          </p>
        )}
      </div>
    );
  }

  return (
    <div 
      className="p-8 rounded-lg border border-border"
      style={containerStyle}
    >
      <div className="flex items-center gap-3 mb-4">
        <Gift className="w-6 h-6" />
        {!hideTitle && (
          <h3 className="text-xl font-semibold">
            {content.title || 'Get Your Reward'}
          </h3>
        )}
      </div>
      
      {content.description && (
        <p className="mb-6 opacity-80">{content.description}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="lead-email">Email *</Label>
          <Input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        {content.collectName && (
          <div>
            <Label htmlFor="lead-name">Name</Label>
            <Input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>
        )}

        {content.collectPhone && (
          <div>
            <Label htmlFor="lead-phone">Phone</Label>
            <Input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone}</p>
            )}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            content.buttonText || 'Get My Reward'
          )}
        </Button>
      </form>
    </div>
  );
};
