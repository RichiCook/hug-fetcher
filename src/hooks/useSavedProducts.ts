import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrapeResult } from '@/components/ScrapeForm';
import { normalizeImages } from '@/hooks/useProducts';

export interface SavedProduct {
  id: string;
  name: string;
  product_code: string | null;
  price: string | null;
  description: string | null;
  images: string[];
  source_url: string | null;
  slug: string;
  category: string | null;
  collection: string | null;
  color: string | null;
  short_code: string | null;
  is_available: boolean;
  created_at: string;
}

const extractColorFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  // URL pattern: https://it.maxmara.com/p-{code}-{model}-{color}
  const urlPath = url.split('/').pop() || '';
  const lastHyphenIndex = urlPath.lastIndexOf('-');
  if (lastHyphenIndex === -1) return null;
  
  // Get everything after the last hyphen and replace remaining hyphens with spaces
  const colorPart = urlPath.substring(lastHyphenIndex + 1);
  // Handle multi-word colors like "blu-marino" -> "blu marino"
  return colorPart.replace(/-/g, ' ').toLowerCase();
};

const generateShortCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateSlug = (name: string, productCode?: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = productCode ? `-${productCode}` : `-${Date.now()}`;
  return `${base}${suffix}`;
};

export const useSavedProducts = () => {
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error('Error fetching products:', error);
          break;
        }

        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const parsed: SavedProduct[] = allData.map(p => ({
        id: p.id,
        name: p.name,
        product_code: p.product_code,
        price: p.price,
        description: p.description,
        images: normalizeImages(p.images),
        source_url: p.source_url,
        slug: p.slug,
        category: p.category,
        collection: p.collection || null,
        color: (p as any).color || null,
        short_code: (p as any).short_code || null,
        is_available: (p as any).is_available ?? true,
        created_at: p.created_at,
      }));
      setSavedProducts(parsed);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const saveProducts = async (results: ScrapeResult[]): Promise<number> => {
    const successfulResults = results.filter(r => r.status === 'success' && r.product);
    let savedCount = 0;

    for (const result of successfulResults) {
      if (!result.product) continue;
      
      const slug = generateSlug(result.product.name, result.product.productCode);
      
      const shortCode = generateShortCode();
      
      const insertData = {
        name: result.product.name,
        product_code: result.product.productCode || null,
        price: result.product.price || null,
        description: result.product.description || null,
        composition: result.product.composition || null,
        care_instructions: result.product.careInstructions || null,
        images: result.product.images || [],
        wear_with: result.product.wearWith || [],
        you_may_also_like: result.product.youMayAlsoLike || [],
        source_url: result.url,
        slug,
        short_code: shortCode,
        category: result.product.categories?.length > 0
          ? result.product.categories.join(' > ')
          : null,
        color: extractColorFromUrl(result.url),
      };

      const { error } = await supabase
        .from('products')
        .insert(insertData as any);

      if (error) {
        if (error.code === '23505') {
          // Duplicate slug, try with timestamp
          const newSlug = `${slug}-${Date.now()}`;
          const { error: retryError } = await supabase
            .from('products')
            .insert({ ...insertData, slug: newSlug } as any);
          
          if (!retryError) savedCount++;
        }
        console.error('Error saving product:', error);
      } else {
        savedCount++;
      }
    }

    await fetchProducts();
    return savedCount;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      return;
    }
    await fetchProducts();
  };

  const clearAllSaved = async () => {
    const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error('Error clearing products:', error);
      return;
    }
    setSavedProducts([]);
  };

  const deleteDuplicates = async (): Promise<number> => {
    // Group products by source_url or product_code to find duplicates
    const seen = new Map<string, string>(); // key -> id to keep
    const duplicateIds: string[] = [];

    for (const product of savedProducts) {
      // Create a unique key - prioritize source_url, then product_code, then name
      const key = product.source_url || product.product_code || product.name || product.id;
      if (seen.has(key)) {
        duplicateIds.push(product.id);
      } else {
        seen.set(key, product.id);
      }
    }

    if (duplicateIds.length === 0) return 0;

    // Delete all duplicates in one query
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', duplicateIds);

    if (error) {
      console.error('Error deleting duplicates:', error);
      return 0;
    }

    await fetchProducts();
    return duplicateIds.length;
  };

  const toggleAvailability = async (id: string, isAvailable: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('products')
      .update({ is_available: isAvailable } as any)
      .eq('id', id);

    if (error) {
      console.error('Error toggling availability:', error);
      return false;
    }

    setSavedProducts(prev => prev.map(p => p.id === id ? { ...p, is_available: isAvailable } : p));
    return true;
  };

  const bulkToggleAvailability = async (ids: string[], isAvailable: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('products')
      .update({ is_available: isAvailable } as any)
      .in('id', ids);

    if (error) {
      console.error('Error bulk toggling availability:', error);
      return false;
    }

    setSavedProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_available: isAvailable } : p));
    return true;
  };

  const checkAvailability = useCallback(async (): Promise<{
    markedUnavailable: number;
    markedAvailable: number;
    totalStoreSkus: number;
    totalDbProducts: number;
  }> => {
    const { data, error } = await supabase.functions.invoke('check-availability');

    if (error) {
      console.error('Error checking availability:', error);
      throw new Error(error.message || 'Failed to check availability');
    }

    // Refresh local product list after sync
    await fetchProducts();
    return data;
  }, []);

  const classifyShoes = useCallback(async (): Promise<{
    classified: number;
    total: number;
    alreadyClassified: number;
    summary: Record<string, number>;
  }> => {
    const { data, error } = await supabase.functions.invoke('classify-shoes');

    if (error) {
      console.error('Error classifying shoes:', error);
      throw new Error(error.message || 'Failed to classify shoes');
    }

    await fetchProducts();
    return data;
  }, []);

  return {
    savedProducts,
    loading,
    saveProducts,
    deleteProduct,
    clearAllSaved,
    deleteDuplicates,
    toggleAvailability,
    bulkToggleAvailability,
    checkAvailability,
    classifyShoes,
    refetch: fetchProducts,
  };
};
