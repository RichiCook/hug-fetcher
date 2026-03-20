import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Palette, User, Settings, Eye } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LookGeneratorPanel } from '@/components/looks/LookGeneratorPanel';
import { LookCard } from '@/components/looks/LookCard';
import { LookGroupsManager } from '@/components/looks/LookGroupsManager';
import { ColorCombinatorSection } from '@/components/ai-settings/ColorCombinatorSection';
import { ModelReferencesSection } from '@/components/ai-settings/ModelReferencesSection';
import { StyleReferencesSection } from '@/components/ai-settings/StyleReferencesSection';
import { AnimationControls } from '@/components/ai-settings/AnimationControls';
import { useLooks } from '@/hooks/useLooks';
import type { Look, LookGeneratorOptions } from '@/hooks/useLooks';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MainView = 'generator' | 'groups' | 'colors' | 'models' | 'styles' | 'display';

const LooksPage = () => {
  const { toast } = useToast();
  const { looks, loading, generating, generateLooks, saveLook, deleteLook } = useLooks();
  const { settings } = usePlatformSettingsContext();
  const [generatedLooks, setGeneratedLooks] = useState<Look[]>([]);
  const [activeTab, setActiveTab] = useState('generate');
  const [mainView, setMainView] = useState<MainView>('generator');
  const [looksVersion, setLooksVersion] = useState<'v1' | 'v2'>('v2');
  const [similarProductsEnabled, setSimilarProductsEnabled] = useState(true);
  const [quickPreviewSimilar, setQuickPreviewSimilar] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'looks_layout_version').single()
      .then(({ data }) => { if ((data?.value as any)?.version === 'v1') setLooksVersion('v1'); });
    supabase.from('app_settings').select('value').eq('id', 'similar_products_enabled').single()
      .then(({ data }) => { if ((data?.value as any)?.enabled === false) setSimilarProductsEnabled(false); });
  }, []);

  const saveSetting = async (id: string, value: any, label: string) => {
    setSavingToggle(true);
    try {
      await supabase.from('app_settings').upsert({ id, value, updated_at: new Date().toISOString() });
      toast({ title: 'Saved', description: label });
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingToggle(false);
    }
  };

  const handleGenerate = async (options: LookGeneratorOptions) => {
    try {
      const newLooks = await generateLooks(options);
      setGeneratedLooks(newLooks);
      
      if (newLooks.length > 0) {
        toast({
          title: 'Looks Generated',
          description: `Created ${newLooks.length} outfit suggestion${newLooks.length > 1 ? 's' : ''}.`
        });
      } else {
        toast({
          title: 'No Looks Created',
          description: 'Try adjusting your filters or adding more products.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error generating looks:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate looks.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveLook = async (look: Look) => {
    const saved = await saveLook({
      name: look.name,
      description: look.description,
      product_ids: look.product_ids,
      composition: look.composition,
      style: look.style,
      color_palette: look.color_palette,
      total_price: look.total_price,
      ai_reasoning: look.ai_reasoning
    });

    if (saved) {
      setGeneratedLooks(prev => prev.filter(l => l.name !== look.name));
      toast({
        title: 'Look Saved',
        description: `"${look.name}" has been saved to your collection.`
      });
    } else {
      toast({
        title: 'Save Failed',
        description: 'Failed to save the look.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteLook = async (id: string) => {
    const success = await deleteLook(id);
    if (success) {
      toast({
        title: 'Look Deleted',
        description: 'The look has been removed.'
      });
    }
  };

  const navItems: { id: MainView; label: string; icon: React.ReactNode }[] = [
    { id: 'generator', label: 'Look Generator', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'groups', label: 'Configurazione Gruppi', icon: <Settings className="w-4 h-4" /> },
    { id: 'colors', label: 'Color Combinator', icon: <Palette className="w-4 h-4" /> },
    { id: 'models', label: 'Model & Environment References', icon: <User className="w-4 h-4" /> },
    { id: 'styles', label: 'Style References', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'display', label: 'Display & Animation', icon: <Eye className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-6">
          <AppHeader>
            <div className="h-6 w-px bg-border shrink-0" />
            <h1 className="text-lg font-semibold shrink-0">Total Looks</h1>
          </AppHeader>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto ml-auto">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={mainView === item.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMainView(item.id)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                {item.icon}
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Settings Views */}
        {mainView === 'groups' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Configurazione Gruppi Look</h2>
              <p className="text-muted-foreground">
                Gestisci quali categorie di prodotti possono essere combinate insieme negli outfit,
                e definisci le esclusioni per evitare combinazioni non compatibili.
              </p>
            </div>
            <LookGroupsManager />
          </div>
        )}

        {mainView === 'colors' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Color Combinator</h2>
              <p className="text-muted-foreground">
                Configure color harmony rules and preferences for AI-generated looks.
              </p>
            </div>
            <ColorCombinatorSection />
          </div>
        )}

        {mainView === 'models' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Model & Environment References</h2>
              <p className="text-muted-foreground">
                Upload reference images for models and environments to guide AI generation.
              </p>
            </div>
            <ModelReferencesSection />
          </div>
        )}

        {mainView === 'styles' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Style References</h2>
              <p className="text-muted-foreground">
                Define style presets, upload reference images, and connect social media feeds for inspiration.
              </p>
            </div>
            <StyleReferencesSection />
          </div>
        )}

        {mainView === 'display' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Display & Animation</h2>
              <p className="text-muted-foreground">
                Control how generated Total Look images are displayed, including Ken Burns panning animation and parallax effects.
              </p>
            </div>
            <div className="max-w-2xl space-y-6">
              {/* Layout Version Toggle */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">AI-Curated Looks Layout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant={looksVersion === 'v1' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setLooksVersion('v1'); saveSetting('looks_layout_version', { version: 'v1' }, 'Layout set to Classic'); }}
                      disabled={savingToggle}
                    >
                      v1.0 — Classic
                    </Button>
                    <Button
                      variant={looksVersion === 'v2' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setLooksVersion('v2'); saveSetting('looks_layout_version', { version: 'v2' }, 'Layout set to Refined'); }}
                      disabled={savingToggle}
                    >
                      v2.0 — Refined
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {looksVersion === 'v1'
                      ? 'Classic layout: side-by-side product cards, colour palette dots, full styling note.'
                      : 'Refined layout: editorial card carousel, stacked products, collapsible notes.'}
                  </p>
                </CardContent>
              </Card>

              {/* Similar Products Toggle */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">Similar Products Section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant={similarProductsEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setSimilarProductsEnabled(true); saveSetting('similar_products_enabled', { enabled: true }, 'Similar Products enabled'); }}
                      disabled={savingToggle}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={!similarProductsEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setSimilarProductsEnabled(false); saveSetting('similar_products_enabled', { enabled: false }, 'Similar Products disabled'); }}
                      disabled={savingToggle}
                    >
                      Disabled
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {similarProductsEnabled
                      ? 'Shows a horizontal carousel of similar products below AI-Curated Looks on product pages.'
                      : 'Similar Products section is hidden on product pages.'}
                  </p>
                </CardContent>
              </Card>

              <AnimationControls />
            </div>
          </div>
        )}

        {/* Look Generator View */}
        {mainView === 'generator' && (
          <div className="grid lg:grid-cols-[350px_1fr] gap-8">
            {/* Left: Control Panel */}
            <div>
              <LookGeneratorPanel 
                onGenerate={handleGenerate} 
                isGenerating={generating}
              />
            </div>

            {/* Right: Results */}
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="generate">
                    Generated ({generatedLooks.length})
                  </TabsTrigger>
                  <TabsTrigger value="saved">
                    Saved ({looks.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4">
                  {generatedLooks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <p className="text-lg">No looks generated yet</p>
                      <p className="text-sm mt-1">
                        Use the panel on the left to create outfit combinations
                      </p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {generatedLooks.map((look, idx) => (
                        <LookCard
                          key={`${look.name}-${idx}`}
                          look={look}
                          onSave={() => handleSaveLook(look)}
                          isSaved={false}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="saved" className="space-y-4">
                  {loading ? (
                    <div className="text-center py-16 text-muted-foreground">
                      Loading saved looks...
                    </div>
                  ) : looks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <p className="text-lg">No saved looks yet</p>
                      <p className="text-sm mt-1">
                        Generate looks and save your favorites
                      </p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {looks.map(look => (
                        <LookCard
                          key={look.id}
                          look={look}
                          onDelete={() => handleDeleteLook(look.id)}
                          isSaved={true}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LooksPage;
