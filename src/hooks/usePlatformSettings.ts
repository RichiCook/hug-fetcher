import { useState, useEffect } from 'react';
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

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('Error fetching platform settings:', error);
      // If no settings exist yet, use defaults
      if (error.code === 'PGRST116') {
        setSettings(DEFAULT_SETTINGS);
      }
    } else if (data) {
      setSettings(data as PlatformSettings);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (
    updates: Partial<Omit<PlatformSettings, 'id' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> => {
    setSaving(true);
    
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        id: 'default',
        ...settings,
        ...updates,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setSaving(false);
      return { success: false, error: error.message };
    }

    await fetchSettings();
    setSaving(false);
    return { success: true };
  };

  const uploadLogo = async (file: File): Promise<{ url: string | null; error?: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
    return { url: data.publicUrl };
  };

  const uploadFavicon = async (file: File): Promise<{ url: string | null; error?: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `favicon-${Date.now()}.${fileExt}`;
    const filePath = `favicons/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
    return { url: data.publicUrl };
  };

  return {
    settings,
    loading,
    saving,
    updateSettings,
    uploadLogo,
    uploadFavicon,
    refetch: fetchSettings,
  };
};