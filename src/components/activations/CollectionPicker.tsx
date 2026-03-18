import { useMemo } from 'react';
import { Check, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CollectionData } from '@/hooks/useProductCollections';

interface CollectionPickerProps {
  collections: CollectionData[];
  selectedCollections: string[];
  onToggleCollection: (collection: string) => void;
  onRemoveCollection: (collection: string) => void;
}

export const CollectionPicker = ({
  collections,
  selectedCollections,
  onToggleCollection,
  onRemoveCollection,
}: CollectionPickerProps) => {
  const totalProducts = useMemo(() => 
    collections.reduce((sum, c) => sum + c.count, 0),
    [collections]
  );

  if (collections.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        No collections found. Collections are extracted from product data during scraping.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Collection Grid */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-primary" />
          <span className="font-medium">Collections</span>
          <Badge variant="secondary" className="text-xs">
            {collections.length} collections • {totalProducts} products
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {collections.map((collection) => {
            const isSelected = selectedCollections.includes(collection.name);
            return (
              <Badge
                key={collection.name}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 text-sm py-1.5",
                  isSelected && "ring-2 ring-primary/20"
                )}
                onClick={() => onToggleCollection(collection.name)}
              >
                {isSelected && <Check className="w-3 h-3 mr-1" />}
                {collection.name} ({collection.count})
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Selected Collections Summary */}
      {selectedCollections.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium mb-2">
            Selected ({selectedCollections.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedCollections.map((col) => (
              <Badge
                key={col}
                variant="default"
                className="cursor-pointer"
                onClick={() => onRemoveCollection(col)}
              >
                {col} ✕
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
