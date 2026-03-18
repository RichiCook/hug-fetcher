import { useState, useEffect } from 'react';
import { ExternalLink, Trash2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getFlatLayImage, parseImages, filterImagesBySku } from '@/utils/imageUtils';
import { useImageClassification } from '@/hooks/useImageClassification';
import type { Look, Product } from '@/hooks/useLooks';

interface LookCardProps {
  look: Look;
  onSave?: () => void;
  onDelete?: () => void;
  isSaved?: boolean;
}

interface ProductImageProps {
  product: Product;
  isModelReady: boolean;
  classifyProductImages: (productId: string, images: string[], category?: string | null) => Promise<string | null>;
  getCached: (productId: string) => string | null;
}

const ProductImage = ({ product, isModelReady, classifyProductImages, getCached }: ProductImageProps) => {
  const parsedImages = parseImages(product.images);
  const skuFiltered = filterImagesBySku(parsedImages, null);
  const patternBasedImage = getFlatLayImage(skuFiltered, product.category);
  
  // Check cache first for instant display
  const cachedImage = getCached(product.id);
  
  const [displayImage, setDisplayImage] = useState<string | null>(cachedImage || patternBasedImage);
  const [isClassifying, setIsClassifying] = useState(false);

  useEffect(() => {
    // If we have a cached result, use it
    if (cachedImage) {
      setDisplayImage(cachedImage);
      return;
    }

    // If model is ready and we have images, classify them
    if (isModelReady && parsedImages.length > 0) {
      setIsClassifying(true);
      classifyProductImages(product.id, parsedImages, product.category)
        .then((bestImage) => {
          if (bestImage) {
            setDisplayImage(bestImage);
          }
        })
        .finally(() => {
          setIsClassifying(false);
        });
    }
  }, [isModelReady, product.id, product.category, cachedImage, parsedImages, classifyProductImages]);

  if (isClassifying) {
    return (
      <div className="aspect-square flex items-center justify-center bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (displayImage) {
    return (
      <div className="aspect-square">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className="aspect-square flex items-center justify-center bg-muted">
      <span className="text-xs text-muted-foreground">No image</span>
    </div>
  );
};

export const LookCard = ({ look, onSave, onDelete, isSaved = false }: LookCardProps) => {
  const products = look.products || [];
  const { isModelLoading, isModelReady, loadProgress, classifyProductImages, getCached } = useImageClassification();

  // Calculate total price
  const totalPrice = products.reduce((sum, product) => {
    if (product.price) {
      const priceNum = parseFloat(product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(priceNum)) {
        return sum + priceNum;
      }
    }
    return sum;
  }, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{look.name}</CardTitle>
          {totalPrice > 0 && (
            <span className="text-lg font-semibold">
              €{totalPrice.toFixed(2)}
            </span>
          )}
        </div>
        {isModelLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading image AI... {loadProgress}%</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Color palette */}
        {look.color_palette && look.color_palette.length > 0 && (
          <div className="flex gap-1">
            {look.color_palette.map((color, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {color}
              </Badge>
            ))}
          </div>
        )}

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <div 
              key={product.id} 
              className="group relative border rounded-lg overflow-hidden bg-muted/30"
            >
              <ProductImage
                product={product}
                isModelReady={isModelReady}
                classifyProductImages={classifyProductImages}
                getCached={getCached}
              />
              
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium line-clamp-2">{product.name}</p>
                {product.price && (
                  <p className="text-xs text-muted-foreground">{product.price}</p>
                )}
                {product.source_url && (
                  <a
                    href={product.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI reasoning */}
        {look.ai_reasoning && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground italic">
              "{look.ai_reasoning}"
            </p>
          </div>
        )}

        {look.description && (
          <p className="text-sm text-muted-foreground">{look.description}</p>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {!isSaved && onSave && (
          <Button size="sm" variant="default" onClick={onSave} className="flex-1">
            <Save className="w-4 h-4 mr-1" />
            Save Look
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete look?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{look.name}". This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
};
