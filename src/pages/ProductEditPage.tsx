import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useProducts, Product } from '@/hooks/useProducts';
import { useActivations, useProductActivations, Activation, ActivationType, ActivationContent } from '@/hooks/useActivations';
import { ActivationEditor } from '@/components/activations/ActivationEditor';
import { ActivationRenderer } from '@/components/activations/ActivationRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, Image, Video, Layout, Code, Save, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const typeIcons: Record<ActivationType, React.ElementType> = {
  text_image: Image,
  video: Video,
  banner: Layout,
  custom_html: Code,
  lead_capture: Gift,
};

const typeLabels: Record<ActivationType, string> = {
  text_image: 'Text & Image',
  video: 'Video',
  banner: 'Banner / CTA',
  custom_html: 'Custom HTML',
  lead_capture: 'Lead Capture',
};

const ProductEditPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getProductBySlug, updateProductCategory, getUsedCategories, products } = useProducts();
  const { activations, createActivation, getUsedCategories: getActivationCategories } = useActivations();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [previewActivation, setPreviewActivation] = useState<Activation | null>(null);
  const [productCategory, setProductCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const { toast } = useToast();

  const {
    productActivations,
    addActivationToProduct,
    removeActivationFromProduct,
    loading: paLoading,
  } = useProductActivations(product?.id || '');

  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) return;
      setLoading(true);
      const p = await getProductBySlug(slug);
      setProduct(p);
      setProductCategory(p?.category || '');
      setLoading(false);
    };
    loadProduct();
  }, [slug]);

  const handleCreateActivation = async (
    name: string,
    type: ActivationType,
    content: ActivationContent
  ) => {
    const result = await createActivation(name, type, content);
    if (result.success && result.activation && product) {
      await addActivationToProduct(result.activation.id);
      toast({ title: 'Created', description: 'Activation created and added to product' });
      setShowEditor(false);
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to create activation', variant: 'destructive' });
    }
  };

  const handleAddExisting = async (activationId: string) => {
    const result = await addActivationToProduct(activationId);
    if (result.success) {
      toast({ title: 'Added', description: 'Activation added to product' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to add activation', variant: 'destructive' });
    }
  };

  const handleRemove = async (productActivationId: string) => {
    const success = await removeActivationFromProduct(productActivationId);
    if (success) {
      toast({ title: 'Removed', description: 'Activation removed from product' });
    }
  };

  const handleSaveCategory = async () => {
    if (!product) return;
    setSavingCategory(true);
    const success = await updateProductCategory(product.id, productCategory || null);
    setSavingCategory(false);
    if (success) {
      setProduct({ ...product, category: productCategory || null });
      toast({ title: 'Saved', description: 'Product category updated' });
    } else {
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    }
  };

  // Combine categories from both products and activations for suggestions
  const allCategories = [...new Set([...getUsedCategories(), ...getActivationCategories()])].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-light text-foreground mb-4">Product not found</h1>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  const usedActivationIds = new Set(productActivations.map(pa => pa.activation_id));
  const availableActivations = activations.filter(a => !usedActivationIds.has(a.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <AppHeader>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </AppHeader>
          <Button asChild variant="outline" size="sm">
            <Link to={`/product/${slug}`}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Product Category Section */}
        <Card className="mb-8">
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Product Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="category" className="sr-only">Category</Label>
                <Input
                  id="category"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  placeholder="e.g. shoes, jackets, accessories"
                />
              </div>
              <Button onClick={handleSaveCategory} disabled={savingCategory}>
                <Save className="w-4 h-4 mr-2" />
                {savingCategory ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {allCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allCategories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setProductCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Set a category to auto-display matching activations on the product page.
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Current Activations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-light text-foreground">Edit Activations</h1>
              <Button onClick={() => setShowEditor(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Activation
              </Button>
            </div>

            {showEditor && (
              <ActivationEditor
                onSave={handleCreateActivation}
                onCancel={() => setShowEditor(false)}
              />
            )}

            {paLoading ? (
              <div className="text-muted-foreground">Loading activations...</div>
            ) : productActivations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No activations added yet. Create one or add from existing.
                  </p>
                  <Button onClick={() => setShowEditor(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Activation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {productActivations.map((pa, index) => {
                  if (!pa.activation) return null;
                  const Icon = typeIcons[pa.activation.type];
                  return (
                    <Card key={pa.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <CardTitle className="text-base">{pa.activation.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {typeLabels[pa.activation.type]}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewActivation(pa.activation!)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(pa.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Preview Modal */}
            {previewActivation && (
              <Card className="mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Preview: {previewActivation.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewActivation(null)}>
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <ActivationRenderer activation={previewActivation} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Available Activations */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Available Activations</h2>
            {availableActivations.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    All activations are already added or none exist yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {availableActivations.map((activation) => {
                  const Icon = typeIcons[activation.type];
                  return (
                    <Card key={activation.id} className="cursor-pointer hover:bg-secondary/30 transition-colors">
                      <CardContent className="py-3 flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activation.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabels[activation.type]}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddExisting(activation.id)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <Link to="/activations">
                Manage All Activations
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductEditPage;
