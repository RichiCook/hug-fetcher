import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImageProviderSetting {
  provider: 'lovable_ai' | 'openai' | 'replicate' | 'runware' | 'huggingface';
  model: string;
}

export function useAppSettings() {
  const [imageProvider, setImageProvider] = useState<ImageProviderSetting>({
    provider: 'lovable_ai',
    model: 'google/gemini-2.5-flash-image-preview'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImageProvider();
  }, []);

  const fetchImageProvider = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'image_provider')
        .single();

      if (error) throw error;
      if (data?.value) {
        setImageProvider(data.value as unknown as ImageProviderSetting);
      }
    } catch (error) {
      console.error('Error fetching image provider setting:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateImageProvider = async (setting: ImageProviderSetting) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: setting as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'image_provider');

      if (error) throw error;
      setImageProvider(setting);
      toast.success('Image provider updated successfully');
    } catch (error) {
      console.error('Error updating image provider:', error);
      toast.error('Failed to update image provider');
      throw error;
    }
  };

  return {
    imageProvider,
    updateImageProvider,
    loading,
    refetch: fetchImageProvider
  };
}
