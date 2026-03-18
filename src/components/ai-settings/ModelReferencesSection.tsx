import { useState, useRef, useEffect } from 'react';
import { User, Mountain, Trash2, Loader2, X, Plus, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProductCollections } from '@/hooks/useProductCollections';
import { useProductCategories } from '@/hooks/useProductCategories';

interface ModelReference {
  id: string;
  url: string;
  name: string;
  type: 'model' | 'environment';
  categories?: string[];
  collections?: string[];
}

export const ModelReferencesSection = () => {
  const { toast } = useToast();
  const modelInputRef = useRef<HTMLInputElement>(null);
  const envInputRef = useRef<HTMLInputElement>(null);

  const { collections } = useProductCollections();
  const { categories } = useProductCategories();

  const [modelReferences, setModelReferences] = useState<ModelReference[]>([]);
  const [environmentReferences, setEnvironmentReferences] = useState<ModelReference[]>([]);
  const [uploading, setUploading] = useState<'model' | 'environment' | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<string | null>(null);
  const [editingRef, setEditingRef] = useState<string | null>(null);

  // Filter states
  const [modelCollectionFilter, setModelCollectionFilter] = useState<string>('all');
  const [envCollectionFilter, setEnvCollectionFilter] = useState<string>('all');
  const [modelCategoryFilter, setModelCategoryFilter] = useState<string>('all');
  const [envCategoryFilter, setEnvCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'ai_generation_references')
        .single();

      if (data?.value) {
        const settings = data.value as any;
        if (settings.modelReferences) setModelReferences(settings.modelReferences);
        if (settings.environmentReferences) setEnvironmentReferences(settings.environmentReferences);
        if (settings.activeModel) setActiveModel(settings.activeModel);
        if (settings.activeEnvironment) setActiveEnvironment(settings.activeEnvironment);
      }
    } catch (err) {
      console.log('No existing references found');
    }
  };

  const saveReferences = async (
    models: ModelReference[], 
    environments: ModelReference[],
    activeModelId: string | null,
    activeEnvId: string | null
  ) => {
    try {
      await supabase
        .from('app_settings')
        .upsert([{
          id: 'ai_generation_references',
          value: { 
            modelReferences: models, 
            environmentReferences: environments,
            activeModel: activeModelId,
            activeEnvironment: activeEnvId
          } as any,
          updated_at: new Date().toISOString()
        }]);
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'model' | 'environment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `ai-references/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const newRef: ModelReference = {
        id: Date.now().toString(),
        url: urlData.publicUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type,
        categories: [],
        collections: []
      };

      if (type === 'model') {
        const updated = [...modelReferences, newRef];
        setModelReferences(updated);
        const newActiveModel = modelReferences.length === 0 ? newRef.id : activeModel;
        if (modelReferences.length === 0) setActiveModel(newRef.id);
        saveReferences(updated, environmentReferences, newActiveModel, activeEnvironment);
        setEditingRef(newRef.id); // Open editing for new reference
      } else {
        const updated = [...environmentReferences, newRef];
        setEnvironmentReferences(updated);
        const newActiveEnv = environmentReferences.length === 0 ? newRef.id : activeEnvironment;
        if (environmentReferences.length === 0) setActiveEnvironment(newRef.id);
        saveReferences(modelReferences, updated, activeModel, newActiveEnv);
        setEditingRef(newRef.id);
      }

      toast({ title: `${type === 'model' ? 'Model' : 'Environment'} reference uploaded!` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(null);
      if (type === 'model' && modelInputRef.current) modelInputRef.current.value = '';
      if (type === 'environment' && envInputRef.current) envInputRef.current.value = '';
    }
  };

  const removeReference = async (id: string, type: 'model' | 'environment') => {
    if (type === 'model') {
      const updated = modelReferences.filter(r => r.id !== id);
      setModelReferences(updated);
      const newActive = activeModel === id ? (updated[0]?.id || null) : activeModel;
      setActiveModel(newActive);
      saveReferences(updated, environmentReferences, newActive, activeEnvironment);
    } else {
      const updated = environmentReferences.filter(r => r.id !== id);
      setEnvironmentReferences(updated);
      const newActive = activeEnvironment === id ? (updated[0]?.id || null) : activeEnvironment;
      setActiveEnvironment(newActive);
      saveReferences(modelReferences, updated, activeModel, newActive);
    }
    toast({ title: 'Reference removed' });
  };

  const setAsActive = (id: string, type: 'model' | 'environment') => {
    if (type === 'model') {
      setActiveModel(id);
      saveReferences(modelReferences, environmentReferences, id, activeEnvironment);
    } else {
      setActiveEnvironment(id);
      saveReferences(modelReferences, environmentReferences, activeModel, id);
    }
    toast({ title: `Active ${type} updated` });
  };

  const updateReferenceSegmentation = (
    id: string, 
    type: 'model' | 'environment', 
    field: 'categories' | 'collections', 
    value: string[]
  ) => {
    if (type === 'model') {
      const updated = modelReferences.map(r => 
        r.id === id ? { ...r, [field]: value } : r
      );
      setModelReferences(updated);
      saveReferences(updated, environmentReferences, activeModel, activeEnvironment);
    } else {
      const updated = environmentReferences.map(r => 
        r.id === id ? { ...r, [field]: value } : r
      );
      setEnvironmentReferences(updated);
      saveReferences(modelReferences, updated, activeModel, activeEnvironment);
    }
  };

  const toggleCategory = (refId: string, type: 'model' | 'environment', category: string) => {
    const refs = type === 'model' ? modelReferences : environmentReferences;
    const ref = refs.find(r => r.id === refId);
    if (!ref) return;

    const currentCategories = ref.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    updateReferenceSegmentation(refId, type, 'categories', newCategories);
  };

  const toggleCollection = (refId: string, type: 'model' | 'environment', collection: string) => {
    const refs = type === 'model' ? modelReferences : environmentReferences;
    const ref = refs.find(r => r.id === refId);
    if (!ref) return;

    const currentCollections = ref.collections || [];
    const newCollections = currentCollections.includes(collection)
      ? currentCollections.filter(c => c !== collection)
      : [...currentCollections, collection];
    
    updateReferenceSegmentation(refId, type, 'collections', newCollections);
  };

  const filterReferences = (refs: ModelReference[], collectionFilter: string, categoryFilter: string) => {
    return refs.filter(ref => {
      const matchesCollection = collectionFilter === 'all' || 
        (ref.collections && ref.collections.includes(collectionFilter)) ||
        (!ref.collections?.length && collectionFilter === 'uncategorized');
      const matchesCategory = categoryFilter === 'all' || 
        (ref.categories && ref.categories.includes(categoryFilter)) ||
        (!ref.categories?.length && categoryFilter === 'uncategorized');
      return matchesCollection && matchesCategory;
    });
  };

  const filteredModelRefs = filterReferences(modelReferences, modelCollectionFilter, modelCategoryFilter);
  const filteredEnvRefs = filterReferences(environmentReferences, envCollectionFilter, envCategoryFilter);

  const ReferenceCard = ({ reference, type }: { reference: ModelReference; type: 'model' | 'environment' }) => {
    const isActive = type === 'model' ? activeModel === reference.id : activeEnvironment === reference.id;
    const isEditing = editingRef === reference.id;
    const aspectClass = type === 'model' ? 'aspect-[3/4]' : 'aspect-video';

    return (
      <div className="space-y-2">
        <div 
          className={`relative group ${aspectClass} rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
            isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setAsActive(reference.id, type)}
        >
          <img src={reference.url} alt={reference.name} className="w-full h-full object-cover" />
          {isActive && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              Active
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setEditingRef(isEditing ? null : reference.id);
              }}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                removeReference(reference.id, type);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs truncate">{reference.name}</p>
            {((reference.categories?.length || 0) > 0 || (reference.collections?.length || 0) > 0) && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {reference.categories?.slice(0, 2).map(cat => (
                  <Badge key={cat} variant="secondary" className="text-[9px] py-0 px-1">
                    {cat}
                  </Badge>
                ))}
                {reference.collections?.slice(0, 2).map(col => (
                  <Badge key={col} variant="outline" className="text-[9px] py-0 px-1 bg-white/20">
                    {col}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Segmentation Editor */}
        {isEditing && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Assign Collections & Categories</Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingRef(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Collections */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> Collections
              </Label>
              <div className="flex flex-wrap gap-1.5">
              {collections.map(col => {
                const isSelected = reference.collections?.includes(col.name) || false;
                return (
                  <Badge
                    key={col.name}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleCollection(reference.id, type, col.name)}
                  >
                    {col.name}
                  </Badge>
                );
              })}
              {collections.length === 0 && (
                <span className="text-xs text-muted-foreground">No collections available</span>
              )}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Categories
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {categories.map(cat => {
                const isSelected = reference.categories?.includes(cat.name) || false;
                return (
                  <Badge
                    key={cat.name}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleCategory(reference.id, type, cat.name)}
                  >
                    {cat.name}
                  </Badge>
                );
              })}
              {categories.length === 0 && (
                <span className="text-xs text-muted-foreground">No categories available</span>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const FilterBar = ({ 
    collectionFilter, 
    setCollectionFilter,
    categoryFilter,
    setCategoryFilter
  }: {
    collectionFilter: string;
    setCollectionFilter: (v: string) => void;
    categoryFilter: string;
    setCategoryFilter: (v: string) => void;
  }) => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select value={collectionFilter} onValueChange={setCollectionFilter}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <FolderOpen className="w-3 h-3 mr-1" />
          <SelectValue placeholder="Collection" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Collections</SelectItem>
          <SelectItem value="uncategorized">Uncategorized</SelectItem>
          {collections.map(col => (
            <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="uncategorized">Uncategorized</SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Model & Environment References
        </CardTitle>
        <CardDescription>
          Upload reference images to guide AI generation. Segment by category or collection to use different references for different products.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="models" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="models" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Model References ({modelReferences.length})
            </TabsTrigger>
            <TabsTrigger value="environments" className="flex items-center gap-2">
              <Mountain className="w-4 h-4" />
              Environment References ({environmentReferences.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <FilterBar
              collectionFilter={modelCollectionFilter}
              setCollectionFilter={setModelCollectionFilter}
              categoryFilter={modelCategoryFilter}
              setCategoryFilter={setModelCategoryFilter}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredModelRefs.map(item => (
                <ReferenceCard key={item.id} reference={item} type="model" />
              ))}

              {/* Upload button */}
              <div 
                className="aspect-[3/4] rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => modelInputRef.current?.click()}
              >
                {uploading === 'model' ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Add Model</span>
                  </>
                )}
              </div>
            </div>

            <input
              ref={modelInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, 'model')}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground">
              Upload full-body photos of models and assign them to categories/collections. 
              The AI will automatically select matching references based on product attributes.
            </p>
          </TabsContent>

          <TabsContent value="environments" className="space-y-4">
            <FilterBar
              collectionFilter={envCollectionFilter}
              setCollectionFilter={setEnvCollectionFilter}
              categoryFilter={envCategoryFilter}
              setCategoryFilter={setEnvCategoryFilter}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredEnvRefs.map(item => (
                <ReferenceCard key={item.id} reference={item} type="environment" />
              ))}

              {/* Upload button */}
              <div 
                className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => envInputRef.current?.click()}
              >
                {uploading === 'environment' ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Add Environment</span>
                  </>
                )}
              </div>
            </div>

            <input
              ref={envInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, 'environment')}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground">
              Upload background/environment photos and assign them to categories/collections for targeted AI generation.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
