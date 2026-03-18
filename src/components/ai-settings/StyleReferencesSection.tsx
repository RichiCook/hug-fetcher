import { useState, useRef, useEffect } from 'react';
import { Sparkles, Trash2, Loader2, Plus, Instagram, Link2, ExternalLink, FolderOpen, X, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProductCollections } from '@/hooks/useProductCollections';
import { useProductCategories } from '@/hooks/useProductCategories';

interface StyleReference {
  id: string;
  url: string;
  name: string;
  source: 'upload' | 'url';
  categories?: string[];
  collections?: string[];
  styleDominantCategories?: string[];
}

interface SocialFeed {
  id: string;
  platform: 'instagram' | 'pinterest';
  handle: string;
  connected: boolean;
  categories?: string[];
  collections?: string[];
}

const STYLE_PRESETS = [
  { id: 'editorial', name: 'Editorial', description: 'High-fashion magazine style' },
  { id: 'romantic', name: 'Romantic', description: 'Soft, feminine, dreamy' },
  { id: 'bold', name: 'Bold & Confident', description: 'Strong poses, dramatic lighting' },
  { id: 'minimal', name: 'Minimalist', description: 'Clean, simple, modern' },
  { id: 'vintage', name: 'Vintage Glamour', description: 'Classic, timeless elegance' },
  { id: 'boudoir', name: 'Boudoir', description: 'Intimate, soft lighting, personal' },
];

export const StyleReferencesSection = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { collections } = useProductCollections();
  const { categories } = useProductCategories();

  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [socialFeeds, setSocialFeeds] = useState<SocialFeed[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'pinterest'>('instagram');
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [editingFeed, setEditingFeed] = useState<string | null>(null);

  // Filter states
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'style_references')
        .single();

      if (data?.value) {
        const settings = data.value as any;
        if (settings.styleReferences) setStyleReferences(settings.styleReferences);
        if (settings.selectedPresets) setSelectedPresets(settings.selectedPresets);
        if (settings.socialFeeds) setSocialFeeds(settings.socialFeeds);
      }
    } catch (err) {
      console.log('No existing style settings found');
    }
  };

  const saveSettings = async (
    refs: StyleReference[], 
    presets: string[], 
    feeds: SocialFeed[]
  ) => {
    try {
      await supabase
        .from('app_settings')
        .upsert([{
          id: 'style_references',
          value: { 
            styleReferences: refs, 
            selectedPresets: presets,
            socialFeeds: feeds
          } as any,
          updated_at: new Date().toISOString()
        }]);
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `style-${Date.now()}.${fileExt}`;
      const filePath = `ai-references/style/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const newRef: StyleReference = {
        id: Date.now().toString(),
        url: urlData.publicUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        source: 'upload',
        categories: [],
        collections: []
      };

      const updated = [...styleReferences, newRef];
      setStyleReferences(updated);
      saveSettings(updated, selectedPresets, socialFeeds);
      setEditingRef(newRef.id);
      toast({ title: 'Style reference uploaded!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addImageFromUrl = () => {
    if (!imageUrl.trim()) return;

    const newRef: StyleReference = {
      id: Date.now().toString(),
      url: imageUrl.trim(),
      name: 'External Image',
      source: 'url',
      categories: [],
      collections: []
    };

    const updated = [...styleReferences, newRef];
    setStyleReferences(updated);
    saveSettings(updated, selectedPresets, socialFeeds);
    setImageUrl('');
    setEditingRef(newRef.id);
    toast({ title: 'Style reference added!' });
  };

  const removeReference = (id: string) => {
    const updated = styleReferences.filter(r => r.id !== id);
    setStyleReferences(updated);
    saveSettings(updated, selectedPresets, socialFeeds);
    toast({ title: 'Reference removed' });
  };

  const togglePreset = (presetId: string) => {
    const updated = selectedPresets.includes(presetId)
      ? selectedPresets.filter(p => p !== presetId)
      : [...selectedPresets, presetId];
    setSelectedPresets(updated);
    saveSettings(styleReferences, updated, socialFeeds);
  };

  const addSocialFeed = () => {
    if (!newHandle.trim()) return;

    const newFeed: SocialFeed = {
      id: Date.now().toString(),
      platform: selectedPlatform,
      handle: newHandle.trim().replace('@', ''),
      connected: false,
      categories: [],
      collections: []
    };

    const updated = [...socialFeeds, newFeed];
    setSocialFeeds(updated);
    saveSettings(styleReferences, selectedPresets, updated);
    setNewHandle('');
    setEditingFeed(newFeed.id);
    toast({ 
      title: 'Social feed added',
      description: 'Note: Social feed integration requires additional setup.'
    });
  };

  const removeSocialFeed = (id: string) => {
    const updated = socialFeeds.filter(f => f.id !== id);
    setSocialFeeds(updated);
    saveSettings(styleReferences, selectedPresets, updated);
  };

  const updateReferenceSegmentation = (id: string, field: 'categories' | 'collections' | 'styleDominantCategories', value: string[]) => {
    const updated = styleReferences.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    );
    setStyleReferences(updated);
    saveSettings(updated, selectedPresets, socialFeeds);
  };

  const toggleStyleDominant = (refId: string, category: string) => {
    const ref = styleReferences.find(r => r.id === refId);
    if (!ref) return;
    const current = ref.styleDominantCategories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateReferenceSegmentation(refId, 'styleDominantCategories', updated);
  };

  const updateFeedSegmentation = (id: string, field: 'categories' | 'collections', value: string[]) => {
    const updated = socialFeeds.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    );
    setSocialFeeds(updated);
    saveSettings(styleReferences, selectedPresets, updated);
  };

  const toggleRefCategory = (refId: string, category: string) => {
    const ref = styleReferences.find(r => r.id === refId);
    if (!ref) return;
    const current = ref.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateReferenceSegmentation(refId, 'categories', updated);
  };

  const toggleRefCollection = (refId: string, collection: string) => {
    const ref = styleReferences.find(r => r.id === refId);
    if (!ref) return;
    const current = ref.collections || [];
    const updated = current.includes(collection)
      ? current.filter(c => c !== collection)
      : [...current, collection];
    updateReferenceSegmentation(refId, 'collections', updated);
  };

  const toggleFeedCategory = (feedId: string, category: string) => {
    const feed = socialFeeds.find(f => f.id === feedId);
    if (!feed) return;
    const current = feed.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateFeedSegmentation(feedId, 'categories', updated);
  };

  const toggleFeedCollection = (feedId: string, collection: string) => {
    const feed = socialFeeds.find(f => f.id === feedId);
    if (!feed) return;
    const current = feed.collections || [];
    const updated = current.includes(collection)
      ? current.filter(c => c !== collection)
      : [...current, collection];
    updateFeedSegmentation(feedId, 'collections', updated);
  };

  const filterReferences = (refs: StyleReference[]) => {
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

  const filterFeeds = (feeds: SocialFeed[]) => {
    return feeds.filter(feed => {
      const matchesCollection = collectionFilter === 'all' || 
        (feed.collections && feed.collections.includes(collectionFilter)) ||
        (!feed.collections?.length && collectionFilter === 'uncategorized');
      const matchesCategory = categoryFilter === 'all' || 
        (feed.categories && feed.categories.includes(categoryFilter)) ||
        (!feed.categories?.length && categoryFilter === 'uncategorized');
      return matchesCollection && matchesCategory;
    });
  };

  const filteredRefs = filterReferences(styleReferences);
  const filteredFeeds = filterFeeds(socialFeeds);

  const SegmentationEditor = ({ 
    itemCollections,
    itemCategories,
    styleDominantCategories,
    onToggleCollection,
    onToggleCategory,
    onToggleStyleDominant,
    onClose 
  }: {
    itemCollections: string[];
    itemCategories: string[];
    styleDominantCategories?: string[];
    onToggleCollection: (col: string) => void;
    onToggleCategory: (cat: string) => void;
    onToggleStyleDominant?: (cat: string) => void;
    onClose: () => void;
  }) => (
    <div className="p-3 rounded-lg border bg-muted/30 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Assign Collections & Categories</Label>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <FolderOpen className="w-3 h-3" /> Collections
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {collections.map(col => (
            <Badge
              key={col.name}
              variant={itemCollections.includes(col.name) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onToggleCollection(col.name)}
            >
              {col.name}
            </Badge>
          ))}
          {collections.length === 0 && (
            <span className="text-xs text-muted-foreground">No collections available</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          Categories
        </Label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {categories.map(cat => {
            const isAssigned = itemCategories.includes(cat.name);
            const isDominant = styleDominantCategories?.includes(cat.name);
            return (
              <div key={cat.name} className="flex items-center gap-0.5">
                <Badge
                  variant={isAssigned ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => onToggleCategory(cat.name)}
                >
                  {cat.name}
                </Badge>
                {isAssigned && onToggleStyleDominant && (
                  <button
                    onClick={() => onToggleStyleDominant(cat.name)}
                    className={`p-0.5 rounded transition-colors ${
                      isDominant 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-muted-foreground/40 hover:text-yellow-500'
                    }`}
                    title={isDominant ? 'Style-dominant (click to remove)' : 'Make style-dominant'}
                  >
                    <Star className={`w-3 h-3 ${isDominant ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
            );
          })}
          {categories.length === 0 && (
            <span className="text-xs text-muted-foreground">No categories available</span>
          )}
        </div>
        {onToggleStyleDominant && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" /> = Style-dominant: image will closely replicate this style reference's look
          </p>
        )}
      </div>
    </div>
  );

  const FilterBar = () => (
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
          <Sparkles className="w-5 h-5" />
          Style References
        </CardTitle>
        <CardDescription>
          Define the visual style and mood for AI-generated images. Segment by category or collection for targeted styling.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="presets">Style Presets</TabsTrigger>
            <TabsTrigger value="images">Reference Images ({styleReferences.length})</TabsTrigger>
            <TabsTrigger value="social">Social Feeds ({socialFeeds.length})</TabsTrigger>
          </TabsList>

          {/* Style Presets */}
          <TabsContent value="presets" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select one or more style presets to guide the AI's aesthetic direction
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STYLE_PRESETS.map(preset => {
                const isSelected = selectedPresets.includes(preset.id);
                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => togglePreset(preset.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{preset.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Reference Images */}
          <TabsContent value="images" className="space-y-4">
            <FilterBar />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredRefs.map(ref => (
                <div key={ref.id} className="space-y-2">
                  <div className="relative group aspect-square rounded-lg overflow-hidden border">
                    <img src={ref.url} alt={ref.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingRef(editingRef === ref.id ? null : ref.id)}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeReference(ref.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs truncate">{ref.name}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1">
                          {ref.source === 'upload' ? 'Uploaded' : 'URL'}
                        </Badge>
                         {ref.categories?.slice(0, 1).map(cat => (
                          <Badge key={cat} variant="outline" className="text-[9px] py-0 px-1 bg-white/20">
                            {ref.styleDominantCategories?.includes(cat) && (
                              <Star className="w-2 h-2 text-yellow-400 fill-yellow-400 mr-0.5" />
                            )}
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {editingRef === ref.id && (
                    <SegmentationEditor
                      itemCollections={ref.collections || []}
                      itemCategories={ref.categories || []}
                      styleDominantCategories={ref.styleDominantCategories || []}
                      onToggleCollection={(col) => toggleRefCollection(ref.id, col)}
                      onToggleCategory={(cat) => toggleRefCategory(ref.id, cat)}
                      onToggleStyleDominant={(cat) => toggleStyleDominant(ref.id, cat)}
                      onClose={() => setEditingRef(null)}
                    />
                  )}
                </div>
              ))}

              {/* Upload button */}
              <div 
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Upload Image</span>
                  </>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="border-t border-border my-4" />

            {/* Add from URL */}
            <div className="space-y-2">
              <Label>Add from URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button onClick={addImageFromUrl} disabled={!imageUrl.trim()}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload or link to images that represent your desired aesthetic. Assign categories/collections for targeted styling.
            </p>
          </TabsContent>

          {/* Social Feeds */}
          <TabsContent value="social" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect social media accounts to use their aesthetic as style inspiration (coming soon)
            </p>

            <FilterBar />

            {/* Add new feed */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex gap-1">
                  <Button
                    variant={selectedPlatform === 'instagram' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPlatform('instagram')}
                  >
                    <Instagram className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={selectedPlatform === 'pinterest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPlatform('pinterest')}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                    </svg>
                  </Button>
                </div>
                <Input
                  placeholder="@username or board URL"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addSocialFeed} disabled={!newHandle.trim()}>
                  Add Feed
                </Button>
              </div>
            </div>

            {/* Connected feeds */}
            {filteredFeeds.length > 0 && (
              <div className="space-y-2">
                {filteredFeeds.map(feed => (
                  <div key={feed.id}>
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        {feed.platform === 'instagram' ? (
                          <Instagram className="w-5 h-5" />
                        ) : (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                          </svg>
                        )}
                        <div>
                          <p className="font-medium text-sm">@{feed.handle}</p>
                          <div className="flex gap-1 items-center flex-wrap">
                            <Badge variant={feed.connected ? 'default' : 'secondary'} className="text-xs">
                              {feed.connected ? 'Connected' : 'Pending Setup'}
                            </Badge>
                            {feed.categories?.slice(0, 2).map(cat => (
                              <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setEditingFeed(editingFeed === feed.id ? null : feed.id)}
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a 
                            href={feed.platform === 'instagram' 
                              ? `https://instagram.com/${feed.handle}` 
                              : `https://pinterest.com/${feed.handle}`
                            } 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/20"
                          onClick={() => removeSocialFeed(feed.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {editingFeed === feed.id && (
                      <SegmentationEditor
                        itemCollections={feed.collections || []}
                        itemCategories={feed.categories || []}
                        onToggleCollection={(col) => toggleFeedCollection(feed.id, col)}
                        onToggleCategory={(cat) => toggleFeedCategory(feed.id, cat)}
                        onClose={() => setEditingFeed(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Social feed integration allows the AI to analyze the visual style of your favorite accounts. 
              Assign categories/collections to use different feeds for different product types.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
