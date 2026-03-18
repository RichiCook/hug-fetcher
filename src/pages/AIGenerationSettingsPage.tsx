import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Palette, User, Sparkles, Upload, Trash2, Loader2, ImagePlus, Link2, Mountain, X, Eye } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ColorCombinatorSection } from '@/components/ai-settings/ColorCombinatorSection';
import { ModelReferencesSection } from '@/components/ai-settings/ModelReferencesSection';
import { StyleReferencesSection } from '@/components/ai-settings/StyleReferencesSection';
import { AnimationControls } from '@/components/ai-settings/AnimationControls';
import logo from '@/assets/logo.png';

const AIGenerationSettingsPage = () => {
  const { toast } = useToast();
  const [panningEnabled, setPanningEnabled] = useState(false);
  const [panningLoading, setPanningLoading] = useState(true);

  useEffect(() => {
    const fetchDisplaySettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'look_display_settings')
          .single();
        if (data?.value && typeof data.value === 'object' && 'panning_enabled' in (data.value as any)) {
          setPanningEnabled((data.value as any).panning_enabled);
        }
      } catch (e) {
        // ignore
      } finally {
        setPanningLoading(false);
      }
    };
    fetchDisplaySettings();
  }, []);

  const togglePanning = async (enabled: boolean) => {
    setPanningEnabled(enabled);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'look_display_settings',
          value: { panning_enabled: enabled } as any,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      toast({ title: enabled ? 'Panning animation enabled' : 'Panning animation disabled' });
    } catch (e) {
      setPanningEnabled(!enabled);
      toast({ title: 'Failed to update setting', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <AppHeader>
            <h1 className="text-xl font-semibold">AI Generation Settings</h1>
          </AppHeader>
          <Link to="/looks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Looks
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Configure how the AI generates Total Look images. Set color preferences, upload model and environment references, and define style inspiration.
          </p>
        </div>

        <div className="space-y-8">
          {/* Look Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Look Display Settings
              </CardTitle>
              <CardDescription>
                Control how generated Total Look images are displayed to customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="panning-toggle" className="text-sm font-medium">Enable panning animation</Label>
                  <p className="text-xs text-muted-foreground mt-1">Adds a subtle Ken Burns pan/zoom effect on generated look images</p>
                </div>
                <Switch
                  id="panning-toggle"
                  checked={panningEnabled}
                  onCheckedChange={togglePanning}
                  disabled={panningLoading}
                />
              </div>

              {panningEnabled && (
                <AnimationControls />
              )}
            </CardContent>
          </Card>

          {/* Color Combinator Section */}
          <ColorCombinatorSection />

          {/* Model References Section */}
          <ModelReferencesSection />

          {/* Style References Section */}
          <StyleReferencesSection />
        </div>
      </main>
    </div>
  );
};

export default AIGenerationSettingsPage;
