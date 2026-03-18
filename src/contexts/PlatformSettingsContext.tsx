import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  id: string;
  brand_name: string;
  page_title: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string | null;
  updated_at: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  id: 'default',
  brand_name: 'aitems',
  page_title: 'aitems',
  logo_url: null,
  favicon_url: null,
  primary_color: '#000000',
  secondary_color: '#f5f5f5',
  accent_color: '#3b82f6',
  custom_css: null,
  updated_at: new Date().toISOString(),
};

interface PlatformSettingsContextType {
  settings: PlatformSettings;
  loading: boolean;
  refetch: () => Promise<void>;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextType | undefined>(undefined);

export const PlatformSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Settings fetch timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error fetching platform settings:', error);
      } else if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        } as PlatformSettings);
      }
    } catch (e) {
      console.warn('Platform settings fetch timed out, using defaults');
    }
    setLoading(false);
  };

  // Apply dynamic settings to document
  useEffect(() => {
    if (loading) return;

    // Update page title
    document.title = settings.page_title || settings.brand_name || 'Champion';

    // Update favicon only if a custom one is set in the database
    if (settings.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings, loading]);

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <PlatformSettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
};

export const usePlatformSettingsContext = () => {
  const context = useContext(PlatformSettingsContext);
  if (context === undefined) {
    throw new Error('usePlatformSettingsContext must be used within a PlatformSettingsProvider');
  }
  return context;
};
