import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LookGroupsManager } from '@/components/looks/LookGroupsManager';
import { AppHeader } from '@/components/AppHeader';

const LookGroupsSettingsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <AppHeader>
            <h1 className="text-xl font-semibold">Configurazione Gruppi Look</h1>
          </AppHeader>
          <Link to="/looks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna ai Look
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Gestisci quali categorie di prodotti possono essere combinate insieme negli outfit,
            e definisci le esclusioni per evitare combinazioni non compatibili.
          </p>
        </div>
        
        <LookGroupsManager />
      </main>
    </div>
  );
};

export default LookGroupsSettingsPage;
