import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryData {
  name: string;
  count: number;
}

export const useProductCategories = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      console.error('Error fetching product categories:', error);
    } else {
      // Count products per category segment (split by " > " for hierarchical categories)
      const categoryCount: Record<string, number> = {};
      
      (data || []).forEach(product => {
        const cat = product.category;
        if (cat && cat.trim() !== '') {
          // Split hierarchical categories (e.g., "Abbigliamento > T-shirt donna")
          const segments = cat.split(' > ').map((s: string) => s.trim()).filter((s: string) => s);
          
          // Count each segment individually
          segments.forEach((segment: string) => {
            categoryCount[segment] = (categoryCount[segment] || 0) + 1;
          });
        }
      });

      // Convert to array format
      const categoryArray = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setCategories(categoryArray);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    refetch: fetchCategories,
  };
};
