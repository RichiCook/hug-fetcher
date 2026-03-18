import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseImages } from '@/utils/imageUtils';

export interface Look {
  id: string;
  name: string;
  description: string | null;
  product_ids: string[];
  composition: string;
  style: string | null;
  color_palette: string[] | null;
  total_price: string | null;
  ai_reasoning: string | null;
  created_at: string;
  products?: Product[];
}

export interface Product {
  id: string;
  name: string;
  price: string | null;
  images: string[];
  category: string | null;
  color: string | null;
  source_url: string | null;
  slug: string;
}

export interface LookGeneratorOptions {
  startingProductId?: string;
  count: number;
}

export const useLooks = () => {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchLooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('looks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch products for each look
      const looksWithProducts: Look[] = [];
      for (const look of data || []) {
        const productIds = look.product_ids as string[];
        if (productIds && productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds);

          looksWithProducts.push({
            ...look,
            products: products?.map(p => ({
              ...p,
              images: parseImages(p.images)
            })) || []
          });
        } else {
          looksWithProducts.push({ ...look, products: [] });
        }
      }

      setLooks(looksWithProducts);
    } catch (error) {
      console.error('Error fetching looks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateLooks = async (options: LookGeneratorOptions): Promise<Look[]> => {
    setGenerating(true);
    try {
      // Fetch all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Transform products for the edge function
      const transformedProducts = (products || []).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: parseImages(p.images),
        category: p.category,
        color: p.color,
        collection: p.collection,
        description: p.description,
        source_url: p.source_url
      }));

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-looks', {
        body: {
          products: transformedProducts,
          startingProductId: options.startingProductId,
          count: options.count
        }
      });

      if (error) throw error;

      return data.looks || [];
    } catch (error) {
      console.error('Error generating looks:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const saveLook = async (look: Omit<Look, 'id' | 'created_at'>): Promise<Look | null> => {
    try {
      const { data, error } = await supabase
        .from('looks')
        .insert({
          name: look.name,
          description: look.description,
          product_ids: look.product_ids,
          composition: look.composition,
          style: look.style,
          color_palette: look.color_palette,
          total_price: look.total_price,
          ai_reasoning: look.ai_reasoning
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLooks();
      return data;
    } catch (error) {
      console.error('Error saving look:', error);
      return null;
    }
  };

  const deleteLook = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('looks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLooks(prev => prev.filter(l => l.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting look:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchLooks();
  }, [fetchLooks]);

  return {
    looks,
    loading,
    generating,
    fetchLooks,
    generateLooks,
    saveLook,
    deleteLook
  };
};
