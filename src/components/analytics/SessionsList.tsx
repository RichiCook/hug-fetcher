import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionRow } from '@/hooks/useScanAnalytics';
import { format } from 'date-fns';
import { MapPin, Clock, Layers } from 'lucide-react';

interface Props {
  sessions: SessionRow[];
}

export function SessionsList({ sessions }: Props) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((s, i) => (
        <Card key={i}>
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{s.sessionId}</span>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Layers className="w-3 h-3" />
                    {s.eventCount} events
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.products.map(p => (
                    <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {s.location !== '—' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                    <MapPin className="w-3 h-3" />
                    {s.location}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                  <Clock className="w-3 h-3" />
                  {format(new Date(s.lastSeen), 'MMM d, HH:mm')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
