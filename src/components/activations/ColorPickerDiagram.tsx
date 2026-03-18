import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ColorData {
  name: string;
  count: number;
}

interface ColorPickerDiagramProps {
  colors: ColorData[];
  selectedColors: string[];
  onToggleColor: (color: string) => void;
  onRemoveColor: (color: string) => void;
}

const COLOR_PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

export const ColorPickerDiagram = ({
  colors,
  selectedColors,
  onToggleColor,
  onRemoveColor,
}: ColorPickerDiagramProps) => {
  const chartData = useMemo(() => {
    return colors.map(color => ({
      name: color.name,
      value: color.count,
      isSelected: selectedColors.some(c => c.toLowerCase() === color.name.toLowerCase()),
    }));
  }, [colors, selectedColors]);

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      onToggleColor(data.name);
    }
  };

  if (colors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        No colors found. Add colors to products first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Pie Chart */}
        <div className="h-[200px] w-full lg:w-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onClick={handlePieClick}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    opacity={entry.isSelected ? 1 : 0.4}
                    stroke={entry.isSelected ? 'hsl(var(--foreground))' : 'transparent'}
                    strokeWidth={entry.isSelected ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md">
                        <p className="font-medium capitalize">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value} product{data.value !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-primary mt-1">
                          {data.isSelected ? 'Click to deselect' : 'Click to select'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Color List */}
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            Click on chart slices or colors below to select:
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color, index) => {
              const isSelected = selectedColors.some(c => c.toLowerCase() === color.name.toLowerCase());
              return (
                <Badge
                  key={color.name}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105 capitalize"
                  style={{
                    borderColor: isSelected ? undefined : COLOR_PALETTE[index % COLOR_PALETTE.length],
                    color: isSelected ? undefined : COLOR_PALETTE[index % COLOR_PALETTE.length],
                  }}
                  onClick={() => onToggleColor(color.name)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                  />
                  {color.name} ({color.count})
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Colors */}
      {selectedColors.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium mb-2">
            Selected Colors ({selectedColors.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedColors.map((color) => (
              <Badge
                key={color}
                variant="default"
                className="cursor-pointer capitalize"
                onClick={() => onRemoveColor(color)}
              >
                {color} <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
