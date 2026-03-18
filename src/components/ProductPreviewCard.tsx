import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getMainProductImage } from '@/utils/imageUtils';
import { SavedProduct } from '@/hooks/useSavedProducts';

interface ProductPreviewCardProps {
  product: SavedProduct;
}

export const ProductPreviewCard = ({ product }: ProductPreviewCardProps) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const mainImage = getMainProductImage(product.images, product.product_code, product.category);
  const shortUrl = product.short_code ? `${window.location.origin}/p/${product.short_code}` : null;

  // Get the last segment of category as fallback for collection
  const collectionDisplay = product.collection || (() => {
    if (!product.category) return null;
    const parts = product.category.split(' > ');
    return parts[parts.length - 1];
  })();

  const handleExportPng = async () => {
    const card = cardRef.current;
    if (!card) return;

    try {
      // Use canvas to render the card as PNG
      const canvas = document.createElement('canvas');
      const scale = 3; // High resolution
      const cardWidth = 360;
      const padding = 32;
      const imageHeight = 400;
      const qrSize = 120;

      // Calculate text metrics first
      const ctx = canvas.getContext('2d')!;
      canvas.width = cardWidth * scale;
      
      // Pre-calculate heights
      const skuHeight = product.product_code ? 24 : 0;
      const nameHeight = 48; // Approximate for wrapped text
      const categoryHeight = product.category ? 22 : 0;
      const collectionHeight = collectionDisplay ? 22 : 0;
      const qrHeight = shortUrl ? qrSize + 20 : 0;
      const totalHeight = padding + imageHeight + 20 + skuHeight + nameHeight + 8 + categoryHeight + collectionHeight + 16 + qrHeight + padding;

      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 0, 0, cardWidth, totalHeight, 16);
      ctx.fill();

      // Shadow effect
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 0, 0, cardWidth, totalHeight, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Product image
      let currentY = padding;
      if (mainImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = mainImage;
        });

        const imgX = padding;
        const imgW = cardWidth - padding * 2;
        const imgH = imageHeight;
        
        // Clip rounded rect for image
        ctx.save();
        roundRect(ctx, imgX, currentY, imgW, imgH, 12);
        ctx.clip();
        
        // Cover fit
        const imgRatio = img.width / img.height;
        const boxRatio = imgW / imgH;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgRatio > boxRatio) {
          sw = img.height * boxRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / boxRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, imgX, currentY, imgW, imgH);
        ctx.restore();
      }
      currentY += imageHeight + 20;

      // SKU
      if (product.product_code) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '500 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(product.product_code, cardWidth / 2, currentY);
        currentY += skuHeight;
      }

      // Product name (bold, wrapped)
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const nameLines = wrapText(ctx, product.name, cardWidth - padding * 2);
      for (const line of nameLines) {
        ctx.fillText(line, cardWidth / 2, currentY + 16);
        currentY += 22;
      }
      currentY += 8;

      // Category
      if (product.category) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '400 12px system-ui, -apple-system, sans-serif';
        ctx.fillText(product.category, cardWidth / 2, currentY + 4);
        currentY += categoryHeight;
      }

      // Collection
      if (collectionDisplay) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '500 12px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Collection: ${collectionDisplay}`, cardWidth / 2, currentY + 4);
        currentY += collectionHeight;
      }

      // QR Code
      if (shortUrl) {
        currentY += 16;
        const qrCanvas = document.createElement('canvas');
        const qrSvg = document.getElementById(`preview-qr-${product.short_code}`);
        if (qrSvg) {
          const svgData = new XMLSerializer().serializeToString(qrSvg);
          const qrImg = new Image();
          await new Promise<void>((resolve) => {
            qrImg.onload = () => resolve();
            qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
          });
          const qrX = (cardWidth - qrSize) / 2;
          ctx.drawImage(qrImg, qrX, currentY, qrSize, qrSize);
        }
      }

      // Download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${product.product_code || product.slug}-card.png`;
      link.href = pngUrl;
      link.click();

      toast({ title: 'Exported', description: 'Product card saved as PNG' });
    } catch (err) {
      console.error('PNG export error:', err);
      toast({ title: 'Export failed', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Preview card">
          <Eye className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Product Card Preview</DialogTitle>
        </DialogHeader>
        <div ref={cardRef} className="flex flex-col items-center bg-white rounded-xl p-6 shadow-lg mx-auto max-w-[320px]">
          {mainImage && (
            <div className="w-full aspect-[3/4] rounded-xl overflow-hidden mb-4">
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {product.product_code && (
            <p className="text-sm text-gray-500 font-medium">{product.product_code}</p>
          )}
          <h3 className="text-base font-bold text-gray-900 text-center mt-1 leading-snug">
            {product.name}
          </h3>
          {product.category && (
            <p className="text-xs text-gray-400 mt-2 text-center">{product.category}</p>
          )}
          {collectionDisplay && (
            <p className="text-xs text-gray-500 font-medium text-center">
              Collection: {collectionDisplay}
            </p>
          )}
          {shortUrl && (
            <div className="mt-4">
              <QRCodeSVG
                id={`preview-qr-${product.short_code}`}
                value={shortUrl}
                size={120}
                level="H"
                includeMargin
              />
            </div>
          )}
        </div>
        <Button onClick={handleExportPng} className="w-full mt-2">
          <Download className="w-4 h-4 mr-2" />
          Export as PNG
        </Button>
      </DialogContent>
    </Dialog>
  );
};

// Canvas helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}
