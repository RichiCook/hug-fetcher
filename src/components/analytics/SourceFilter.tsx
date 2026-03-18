import { Button } from '@/components/ui/button';
import { SourceFilter as SourceFilterType } from '@/hooks/useScanAnalytics';
import { QrCode, Globe, Layers } from 'lucide-react';

const OPTIONS: { label: string; value: SourceFilterType; icon: React.ReactNode }[] = [
  { label: 'All', value: 'all', icon: <Layers className="w-3.5 h-3.5" /> },
  { label: 'QR Scans', value: 'qr_scan', icon: <QrCode className="w-3.5 h-3.5" /> },
  { label: 'Direct', value: 'direct', icon: <Globe className="w-3.5 h-3.5" /> },
];

interface Props {
  value: SourceFilterType;
  onChange: (v: SourceFilterType) => void;
}

export function SourceFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map(o => (
        <Button
          key={o.value}
          variant={value === o.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(o.value)}
          className="gap-1.5"
        >
          {o.icon}
          {o.label}
        </Button>
      ))}
    </div>
  );
}
