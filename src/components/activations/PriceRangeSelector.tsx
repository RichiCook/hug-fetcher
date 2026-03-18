import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Euro } from 'lucide-react';

interface PriceRangeSelectorProps {
  priceMin: number | null;
  priceMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

const PRESETS = [
  { label: 'Budget', min: 0, max: 100, icon: '💰' },
  { label: 'Mid-range', min: 100, max: 300, icon: '💎' },
  { label: 'Premium', min: 300, max: 600, icon: '👑' },
  { label: 'Luxury', min: 600, max: null, icon: '✨' },
];

export const PriceRangeSelector = ({
  priceMin,
  priceMax,
  onChange,
}: PriceRangeSelectorProps) => {
  const [minValue, setMinValue] = useState(priceMin?.toString() || '');
  const [maxValue, setMaxValue] = useState(priceMax?.toString() || '');

  useEffect(() => {
    setMinValue(priceMin?.toString() || '');
    setMaxValue(priceMax?.toString() || '');
  }, [priceMin, priceMax]);

  const handleMinChange = (value: string) => {
    setMinValue(value);
    const num = value ? parseFloat(value) : null;
    onChange(num, priceMax);
  };

  const handleMaxChange = (value: string) => {
    setMaxValue(value);
    const num = value ? parseFloat(value) : null;
    onChange(priceMin, num);
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setMinValue(preset.min.toString());
    setMaxValue(preset.max?.toString() || '');
    onChange(preset.min, preset.max);
  };

  const handleClear = () => {
    setMinValue('');
    setMaxValue('');
    onChange(null, null);
  };

  const isPresetActive = (preset: typeof PRESETS[0]) => {
    return priceMin === preset.min && priceMax === preset.max;
  };

  const hasRange = priceMin !== null || priceMax !== null;

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Badge
            key={preset.label}
            variant={isPresetActive(preset) ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105 py-1.5 px-3"
            onClick={() => handlePreset(preset)}
          >
            <span className="mr-1">{preset.icon}</span>
            {preset.label}
            <span className="ml-1 text-xs opacity-70">
              (€{preset.min}{preset.max ? `-${preset.max}` : '+'})
            </span>
          </Badge>
        ))}
      </div>

      {/* Custom range inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label htmlFor="priceMin" className="text-xs text-muted-foreground">
            Min Price
          </Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="priceMin"
              type="number"
              placeholder="0"
              value={minValue}
              onChange={(e) => handleMinChange(e.target.value)}
              className="pl-9"
              min="0"
            />
          </div>
        </div>
        <span className="text-muted-foreground mt-5">—</span>
        <div className="flex-1">
          <Label htmlFor="priceMax" className="text-xs text-muted-foreground">
            Max Price
          </Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="priceMax"
              type="number"
              placeholder="No limit"
              value={maxValue}
              onChange={(e) => handleMaxChange(e.target.value)}
              className="pl-9"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Clear button */}
      {hasRange && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClear}
          className="text-muted-foreground"
        >
          Clear price range
        </Button>
      )}
    </div>
  );
};