import { Link } from 'react-router-dom';
import { Bookmark, Layers, Sparkles, Users, Settings2, LogOut, Palette, Upload, BarChart3, Menu, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import defaultLogo from '@/assets/logo.png';

interface AppHeaderProps {
  /** Optional: callback to refetch products after Excel import */
  onImportComplete?: () => void;
  /** Optional: extra content to render between logo and burger */
  children?: React.ReactNode;
}

export const AppHeader = ({ onImportComplete, children }: AppHeaderProps) => {
  const { signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();
  const logoUrl = settings.logo_url || defaultLogo;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/">
          <img
            src={logoUrl}
            alt={settings.brand_name || 'aitems'}
            className="h-8"
          />
        </Link>
        {children}
      </div>

      <div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm shadow-sm">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col gap-2 mt-8">
              {onImportComplete && <ExcelImportModal onImportComplete={onImportComplete} />}
              <Link to="/">
                <Button variant="ghost" className="w-full justify-start">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Products
                </Button>
              </Link>
              <Link to="/leads">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Leads
                </Button>
              </Link>
              <Link to="/looks">
                <Button variant="ghost" className="w-full justify-start">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Total Looks
                </Button>
              </Link>
              <Link to="/celebrity-content">
                <Button variant="ghost" className="w-full justify-start">
                  <Star className="w-4 h-4 mr-2" />
                  Celebrity Content
                </Button>
              </Link>
              <Link to="/activations">
                <Button variant="ghost" className="w-full justify-start">
                  <Layers className="w-4 h-4 mr-2" />
                  Activations
                </Button>
              </Link>
              <Link to="/api-settings">
                <Button variant="ghost" className="w-full justify-start">
                  <Settings2 className="w-4 h-4 mr-2" />
                  API
                </Button>
              </Link>
              <Link to="/scan-analytics">
                <Button variant="ghost" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" className="w-full justify-start">
                  <Palette className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
