import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { useActivations, Activation, ActivationType, ActivationContent } from '@/hooks/useActivations';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useProductCollections } from '@/hooks/useProductCollections';
import { ActivationEditor } from '@/components/activations/ActivationEditor';
import { ActivationRenderer } from '@/components/activations/ActivationRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Edit, Eye, Image, Video, Layout, Code, Gift, Clock, Euro } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

const ActivationsPage = () => {
  const { activations, loading, createActivation, updateActivation, deleteActivation } = useActivations();
  const { categories: productCategories } = useProductCategories();
  const { collections: productCollections } = useProductCollections();
  const [showEditor, setShowEditor] = useState(false);
  const [editingActivation, setEditingActivation] = useState<Activation | null>(null);
  const [previewActivation, setPreviewActivation] = useState<Activation | null>(null);
  const { toast } = useToast();

  const handleCreate = async (
    name: string, 
    type: ActivationType, 
    content: ActivationContent, 
    categories?: string[],
    collections?: string[],
    priceMin?: number | null,
    priceMax?: number | null,
    startDate?: Date | null,
    endDate?: Date | null,
    hideTitle?: boolean,
    fullWidth?: boolean
  ) => {
    const result = await createActivation(name, type, content, categories, collections, priceMin, priceMax, startDate, endDate);
    if (result.success && result.activation && (hideTitle || fullWidth)) {
      await updateActivation(result.activation.id, { hide_title: hideTitle, full_width: fullWidth });
    }
    if (result.success) {
      toast({ title: 'Created', description: 'Activation created successfully' });
      setShowEditor(false);
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to create activation', variant: 'destructive' });
    }
  };

  const handleUpdate = async (
    name: string, 
    type: ActivationType, 
    content: ActivationContent, 
    categories?: string[],
    collections?: string[],
    priceMin?: number | null,
    priceMax?: number | null,
    startDate?: Date | null,
    endDate?: Date | null,
    hideTitle?: boolean,
    fullWidth?: boolean
  ) => {
    if (!editingActivation) return;
    const result = await updateActivation(editingActivation.id, { 
      name, 
      type, 
      content: JSON.parse(JSON.stringify(content)), 
      categories,
      collections,
      price_min: priceMin,
      price_max: priceMax,
      start_date: startDate?.toISOString() || null,
      end_date: endDate?.toISOString() || null,
      hide_title: hideTitle,
      full_width: fullWidth
    });
    if (result.success) {
      toast({ title: 'Updated', description: 'Activation updated successfully' });
      setEditingActivation(null);
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update activation', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteActivation(id);
    if (success) {
      toast({ title: 'Deleted', description: 'Activation deleted successfully' });
    } else {
      toast({ title: 'Error', description: 'Failed to delete activation', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">Activations</span>
          </div>
          <AppHeader />
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-foreground">Activations</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage reusable content modules for product landing pages.
            </p>
          </div>
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Activation
          </Button>
        </div>

        {/* Editor */}
        {showEditor && (
          <div className="mb-8">
            <ActivationEditor
              productCategories={productCategories}
              productCollections={productCollections}
              onSave={handleCreate}
              onCancel={() => setShowEditor(false)}
            />
          </div>
        )}

        {editingActivation && (
          <div className="mb-8">
            <ActivationEditor
              initialName={editingActivation.name}
              initialType={editingActivation.type}
              initialContent={editingActivation.content}
              initialCategories={editingActivation.categories || []}
              initialCollections={editingActivation.collections || []}
              initialPriceMin={editingActivation.price_min}
              initialPriceMax={editingActivation.price_max}
              initialStartDate={editingActivation.start_date ? new Date(editingActivation.start_date) : null}
              initialEndDate={editingActivation.end_date ? new Date(editingActivation.end_date) : null}
              initialHideTitle={editingActivation.hide_title || false}
              initialFullWidth={editingActivation.full_width || false}
              productCategories={productCategories}
              productCollections={productCollections}
              onSave={handleUpdate}
              onCancel={() => setEditingActivation(null)}
              isEditing
            />
          </div>
        )}

        {/* Preview */}
        {previewActivation && (
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preview: {previewActivation.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPreviewActivation(null)}>
                Close Preview
              </Button>
            </CardHeader>
            <CardContent>
              <ActivationRenderer activation={previewActivation} />
            </CardContent>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : activations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No activations yet. Create your first one!
              </p>
              <Button onClick={() => setShowEditor(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Activation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activations.map((activation) => {
              const Icon = typeIcons[activation.type];
              const hasCategories = activation.categories && activation.categories.length > 0;
              const hasPriceRange = activation.price_min !== null || activation.price_max !== null;
              const hasSchedule = activation.start_date || activation.end_date;
              const hasCollections = activation.collections && activation.collections.length > 0;
              
              return (
                <Card key={activation.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{activation.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {typeLabels[activation.type]}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Targeting badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hasCategories && activation.categories!.slice(0, 3).map(cat => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {hasCategories && activation.categories!.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{activation.categories!.length - 3} more
                        </Badge>
                      )}
                      {hasCollections && activation.collections!.slice(0, 2).map(col => (
                        <Badge key={col} variant="secondary" className="text-xs bg-accent/20">
                          📦 {col}
                        </Badge>
                      ))}
                      {hasCollections && activation.collections!.length > 2 && (
                        <Badge variant="secondary" className="text-xs bg-accent/20">
                          +{activation.collections!.length - 2} more
                        </Badge>
                      )}
                      {hasPriceRange && (
                        <Badge variant="secondary" className="text-xs">
                          <Euro className="w-3 h-3 mr-1" />
                          {activation.price_min || 0}
                          {activation.price_max ? `-${activation.price_max}` : '+'}
                        </Badge>
                      )}
                      {hasSchedule && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {activation.start_date 
                            ? format(new Date(activation.start_date), 'MMM d') 
                            : 'Now'}
                          {' → '}
                          {activation.end_date 
                            ? format(new Date(activation.end_date), 'MMM d') 
                            : 'Forever'}
                        </Badge>
                      )}
                      {!hasCategories && !hasPriceRange && !hasSchedule && !hasCollections && (
                        <span className="text-xs text-muted-foreground italic">All products</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-4">
                      Created {new Date(activation.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewActivation(activation)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingActivation(activation)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Activation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{activation.name}" and remove it from all products.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(activation.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ActivationsPage;