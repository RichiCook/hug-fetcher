import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnimationConfig {
  duration: number;   // seconds (10–60)
  zoom: number;       // 1.02–1.15
  intensity: number;  // 0.3–2
}

const DEFAULTS: AnimationConfig = { duration: 20, zoom: 1.06, intensity: 1 };

const PRESETS: Record<string, AnimationConfig> = {
  subtle: { duration: 30, zoom: 1.03, intensity: 0.5 },
  default: { ...DEFAULTS },
  dramatic: { duration: 12, zoom: 1.12, intensity: 1.8 },
};

export const AnimationControls = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<AnimationConfig>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'look_display_settings')
          .single();
        const val = data?.value as any;
        if (val?.animation_duration) setConfig({
          duration: val.animation_duration ?? DEFAULTS.duration,
          zoom: val.animation_zoom ?? DEFAULTS.zoom,
          intensity: val.animation_intensity ?? DEFAULTS.intensity,
        });
      } catch { /* use defaults */ }
    };
    fetch();
  }, []);

  const save = async (next: AnimationConfig) => {
    setConfig(next);
    setSaving(true);
    try {
      // Merge with existing settings
      const { data: existing } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'look_display_settings')
        .single();
      const prev = (existing?.value as any) || {};
      await supabase.from('app_settings').upsert({
        id: 'look_display_settings',
        value: {
          ...prev,
          animation_duration: next.duration,
          animation_zoom: next.zoom,
          animation_intensity: next.intensity,
        } as any,
        updated_at: new Date().toISOString(),
      });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (key: string) => {
    if (PRESETS[key]) save(PRESETS[key]);
  };

  return (
    <div className="space-y-5 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Animation Preset</Label>
        <Select onValueChange={applyPreset} defaultValue="default">
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="subtle">Subtle</SelectItem>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="dramatic">Dramatic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Speed (duration)</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{config.duration}s</span>
        </div>
        <Slider
          min={8}
          max={60}
          step={2}
          value={[config.duration]}
          onValueCommit={(v) => save({ ...config, duration: v[0] })}
          onValueChange={(v) => setConfig(prev => ({ ...prev, duration: v[0] }))}
        />
        <p className="text-[10px] text-muted-foreground">Lower = faster movement</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Zoom Level</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round((config.zoom - 1) * 100)}%</span>
        </div>
        <Slider
          min={2}
          max={15}
          step={1}
          value={[Math.round((config.zoom - 1) * 100)]}
          onValueCommit={(v) => save({ ...config, zoom: 1 + v[0] / 100 })}
          onValueChange={(v) => setConfig(prev => ({ ...prev, zoom: 1 + v[0] / 100 }))}
        />
        <p className="text-[10px] text-muted-foreground">How much the image zooms in</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Pan Intensity</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{config.intensity.toFixed(1)}x</span>
        </div>
        <Slider
          min={3}
          max={20}
          step={1}
          value={[Math.round(config.intensity * 10)]}
          onValueCommit={(v) => save({ ...config, intensity: v[0] / 10 })}
          onValueChange={(v) => setConfig(prev => ({ ...prev, intensity: v[0] / 10 }))}
        />
        <p className="text-[10px] text-muted-foreground">How far the image pans across</p>
      </div>

      {/* Live preview */}
      <div className="rounded-lg overflow-hidden bg-secondary aspect-video max-w-xs mx-auto">
        <div
          className="w-full h-full bg-gradient-to-br from-muted to-accent animate-ken-burns"
          style={{
            '--kb-duration': `${config.duration}s`,
            '--kb-zoom': config.zoom,
            '--kb-intensity': config.intensity,
          } as React.CSSProperties}
        >
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Preview
          </div>
        </div>
      </div>
    </div>
  );
};
