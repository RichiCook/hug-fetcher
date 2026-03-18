import { useState, useMemo } from 'react';
import { Search, X, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseImages, getMainProductImage } from '@/utils/imageUtils';

interface Product {
  id: string;
  name: string;
  price: string | null;
  images: any;
  category: string | null;
  color: string | null;
}

interface StartingProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
}

export const StartingProductSelector = ({
  products,
  selectedProduct,
  onSelect,
}: StartingProductSelectorProps) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!search) return products.slice(0, 50);
    const term = search.toLowerCase();
    return products
      .filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.color?.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [products, search]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearch('');
  };

  if (selectedProduct) {
    const images = parseImages(selectedProduct.images);
    const mainImg = getMainProductImage(selectedProduct.images, null, selectedProduct.category);
    return (
      <div className="border rounded-lg p-3 bg-secondary/30">
        <div className="flex items-center gap-3">
          {mainImg ? (
            <img 
              src={mainImg} 
              alt={selectedProduct.name}
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedProduct.name}</p>
            <div className="flex gap-2 mt-1">
              {selectedProduct.category && (
                <Badge variant="outline" className="text-xs">
                  {selectedProduct.category.split(' > ').pop()}
                </Badge>
              )}
              {selectedProduct.color && (
                <Badge variant="secondary" className="text-xs">
                  {selectedProduct.color}
                </Badge>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search for a starting product..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {isOpen && (
        <div className="border rounded-lg bg-popover shadow-lg">
          <ScrollArea className="h-[200px]">
            {filteredProducts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                No products found
              </p>
            ) : (
              <div className="p-1">
                {filteredProducts.map(product => {
                  const images = parseImages(product.images);
                  return (
                    <button
                      key={product.id}
                      className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left transition-colors"
                      onClick={() => handleSelect(product)}
                    >
                      {images[0] ? (
                        <img 
                          src={images[0]} 
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {product.category?.split(' > ').pop()} • {product.color || 'No color'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};