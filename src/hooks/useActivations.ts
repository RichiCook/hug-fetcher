import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivationType = 'text_image' | 'video' | 'banner' | 'custom_html' | 'lead_capture';

export interface TextImageContent {
  title?: string;
  body?: string;
  images?: string[];
  layout?: 'left' | 'right' | 'center' | 'grid';
}

export interface VideoContent {
  title?: string;
  videoUrl?: string;
  description?: string;
}

export interface BannerContent {
  headline?: string;
  subtext?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface CustomHtmlContent {
  html?: string;
  css?: string;
}

export interface LeadCaptureContent {
  title?: string;
  description?: string;
  buttonText?: string;
  thankYouMessage?: string;
  rewardType: 'code_screen' | 'code_email';
  rewardPrefix?: string;
  collectName?: boolean;
  collectPhone?: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
}

export type ActivationContent = TextImageContent | VideoContent | BannerContent | CustomHtmlContent | LeadCaptureContent;

export interface Activation {
  id: string;
  name: string;
  type: ActivationType;
  content: ActivationContent;
  categories?: string[];
  collections?: string[];
  price_min?: number | null;
  price_max?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  hide_title?: boolean;
  full_width?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductActivation {
  id: string;
  product_id: string;
  activation_id: string;
  display_order: number;
  activation?: Activation;
}

export const useActivations = () => {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activations:', error);
    } else {
      setActivations(data as Activation[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivations();
  }, []);

  const createActivation = async (
    name: string,
    type: ActivationType,
    content: ActivationContent,
    categories?: string[],
    collections?: string[],
    priceMin?: number | null,
    priceMax?: number | null,
    startDate?: Date | null,
    endDate?: Date | null
  ): Promise<{ success: boolean; activation?: Activation; error?: string }> => {
    const { data, error } = await supabase
      .from('activations')
      .insert({ 
        name, 
        type, 
        content: content as any, 
        categories: categories || [],
        collections: collections || [],
        price_min: priceMin,
        price_max: priceMax,
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await fetchActivations();
    return { success: true, activation: data as Activation };
  };

  const updateActivation = async (
    id: string,
    updates: Partial<Pick<Activation, 'name' | 'type' | 'content' | 'categories' | 'collections' | 'price_min' | 'price_max' | 'start_date' | 'end_date' | 'hide_title' | 'full_width'>>
  ): Promise<{ success: boolean; error?: string }> => {
    // Ensure content is plain JSON-serializable
    const cleanUpdates = { ...updates };
    if (cleanUpdates.content) {
      cleanUpdates.content = JSON.parse(JSON.stringify(cleanUpdates.content));
    }
    const { error } = await supabase
      .from('activations')
      .update(cleanUpdates as any)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await fetchActivations();
    return { success: true };
  };

  const deleteActivation = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('activations').delete().eq('id', id);
    if (error) {
      console.error('Error deleting activation:', error);
      return false;
    }
    await fetchActivations();
    return true;
  };

  // Get unique categories from existing activations
  const getUsedCategories = (): string[] => {
    const allCategories = activations.flatMap(a => a.categories || []);
    return [...new Set(allCategories.filter(c => c.trim() !== ''))].sort();
  };

  return {
    activations,
    loading,
    createActivation,
    updateActivation,
    deleteActivation,
    refetch: fetchActivations,
    getUsedCategories,
  };
};

export const useProductActivations = (productId: string) => {
  const [productActivations, setProductActivations] = useState<ProductActivation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductActivations = async () => {
    if (!productId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('product_activations')
      .select(`
        *,
        activation:activations(*)
      `)
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching product activations:', error);
    } else {
      const parsed = (data || []).map(pa => ({
        ...pa,
        activation: pa.activation as Activation,
      }));
      setProductActivations(parsed);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductActivations();
  }, [productId]);

  const addActivationToProduct = async (
    activationId: string,
    displayOrder?: number
  ): Promise<{ success: boolean; error?: string }> => {
    const order = displayOrder ?? productActivations.length;
    
    const { error } = await supabase
      .from('product_activations')
      .insert({
        product_id: productId,
        activation_id: activationId,
        display_order: order,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'This activation is already added to this product' };
      }
      return { success: false, error: error.message };
    }

    await fetchProductActivations();
    return { success: true };
  };

  const removeActivationFromProduct = async (productActivationId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('product_activations')
      .delete()
      .eq('id', productActivationId);

    if (error) {
      console.error('Error removing activation:', error);
      return false;
    }

    await fetchProductActivations();
    return true;
  };

  const reorderActivations = async (
    orderedIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    const updates = orderedIds.map((id, index) => ({
      id,
      display_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('product_activations')
        .update({ display_order: update.display_order })
        .eq('id', update.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    await fetchProductActivations();
    return { success: true };
  };

  return {
    productActivations,
    loading,
    addActivationToProduct,
    removeActivationFromProduct,
    reorderActivations,
    refetch: fetchProductActivations,
  };
};