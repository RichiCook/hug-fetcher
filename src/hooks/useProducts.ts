import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FashionProduct } from '@/utils/FirecrawlService';

export interface Product {
  id: string;
  name: string;
  product_code: string | null;
  price: string | null;
  description: string | null;
  composition: string | null;
  care_instructions: string | null;
  images: string[];
  wear_with: any[];
  you_may_also_like: any[];
  source_url: string | null;
  slug: string;
  category: string | null;
  collection: string | null;
  created_at: string;
  updated_at: string;
}

/** Normalize image arrays: split any newline-joined URLs into separate entries */
export const normalizeImages = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return (images as string[]).flatMap(img =>
    typeof img === 'string' ? img.split('\n').map(u => u.trim()).filter(u => u.length > 0) : []
  );
};

const generateSlug = (name: string, productCode?: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = productCode ? `-${productCode}` : `-${Date.now()}`;
  return `${base}${suffix}`;
};

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      const parsed: Product[] = (data || []).map(p => ({
        ...p,
        images: normalizeImages(p.images),
        wear_with: Array.isArray(p.wear_with) ? p.wear_with : [],
        you_may_also_like: Array.isArray(p.you_may_also_like) ? p.you_may_also_like : [],
      }));
      setProducts(parsed);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const saveProduct = async (
    fashionProduct: FashionProduct,
    sourceUrl: string
  ): Promise<{ success: boolean; slug?: string; error?: string }> => {
    const slug = generateSlug(fashionProduct.name, fashionProduct.productCode);

    const insertData = {
      name: fashionProduct.name,
      product_code: fashionProduct.productCode || null,
      price: fashionProduct.price || null,
      description: fashionProduct.description || null,
      composition: fashionProduct.composition || null,
      care_instructions: fashionProduct.careInstructions || null,
      images: fashionProduct.images || [],
      wear_with: fashionProduct.wearWith || [],
      you_may_also_like: fashionProduct.youMayAlsoLike || [],
      source_url: sourceUrl,
      slug,
      collection: fashionProduct.collection || null,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const newSlug = `${slug}-${Date.now()}`;
        const { error: retryError } = await supabase
          .from('products')
          .insert({ ...insertData, slug: newSlug } as any)
          .select()
          .single();

        if (retryError) {
          return { success: false, error: retryError.message };
        }
        await fetchProducts();
        return { success: true, slug: newSlug };
      }
      return { success: false, error: error.message };
    }

    await fetchProducts();
    return { success: true, slug: data.slug };
  };

  const getProductBySlug = async (slugParam: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slugParam)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      return null;
    }

    return {
      ...data,
      images: normalizeImages(data.images),
      wear_with: Array.isArray(data.wear_with) ? data.wear_with : [],
      you_may_also_like: Array.isArray(data.you_may_also_like) ? data.you_may_also_like : [],
    } as Product;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }
    await fetchProducts();
    return true;
  };

  const updateProductCategory = async (id: string, category: string | null): Promise<boolean> => {
    const { error } = await supabase
      .from('products')
      .update({ category })
      .eq('id', id);

    if (error) {
      console.error('Error updating product category:', error);
      return false;
    }
    await fetchProducts();
    return true;
  };

  // Get unique categories from existing products
  const getUsedCategories = (): string[] => {
    const categories = products
      .map(p => p.category)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(categories)].sort();
  };

  return {
    products,
    loading,
    saveProduct,
    getProductBySlug,
    deleteProduct,
    updateProductCategory,
    getUsedCategories,
    refetch: fetchProducts,
  };
};
