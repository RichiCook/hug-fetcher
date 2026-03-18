import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePreset } from '@/hooks/useScanAnalytics';

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

interface Props {
  datePreset: DatePreset;
  setDatePreset: (p: DatePreset) => void;
  customStart: Date | null;
  customEnd: Date | null;
  setCustomStart: (d: Date | null) => void;
  setCustomEnd: (d: Date | null) => void;
}

export function DateRangeFilter({ datePreset, setDatePreset, customStart, customEnd, setCustomStart, setCustomEnd }: Props) {
  const clearCustom = (preset: DatePreset) => {
    setCustomStart(null);
    setCustomEnd(null);
    setDatePreset(preset);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <Button
          key={p.value}
          variant={datePreset === p.value && !customStart ? 'default' : 'outline'}
          size="sm"
          onClick={() => clearCustom(p.value)}
        >
          {p.label}
        </Button>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <Input
          type="date"
          className="h-8 w-[130px] text-xs"
          value={customStart ? customStart.toISOString().split('T')[0] : ''}
          onChange={e => {
            const val = e.target.value;
            setCustomStart(val ? new Date(val) : null);
          }}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          className="h-8 w-[130px] text-xs"
          value={customEnd ? customEnd.toISOString().split('T')[0] : ''}
          onChange={e => {
            const val = e.target.value;
            setCustomEnd(val ? new Date(val) : null);
          }}
        />
      </div>
    </div>
  );
}
