import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CelebrityContent {
  id: string;
  celebrity_name: string;
  image_url: string;
  product_code: string | null;
  shop_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Extract product code (SKU) from a Casadei shop URL */
export function extractProductCode(url: string): string | null {
  if (!url) return null;
  const match = url.match(/([A-Z0-9]{10,})\.(html|htm)/i);
  if (match) return match[1];
  const segments = url.replace(/\.html?$/, '').split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  const codeMatch = last.match(/([A-Z0-9]{10,})$/i);
  return codeMatch ? codeMatch[1] : null;
}

/** Extract a category keyword from a shop URL path (e.g. "pumps", "boots", "sandals") */
export function extractCategoryFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    // Remove language-like prefixes (e.g. "en", "it", "en-it")
    const filtered = segments.filter(s => !/^[a-z]{2}(-[a-z]{2})?$/i.test(s));
    // Remove generic path segments like "shoes", "bags"
    const generic = new Set(['shoes', 'bags', 'accessories', 'clothing', 'search']);
    const meaningful = filtered.filter(s => !generic.has(s.toLowerCase()));
    // If URL ends with "/" it's a category page — take last meaningful segment
    // If URL ends with ".html" — it's a product page, take second-to-last
    const isProductPage = pathname.match(/\.(html?|htm)$/i);
    let cat: string | undefined;
    if (isProductPage && meaningful.length > 1) {
      cat = meaningful[meaningful.length - 2];
    } else {
      cat = meaningful[meaningful.length - 1];
    }
    if (cat && cat.length > 1) {
      // Clean up: replace hyphens with spaces, capitalize each word
      return cat
        .replace(/\.html?$/i, '')
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  } catch {
    // not a valid URL
  }
  return null;
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
        .upsert(rows, { onConflict: 'celebrity_name,image_url', ignoreDuplicates: false });
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

  const updateCategory = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string | null }) => {
      const { error } = await (supabase as any)
        .from('celebrity_content')
        .update({ category })
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

  const removeDuplicates = useMutation({
    mutationFn: async () => {
      // Find duplicates (same celebrity_name + image_url), keep newest
      const grouped = new Map<string, CelebrityContent[]>();
      for (const item of items) {
        const key = `${item.celebrity_name}|||${item.image_url}`;
        const arr = grouped.get(key) || [];
        arr.push(item);
        grouped.set(key, arr);
      }
      const idsToDelete: string[] = [];
      for (const group of grouped.values()) {
        if (group.length > 1) {
          group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          for (let i = 1; i < group.length; i++) {
            idsToDelete.push(group[i].id);
          }
        }
      }
      if (idsToDelete.length === 0) return 0;
      const { error } = await (supabase as any)
        .from('celebrity_content')
        .delete()
        .in('id', idsToDelete);
      if (error) throw error;
      return idsToDelete.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['celebrity-content'] }),
  });

  const backfillCategories = useMutation({
    mutationFn: async () => {
      const unmatched = items.filter(i => !i.product_code && !i.category && i.shop_url);
      let updated = 0;
      for (const item of unmatched) {
        const category = extractCategoryFromUrl(item.shop_url!);
        if (category) {
          const { error } = await (supabase as any)
            .from('celebrity_content')
            .update({ category })
            .eq('id', item.id);
          if (!error) updated++;
        }
      }
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['celebrity-content'] }),
  });

  return { items, isLoading, upsertMany, toggleActive, updateCategory, deleteItem, removeDuplicates, backfillCategories };
}

/** Hook for product pages — fetch active celebrity content for a specific product code OR matching category */
export function useCelebrityContentForProduct(productCode: string | null | undefined, productCategory?: string | null) {
  // Extract top-level category segment for matching
  const topCategory = productCategory
    ? productCategory.split(' > ').map(s => s.trim()).filter(s => s).pop() || null
    : null;

  return useQuery({
    queryKey: ['celebrity-content-product', productCode, topCategory],
    enabled: !!(productCode || topCategory),
    queryFn: async () => {
      // Fetch entries matching product_code OR matching category (when product_code is null)
      let query = (supabase as any)
        .from('celebrity_content')
        .select('*')
        .eq('is_active', true);

      if (productCode && topCategory) {
        query = query.or(`product_code.eq.${productCode},and(product_code.is.null,category.eq.${topCategory})`);
      } else if (productCode) {
        query = query.eq('product_code', productCode);
      } else if (topCategory) {
        query = query.is('product_code', null).eq('category', topCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CelebrityContent[];
    },
  });
}
