import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, Save, Loader2, X } from 'lucide-react';

interface CarouselConfig {
  categories: string[];
  nameFilter: string;
  featuredProductIds: string[];
  excludedProductIds: string[];
  linkToBrandWebsite: boolean;
}

const DEFAULT: CarouselConfig = {
  categories: [],
  nameFilter: '',
  featuredProductIds: [],
  excludedProductIds: [],
  linkToBrandWebsite: true,
};

interface Props {
  settingsKey: string;
  title: string;
  description: string;
}

interface ProductOption {
  id: string;
  name: string;
  product_code: string | null;
}

const FeaturedCarouselSettings = ({ settingsKey, title, description }: Props) => {
  const [config, setConfig] = useState<CarouselConfig>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [searchFeatured, setSearchFeatured] = useState('');
  const [searchExcluded, setSearchExcluded] = useState('');
  const { toast } = useToast();

  // Load settings + categories + products
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', settingsKey).single().then(({ data }) => {
      if (data?.value) setConfig({ ...DEFAULT, ...(data.value as any) });
    });
    supabase.from('products').select('category').not('category', 'is', null).then(({ data }) => {
      if (data) {
        const cats = [...new Set(data.map(d => d.category!).filter(Boolean))].sort();
        setAllCategories(cats);
      }
    });
    supabase.from('products').select('id, name, product_code').order('name').then(({ data }) => {
      if (data) setAllProducts(data);
    });
  }, [settingsKey]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('app_settings').upsert({ id: settingsKey, value: config as any });
    setSaving(false);
    toast({ title: 'Saved', description: `${title} settings updated.` });
  };

  const toggleCategory = (cat: string) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const addFeatured = (id: string) => {
    if (!config.featuredProductIds.includes(id)) {
      setConfig(prev => ({ ...prev, featuredProductIds: [...prev.featuredProductIds, id] }));
    }
    setSearchFeatured('');
  };

  const removeFeatured = (id: string) => {
    setConfig(prev => ({ ...prev, featuredProductIds: prev.featuredProductIds.filter(i => i !== id) }));
  };

  const addExcluded = (id: string) => {
    if (!config.excludedProductIds.includes(id)) {
      setConfig(prev => ({ ...prev, excludedProductIds: [...prev.excludedProductIds, id] }));
    }
    setSearchExcluded('');
  };

  const removeExcluded = (id: string) => {
    setConfig(prev => ({ ...prev, excludedProductIds: prev.excludedProductIds.filter(i => i !== id) }));
  };

  const getProductName = (id: string) => {
    const p = allProducts.find(p => p.id === id);
    return p ? p.name : id.slice(0, 8);
  };

  const filteredForFeatured = searchFeatured.length > 1
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchFeatured.toLowerCase())).slice(0, 6)
    : [];

  const filteredForExcluded = searchExcluded.length > 1
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchExcluded.toLowerCase())).slice(0, 6)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Categories</Label>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(cat => (
              <Badge
                key={cat}
                variant={config.categories.includes(cat) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Name filter */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Name Filter (substring match)</Label>
          <Input
            value={config.nameFilter}
            onChange={e => setConfig(prev => ({ ...prev, nameFilter: e.target.value }))}
            placeholder='e.g. "Soccer"'
            className="max-w-xs"
          />
        </div>

        {/* Featured products */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Featured Products (shown first)</Label>
          <div className="flex flex-wrap gap-1 mb-2">
            {config.featuredProductIds.map(id => (
              <Badge key={id} variant="secondary" className="gap-1">
                {getProductName(id)}
                <X className="w-3 h-3 cursor-pointer" onClick={() => removeFeatured(id)} />
              </Badge>
            ))}
          </div>
          <div className="relative max-w-xs">
            <Input
              value={searchFeatured}
              onChange={e => setSearchFeatured(e.target.value)}
              placeholder="Search products to feature..."
            />
            {filteredForFeatured.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-background border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredForFeatured.map(p => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => addFeatured(p.id)}
                  >
                    {p.name} {p.product_code && <span className="text-muted-foreground">({p.product_code})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Excluded products */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Excluded Products</Label>
          <div className="flex flex-wrap gap-1 mb-2">
            {config.excludedProductIds.map(id => (
              <Badge key={id} variant="destructive" className="gap-1">
                {getProductName(id)}
                <X className="w-3 h-3 cursor-pointer" onClick={() => removeExcluded(id)} />
              </Badge>
            ))}
          </div>
          <div className="relative max-w-xs">
            <Input
              value={searchExcluded}
              onChange={e => setSearchExcluded(e.target.value)}
              placeholder="Search products to exclude..."
            />
            {filteredForExcluded.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-background border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredForExcluded.map(p => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => addExcluded(p.id)}
                  >
                    {p.name} {p.product_code && <span className="text-muted-foreground">({p.product_code})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Link destination toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Link to brand website</Label>
            <p className="text-xs text-muted-foreground">When enabled, tapping a product opens the brand's website instead of staying in-app</p>
          </div>
          <Switch
            checked={config.linkToBrandWebsite}
            onCheckedChange={v => setConfig(prev => ({ ...prev, linkToBrandWebsite: v }))}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeaturedCarouselSettings;
