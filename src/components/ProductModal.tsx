import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/hooks/useProducts';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { filterImagesBySku } from '@/utils/imageUtils';

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductModal = ({ product, open, onOpenChange }: ProductModalProps) => {
  const [currentImage, setCurrentImage] = useState(0);

  if (!product) return null;

  const images = filterImagesBySku(product.images || [], product.product_code);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="relative">
            {images.length > 0 ? (
              <>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={images[currentImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={prevImage}
                      className="rounded-full"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={nextImage}
                      className="rounded-full"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {images.slice(0, 6).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={`w-12 h-12 rounded overflow-hidden shrink-0 border-2 transition-colors ${
                          idx === currentImage ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[3/4] rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {product.product_code && (
              <p className="text-sm text-muted-foreground">
                Code: {product.product_code}
              </p>
            )}
            {product.price && (
              <p className="text-2xl font-medium text-foreground">{product.price}</p>
            )}
            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}
            {product.composition && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Composition</p>
                <p className="text-sm text-muted-foreground">{product.composition}</p>
              </div>
            )}
            {product.care_instructions && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Care</p>
                <p className="text-sm text-muted-foreground">{product.care_instructions}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button asChild>
                <Link to={`/product/${product.slug}`}>
                  View Landing Page
                </Link>
              </Button>
              {product.source_url && (
                <Button variant="outline" asChild>
                  <a href={product.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Source
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
