import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface CategoryData {
  name: string;
  count: number;
}

interface CategoryPickerDiagramProps {
  categories: CategoryData[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CategoryPickerDiagram = ({
  categories,
  selectedCategories,
  onToggleCategory,
  onRemoveCategory,
}: CategoryPickerDiagramProps) => {
  const chartData = useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      value: cat.count,
      isSelected: selectedCategories.includes(cat.name),
    }));
  }, [categories, selectedCategories]);

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      onToggleCategory(data.name);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        No categories found. Add categories to products first.
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
                    fill={COLORS[index % COLORS.length]}
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
                        <p className="font-medium">{data.name}</p>
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

        {/* Category List */}
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            Click on chart slices or categories below to select:
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, index) => {
              const isSelected = selectedCategories.includes(cat.name);
              return (
                <Badge
                  key={cat.name}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  style={{
                    borderColor: isSelected ? undefined : COLORS[index % COLORS.length],
                    color: isSelected ? undefined : COLORS[index % COLORS.length],
                  }}
                  onClick={() => onToggleCategory(cat.name)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {cat.name} ({cat.count})
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium mb-2">
            Selected Categories ({selectedCategories.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map((cat) => (
              <Badge
                key={cat}
                variant="default"
                className="cursor-pointer"
                onClick={() => onRemoveCategory(cat)}
              >
                {cat} <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
