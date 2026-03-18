import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface CategoryData {
  name: string;
  count: number;
}

interface GroupedCategoryPickerProps {
  categories: CategoryData[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
}

// Category groupings for LINGERIE / SWIMWEAR brand
const CATEGORY_GROUPS: Record<string, { icon: string; keywords: string[] }> = {
  'Bras & Tops': {
    icon: '👙',
    keywords: ['reggiseni', 'reggiseno', 'bralette', 'corsetti', 'corsetto', 'bustier', 'bras', 'bra', 'balconette', 'push-up', 'triangle', 'bandeau', 'strapless', 'underwire', 'soft-cup', 'top']
  },
  'Bottoms': {
    icon: '🩲',
    keywords: ['slip', 'perizomi', 'perizoma', 'mutande', 'mutanda', 'culotte', 'brazilian', 'g-string', 'tanga', 'thong', 'panties', 'briefs', 'hipster', 'high-waist', 'shorts']
  },
  'Bodies & Sets': {
    icon: '💃',
    keywords: ['body', 'bodysuit', 'completi', 'completo', 'set', 'teddy', 'babydoll', 'chemise', 'coordinato']
  },
  'Swimwear': {
    icon: '🩱',
    keywords: ['mare', 'costumi', 'costume', 'bikini', 'costume intero', 'swimsuit', 'swimwear', 'beachwear', 'monokini', 'tankini', 'one-piece', 'two-piece']
  },
  'Nightwear': {
    icon: '🌙',
    keywords: ['notte', 'pigiami', 'pigiama', 'camicie da notte', 'camicia da notte', 'vestaglie', 'vestaglia', 'pajamas', 'pyjamas', 'nightgown', 'nightdress', 'sleepwear', 'loungewear']
  },
  'Cover-ups & Robes': {
    icon: '🥻',
    keywords: ['caftani', 'caftano', 'copricostume', 'pareo', 'kimono', 'cover-up', 'coverup', 'robe', 'accappatoio', 'dressing gown', 'wrapper']
  },
  'Accessories': {
    icon: '✨',
    keywords: ['accessori', 'giarrettiere', 'giarrettiera', 'calze', 'calza', 'stockings', 'suspender', 'garter', 'belt', 'cintura', 'reggicalze', 'autoreggenti', 'collant', 'tights', 'hosiery']
  },
};

export const GroupedCategoryPicker = ({
  categories,
  selectedCategories,
  onToggleCategory,
  onRemoveCategory,
}: GroupedCategoryPickerProps) => {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['Outerwear', 'Tops']));

  const groupedCategories = useMemo(() => {
    const groups: Record<string, CategoryData[]> = {};
    const ungrouped: CategoryData[] = [];

    // Initialize groups
    Object.keys(CATEGORY_GROUPS).forEach(group => {
      groups[group] = [];
    });

    // Categorize each category
    categories.forEach(cat => {
      const catLower = cat.name.toLowerCase();
      let matched = false;

      for (const [groupName, groupDef] of Object.entries(CATEGORY_GROUPS)) {
        if (groupDef.keywords.some(keyword => catLower.includes(keyword))) {
          groups[groupName].push(cat);
          matched = true;
          break;
        }
      }

      if (!matched) {
        ungrouped.push(cat);
      }
    });

    return { groups, ungrouped };
  }, [categories]);

  const toggleGroup = (group: string) => {
    const newOpen = new Set(openGroups);
    if (newOpen.has(group)) {
      newOpen.delete(group);
    } else {
      newOpen.add(group);
    }
    setOpenGroups(newOpen);
  };

  const selectAllInGroup = (groupName: string) => {
    const groupCats = groupedCategories.groups[groupName] || [];
    groupCats.forEach(cat => {
      if (!selectedCategories.includes(cat.name)) {
        onToggleCategory(cat.name);
      }
    });
  };

  const getGroupSelectedCount = (groupName: string): number => {
    const groupCats = groupedCategories.groups[groupName] || [];
    return groupCats.filter(cat => selectedCategories.includes(cat.name)).length;
  };

  if (categories.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        No categories found. Add categories to products first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Category Groups */}
      {Object.entries(CATEGORY_GROUPS).map(([groupName, groupDef]) => {
        const groupCats = groupedCategories.groups[groupName] || [];
        if (groupCats.length === 0) return null;

        const isOpen = openGroups.has(groupName);
        const selectedCount = getGroupSelectedCount(groupName);
        const totalCount = groupCats.reduce((sum, c) => sum + c.count, 0);

        return (
          <Collapsible
            key={groupName}
            open={isOpen}
            onOpenChange={() => toggleGroup(groupName)}
          >
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-lg">{groupDef.icon}</span>
                    <span className="font-medium">{groupName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupCats.length} types • {totalCount} products
                    </Badge>
                  </div>
                  {selectedCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {selectedCount} selected
                    </Badge>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 pt-0 space-y-2">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInGroup(groupName);
                      }}
                    >
                      Select all
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groupCats.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <Badge
                          key={cat.name}
                          variant={isSelected ? 'default' : 'outline'}
                          className={cn(
                            "cursor-pointer transition-all hover:scale-105",
                            isSelected && "ring-2 ring-primary/20"
                          )}
                          onClick={() => onToggleCategory(cat.name)}
                        >
                          {isSelected && <Check className="w-3 h-3 mr-1" />}
                          {cat.name} ({cat.count})
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Ungrouped categories */}
      {groupedCategories.ungrouped.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="border rounded-lg p-3 flex items-center gap-2 hover:bg-accent/50 transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Other</span>
              <Badge variant="secondary" className="text-xs">
                {groupedCategories.ungrouped.length} types
              </Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 flex flex-wrap gap-1.5">
              {groupedCategories.ungrouped.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <Badge
                    key={cat.name}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => onToggleCategory(cat.name)}
                  >
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {cat.name} ({cat.count})
                  </Badge>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Selected Categories Summary */}
      {selectedCategories.length > 0 && (
        <div className="pt-3 border-t border-border mt-4">
          <p className="text-sm font-medium mb-2">
            Selected ({selectedCategories.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedCategories.map((cat) => (
              <Badge
                key={cat}
                variant="default"
                className="cursor-pointer"
                onClick={() => onRemoveCategory(cat)}
              >
                {cat} ✕
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};