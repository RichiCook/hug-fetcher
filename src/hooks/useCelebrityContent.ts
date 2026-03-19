import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CelebrityContent {
  id: string;
  celebrity_name: string;
  image_url: string;
  product_code: string | null;
  shop_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Extract product code (SKU) from a Casadei shop URL */
export function extractProductCode(url: string): string | null {
  if (!url) return null;
  // Match pattern like "1G676B100MC13139000.html" at end of URL
  const match = url.match(/([A-Z0-9]{10,})\.(html|htm)/i);
  if (match) return match[1];
  // Also try the last path segment before .html
  const segments = url.replace(/\.html?$/, '').split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  // Extract code from slug like "superblade-sharp-pump-samurai-1G676B100MC13139000"
  const codeMatch = last.match(/([A-Z0-9]{10,})$/i);
  return codeMatch ? codeMatch[1] : null;
}

export function useCelebrityContent() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['celebrity-content'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('celebrity_content')
        .select('*')
        .order('celebrity_name');
      if (error) throw error;
      return data as CelebrityContent[];
    },
  });

  const upsertMany = useMutation({
    mutationFn: async (rows: Omit<CelebrityContent, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { error } = await (supabase as any)
        .from('celebrity_content')
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['celebrity-content'] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('celebrity_content')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['celebrity-content'] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('celebrity_content')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['celebrity-content'] }),
  });

  return { items, isLoading, upsertMany, toggleActive, deleteItem };
}

/** Hook for product pages — fetch active celebrity content for a specific product code */
export function useCelebrityContentForProduct(productCode: string | null | undefined) {
  return useQuery({
    queryKey: ['celebrity-content-product', productCode],
    enabled: !!productCode,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('celebrity_content')
        .select('*')
        .eq('product_code', productCode)
        .eq('is_active', true);
      if (error) throw error;
      return data as CelebrityContent[];
    },
  });
}
