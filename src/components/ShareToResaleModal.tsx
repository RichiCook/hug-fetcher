import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Copy, Download, MessageCircle, Share2, ExternalLink } from 'lucide-react';

interface Product {
  name: string;
  slug?: string;
  price?: string | null;
  description?: string | null;
  composition?: string | null;
  color?: string | null;
  category?: string | null;
  images?: string[] | null;
}

interface ShareToResaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

const generateListingTemplate = (product: Product): string => {
  const lines: string[] = [];
  lines.push(`📦 ${product.name}`);
  if (product.price) lines.push(`💰 Price: ${product.price}`);
  if (product.description) lines.push(`\n${product.description}`);
  if (product.composition) lines.push(`\n🧵 Composition: ${product.composition}`);
  if (product.color) lines.push(`🎨 Color: ${product.color}`);
  if (product.category) lines.push(`📂 Category: ${product.category}`);
  lines.push(`\n✅ Condition: New with tags`);
  return lines.join('\n');
};

const ShareToResaleModal = ({ open, onOpenChange, product }: ShareToResaleModalProps) => {
  const [downloading, setDownloading] = useState(false);
  const listing = generateListingTemplate(product);

  const copyAndOpenPlatform = async (platform: 'vinted' | 'depop') => {
    try {
      await navigator.clipboard.writeText(listing);
      toast({ title: 'Listing copied to clipboard!', description: `Paste it into ${platform === 'vinted' ? 'Vinted' : 'Depop'} when the app opens.` });

      const deepLink = platform === 'vinted' ? 'vinted://sell' : 'depop://sell';
      const fallbackUrl = platform === 'vinted' ? 'https://www.vinted.com/items/new' : 'https://www.depop.com/sell';

      // Try deep link, fall back to web
      const start = Date.now();
      window.location.href = deepLink;
      setTimeout(() => {
        if (Date.now() - start < 2000) {
          window.open(fallbackUrl, '_blank');
        }
      }, 1500);
    } catch {
      toast({ title: 'Could not copy', description: 'Please copy the listing manually.', variant: 'destructive' });
    }
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(listing);
      toast({ title: 'Listing template copied!' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const downloadImages = async () => {
    const images = product.images?.filter(Boolean);
    if (!images?.length) {
      toast({ title: 'No images available', variant: 'destructive' });
      return;
    }
    setDownloading(true);
    try {
      for (let i = 0; i < images.length; i++) {
        const response = await fetch(images[i], { mode: 'cors', referrerPolicy: 'no-referrer' });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}_${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast({ title: `${images.length} image(s) downloaded!` });
    } catch {
      toast({ title: 'Download failed', description: 'Some images could not be downloaded due to CORS restrictions.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const getShareUrl = () => {
    if (product.slug) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/og-product?slug=${encodeURIComponent(product.slug)}`;
    }
    return window.location.href;
  };

  const shareViaWhatsApp = () => {
    const shareUrl = getShareUrl();
    const text = encodeURIComponent(`${listing}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: listing });
      } catch {
        // User cancelled
      }
    } else {
      shareViaWhatsApp();
    }
  };

  const platforms = [
    {
      name: 'Vinted',
      icon: '🟢',
      description: 'Copy listing & open Vinted',
      onClick: () => copyAndOpenPlatform('vinted'),
    },
    {
      name: 'Depop',
      icon: '🔴',
      description: 'Copy listing & open Depop',
      onClick: () => copyAndOpenPlatform('depop'),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Sell This Item</DialogTitle>
          <DialogDescription className="text-sm">
            Share "{product.name}" to resale platforms or social apps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {/* Platform buttons */}
          {platforms.map((p) => (
            <Button
              key={p.name}
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={p.onClick}
            >
              <span className="text-lg">{p.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </div>
              <ExternalLink className="ml-auto w-4 h-4 text-muted-foreground" />
            </Button>
          ))}

          <div className="border-t border-border my-3" />

          {/* Utility actions */}
          <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={copyTemplate}>
            <Copy className="w-4 h-4" />
            <span className="text-sm">Copy Listing Template</span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-11"
            onClick={downloadImages}
            disabled={downloading || !product.images?.length}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">{downloading ? 'Downloading...' : 'Download Images'}</span>
          </Button>

          <div className="border-t border-border my-3" />

          <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={shareViaWhatsApp}>
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Share via WhatsApp</span>
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={shareNative}>
            <Share2 className="w-4 h-4" />
            <span className="text-sm">Share via Other Apps</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareToResaleModal;
