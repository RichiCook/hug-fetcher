import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StartingProductSelector } from './StartingProductSelector';
import { supabase } from '@/integrations/supabase/client';
import type { LookGeneratorOptions } from '@/hooks/useLooks';

interface LookGeneratorPanelProps {
  onGenerate: (options: LookGeneratorOptions) => void;
  isGenerating: boolean;
}

interface Product {
  id: string;
  name: string;
  price: string | null;
  images: any;
  category: string | null;
  color: string | null;
}

export const LookGeneratorPanel = ({ onGenerate, isGenerating }: LookGeneratorPanelProps) => {
  const [startingProduct, setStartingProduct] = useState<Product | null>(null);
  const [count, setCount] = useState(3);
  
  // Product data
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProductData = async () => {
      const { data: fetchedProducts } = await supabase
        .from('products')
        .select('id, name, price, images, category, color');

      if (fetchedProducts) {
        setProducts(fetchedProducts as Product[]);
      }
    };

    fetchProductData();
  }, []);

  const handleGenerate = () => {
    onGenerate({
      startingProductId: startingProduct?.id,
      count
    });
  };

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Look Generator
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Starting Product */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Starting Product (optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Build the look around a specific product
          </p>
          <StartingProductSelector
            products={products}
            selectedProduct={startingProduct}
            onSelect={setStartingProduct}
          />
        </div>

        <Separator />

        {/* Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Number of Looks</Label>
          <div className="flex gap-2">
            {[1, 3, 5].map(n => (
              <Button
                key={n}
                variant={count === n ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Generate Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Looks
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
