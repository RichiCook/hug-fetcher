import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TimingSelectorProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

const PRESETS = [
  { 
    label: 'This Week', 
    getRange: () => {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (7 - end.getDay()));
      return { start: now, end };
    }
  },
  { 
    label: 'This Month', 
    getRange: () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: now, end };
    }
  },
  { 
    label: 'Next 30 Days', 
    getRange: () => {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return { start: now, end };
    }
  },
  { 
    label: 'Winter Sale', 
    getRange: () => {
      const year = new Date().getFullYear();
      return { 
        start: new Date(year, 0, 1), 
        end: new Date(year, 1, 28) 
      };
    }
  },
  { 
    label: 'Summer Sale', 
    getRange: () => {
      const year = new Date().getFullYear();
      return { 
        start: new Date(year, 5, 15), 
        end: new Date(year, 7, 31) 
      };
    }
  },
];

export const TimingSelector = ({
  startDate,
  endDate,
  onChange,
}: TimingSelectorProps) => {
  const [isScheduled, setIsScheduled] = useState(startDate !== null || endDate !== null);

  useEffect(() => {
    setIsScheduled(startDate !== null || endDate !== null);
  }, [startDate, endDate]);

  const handleToggleScheduled = (checked: boolean) => {
    setIsScheduled(checked);
    if (!checked) {
      onChange(null, null);
    }
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const range = preset.getRange();
    onChange(range.start, range.end);
    setIsScheduled(true);
  };

  const handleClear = () => {
    onChange(null, null);
    setIsScheduled(false);
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="scheduling"
          checked={isScheduled}
          onCheckedChange={handleToggleScheduled}
        />
        <Label htmlFor="scheduling" className="cursor-pointer">
          Schedule this activation
        </Label>
      </div>

      {isScheduled && (
        <>
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Badge
                key={preset.label}
                variant="outline"
                className="cursor-pointer transition-all hover:scale-105 hover:bg-accent"
                onClick={() => handlePreset(preset)}
              >
                <Clock className="w-3 h-3 mr-1" />
                {preset.label}
              </Badge>
            ))}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={(date) => onChange(date || null, endDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <span className="text-muted-foreground mt-5">→</span>

            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select end"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => onChange(startDate, date || null)}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Summary and clear */}
          {(startDate || endDate) && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {startDate && endDate ? (
                  <>Active from {format(startDate, "MMM d")} to {format(endDate, "MMM d, yyyy")}</>
                ) : startDate ? (
                  <>Starts {format(startDate, "MMM d, yyyy")}</>
                ) : endDate ? (
                  <>Ends {format(endDate, "MMM d, yyyy")}</>
                ) : null}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClear}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};