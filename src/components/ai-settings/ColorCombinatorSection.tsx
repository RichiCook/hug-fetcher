import { useState, useRef, useEffect } from 'react';
import { Palette, Check, Info, Upload, Trash2, Plus, Tag, FolderOpen, X, ImageIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useProductCollections } from '@/hooks/useProductCollections';

interface ColorRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface ColorPairing {
  color1: string;
  color2: string;
  harmony: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
}

interface ColorConfig {
  id: string;
  name: string;
  harmonyRules: ColorRule[];
  excludedColors: string[];
  preferredPairings: string[][];
  referenceImages: ColorReferenceImage[];
  categories: string[];
  collections: string[];
}

interface ColorReferenceImage {
  id: string;
  url: string;
  name: string;
}

const DEFAULT_HARMONY_RULES: ColorRule[] = [
  { id: 'monochromatic', name: 'Monochromatic', description: 'Items within the same color family', enabled: true },
  { id: 'complementary', name: 'Complementary', description: 'Contrasting colors (e.g., black & white)', enabled: true },
  { id: 'analogous', name: 'Analogous', description: 'Adjacent colors on the color wheel', enabled: true },
  { id: 'neutral_accent', name: 'Neutral + Accent', description: 'Neutral base with a pop of color', enabled: true },
  { id: 'tonal', name: 'Tonal Variations', description: 'Different shades of similar hues', enabled: true },
];

const COLOR_WHEEL = [
  { name: 'nero', display: 'Nero', bg: 'bg-gray-900', text: 'text-white' },
  { name: 'bianco', display: 'Bianco', bg: 'bg-white border', text: 'text-gray-900' },
  { name: 'blu', display: 'Blu', bg: 'bg-blue-700', text: 'text-white' },
  { name: 'rosso', display: 'Rosso', bg: 'bg-red-600', text: 'text-white' },
  { name: 'verde', display: 'Verde', bg: 'bg-green-600', text: 'text-white' },
  { name: 'rosa', display: 'Rosa', bg: 'bg-pink-400', text: 'text-white' },
  { name: 'viola', display: 'Viola', bg: 'bg-purple-600', text: 'text-white' },
  { name: 'arancione', display: 'Arancione', bg: 'bg-orange-500', text: 'text-white' },
  { name: 'giallo', display: 'Giallo', bg: 'bg-yellow-400', text: 'text-gray-900' },
  { name: 'marrone', display: 'Marrone', bg: 'bg-amber-800', text: 'text-white' },
  { name: 'beige', display: 'Beige', bg: 'bg-amber-100 border', text: 'text-gray-900' },
  { name: 'grigio', display: 'Grigio', bg: 'bg-gray-500', text: 'text-white' },
  { name: 'avorio', display: 'Avorio', bg: 'bg-amber-50 border', text: 'text-gray-900' },
  { name: 'cammello', display: 'Cammello', bg: 'bg-amber-600', text: 'text-white' },
];

const PRESET_PAIRINGS: { colors: string[]; name: string }[] = [
  { colors: ['nero', 'bianco'], name: 'Classic B&W' },
  { colors: ['nero', 'rosso'], name: 'Bold Noir' },
  { colors: ['rosa', 'nero'], name: 'Romantic Dark' },
  { colors: ['blu', 'bianco'], name: 'Nautical' },
  { colors: ['beige', 'marrone'], name: 'Earth Tones' },
  { colors: ['viola', 'nero'], name: 'Mystic' },
];

const createDefaultConfig = (id: string, name: string): ColorConfig => ({
  id,
  name,
  harmonyRules: [...DEFAULT_HARMONY_RULES],
  excludedColors: [],
  preferredPairings: [],
  referenceImages: [],
  categories: [],
  collections: []
});

export const ColorCombinatorSection = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { categories } = useProductCategories();
  const { collections } = useProductCollections();
  
  const [configs, setConfigs] = useState<ColorConfig[]>([createDefaultConfig('default', 'Default')]);
  const [activeConfigId, setActiveConfigId] = useState<string>('default');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [newConfigName, setNewConfigName] = useState('');

  const activeConfig = configs.find(c => c.id === activeConfigId) || configs[0];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'color_combinator_settings')
        .single();

      if (data?.value) {
        const settings = data.value as any;
        if (settings.configs && Array.isArray(settings.configs)) {
          setConfigs(settings.configs);
          if (settings.activeConfigId) {
            setActiveConfigId(settings.activeConfigId);
          }
        } else if (settings.harmonyRules) {
          // Migrate old format
          const migratedConfig: ColorConfig = {
            id: 'default',
            name: 'Default',
            harmonyRules: settings.harmonyRules,
            excludedColors: settings.excludedColors || [],
            preferredPairings: settings.preferredPairings || [],
            referenceImages: [],
            categories: [],
            collections: []
          };
          setConfigs([migratedConfig]);
        }
      }
    } catch (err) {
      console.log('No existing color settings found');
    }
  };

  const saveSettings = async (newConfigs: ColorConfig[], newActiveId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert([{
          id: 'color_combinator_settings',
          value: { configs: newConfigs, activeConfigId: newActiveId } as any,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
      toast({ title: 'Color settings saved!' });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (configId: string, updates: Partial<ColorConfig>) => {
    const newConfigs = configs.map(c => 
      c.id === configId ? { ...c, ...updates } : c
    );
    setConfigs(newConfigs);
  };

  const addConfig = () => {
    const newId = Date.now().toString();
    const newConfig = createDefaultConfig(newId, newConfigName || `Config ${configs.length + 1}`);
    const newConfigs = [...configs, newConfig];
    setConfigs(newConfigs);
    setActiveConfigId(newId);
    setNewConfigName('');
    setEditingConfig(newId);
  };

  const deleteConfig = (configId: string) => {
    if (configs.length <= 1) {
      toast({ title: 'Cannot delete', description: 'At least one configuration is required', variant: 'destructive' });
      return;
    }
    const newConfigs = configs.filter(c => c.id !== configId);
    setConfigs(newConfigs);
    if (activeConfigId === configId) {
      setActiveConfigId(newConfigs[0].id);
    }
  };

  const toggleHarmonyRule = (ruleId: string) => {
    const newRules = activeConfig.harmonyRules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    updateConfig(activeConfigId, { harmonyRules: newRules });
  };

  const toggleExcludedColor = (color: string) => {
    const newExcluded = activeConfig.excludedColors.includes(color)
      ? activeConfig.excludedColors.filter(c => c !== color)
      : [...activeConfig.excludedColors, color];
    updateConfig(activeConfigId, { excludedColors: newExcluded });
  };

  const addPresetPairing = (colors: string[]) => {
    const exists = activeConfig.preferredPairings.some(
      p => p.sort().join(',') === colors.sort().join(',')
    );
    if (!exists) {
      updateConfig(activeConfigId, { 
        preferredPairings: [...activeConfig.preferredPairings, colors] 
      });
    }
  };

  const removePairing = (index: number) => {
    const newPairings = activeConfig.preferredPairings.filter((_, i) => i !== index);
    updateConfig(activeConfigId, { preferredPairings: newPairings });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `color-ref-${Date.now()}.${fileExt}`;
      const filePath = `ai-references/colors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const newImage: ColorReferenceImage = {
        id: Date.now().toString(),
        url: urlData.publicUrl,
        name: file.name.replace(/\.[^/.]+$/, '')
      };

      updateConfig(activeConfigId, {
        referenceImages: [...activeConfig.referenceImages, newImage]
      });

      toast({ title: 'Color reference uploaded!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeReferenceImage = (imageId: string) => {
    updateConfig(activeConfigId, {
      referenceImages: activeConfig.referenceImages.filter(img => img.id !== imageId)
    });
  };

  const toggleCategory = (category: string) => {
    const current = activeConfig.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateConfig(activeConfigId, { categories: updated });
  };

  const toggleCollection = (collection: string) => {
    const current = activeConfig.collections || [];
    const updated = current.includes(collection)
      ? current.filter(c => c !== collection)
      : [...current, collection];
    updateConfig(activeConfigId, { collections: updated });
  };

  const getColorStyle = (colorName: string) => {
    const color = COLOR_WHEEL.find(c => c.name === colorName);
    return color || { bg: 'bg-gray-300', text: 'text-gray-900', display: colorName };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Color Combinator
        </CardTitle>
        <CardDescription>
          Define color harmony rules and preferences for AI-generated looks. Create multiple configurations for different segments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Color Configurations</Label>
            <Button variant="outline" size="sm" onClick={addConfig}>
              <Plus className="w-4 h-4 mr-1" /> Add Config
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {configs.map(config => (
              <div key={config.id} className="flex items-center gap-1">
                <Badge
                  variant={activeConfigId === config.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setActiveConfigId(config.id)}
                >
                  {config.name}
                  {(config.categories?.length > 0 || config.collections?.length > 0) && (
                    <span className="ml-1 text-xs opacity-70">
                      ({config.categories?.length || 0}c, {config.collections?.length || 0}col)
                    </span>
                  )}
                </Badge>
                {configs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => deleteConfig(config.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Segmentation for Active Config */}
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Segment: {activeConfig.name}</Label>
            <Input
              value={activeConfig.name}
              onChange={(e) => updateConfig(activeConfigId, { name: e.target.value })}
              className="w-40 h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <FolderOpen className="w-3 h-3" /> Collections
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {collections.map(col => (
                <Badge
                  key={col.name}
                  variant={activeConfig.collections?.includes(col.name) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleCollection(col.name)}
                >
                  {col.name}
                </Badge>
              ))}
              {collections.length === 0 && (
                <span className="text-xs text-muted-foreground">No collections available</span>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Color Reference Images */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Color Reference Images</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Upload images to extract color palettes for AI look generation</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeConfig.referenceImages.map(img => (
              <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeReferenceImage(img.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">{img.name}</p>
                </div>
              </div>
            ))}

            {/* Upload Button */}
            <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </>
              )}
            </label>
          </div>
        </div>

        <Separator />

        {/* Harmony Rules */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Color Harmony Rules</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Enable which color combination strategies the AI should use when creating looks</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid gap-3">
            {activeConfig.harmonyRules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <Label htmlFor={rule.id} className="font-medium cursor-pointer">{rule.name}</Label>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
                <Switch
                  id={rule.id}
                  checked={rule.enabled}
                  onCheckedChange={() => toggleHarmonyRule(rule.id)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Excluded Colors */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Excluded Colors</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Select colors that should never be combined in the same look</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_WHEEL.map(color => {
              const isExcluded = activeConfig.excludedColors.includes(color.name);
              return (
                <Badge
                  key={color.name}
                  className={`cursor-pointer transition-all ${color.bg} ${color.text} ${
                    isExcluded ? 'ring-2 ring-destructive ring-offset-2 opacity-50 line-through' : 'hover:opacity-80'
                  }`}
                  onClick={() => toggleExcludedColor(color.name)}
                >
                  {color.display}
                  {isExcluded && <span className="ml-1">✕</span>}
                </Badge>
              );
            })}
          </div>
          {activeConfig.excludedColors.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Excluded: {activeConfig.excludedColors.join(', ')}
            </p>
          )}
        </div>

        <Separator />

        {/* Preferred Pairings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Preferred Color Pairings</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Add color combinations the AI should prioritize when creating looks</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Preset suggestions */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick add presets:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PAIRINGS.map((preset, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => addPresetPairing(preset.colors)}
                >
                  <div className="flex items-center gap-1 mr-2">
                    {preset.colors.map(c => {
                      const style = getColorStyle(c);
                      return (
                        <span key={c} className={`w-3 h-3 rounded-full ${style.bg}`} />
                      );
                    })}
                  </div>
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Current pairings */}
          {activeConfig.preferredPairings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Active pairings:</p>
              <div className="flex flex-wrap gap-2">
                {activeConfig.preferredPairings.map((pairing, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 flex items-center gap-2"
                  >
                    <div className="flex items-center gap-1">
                      {pairing.map(c => {
                        const style = getColorStyle(c);
                        return (
                          <span key={c} className={`w-3 h-3 rounded-full ${style.bg}`} />
                        );
                      })}
                    </div>
                    <span className="text-xs">{pairing.join(' + ')}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => removePairing(idx)}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <Button onClick={() => saveSettings(configs, activeConfigId)} disabled={saving}>
          {saving ? 'Saving...' : 'Save Color Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};