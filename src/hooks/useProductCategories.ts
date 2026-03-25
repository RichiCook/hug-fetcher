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
      .select('category');

    if (error) {
      console.error('Error fetching product categories:', error);
    } else {
      const categoryCount: Record<string, number> = {};
      
      (data || []).forEach(product => {
        if (product.category && product.category.trim()) {
          // Split by " > " to get individual segments
          const segments = product.category.split(' > ').map(s => s.trim()).filter(Boolean);
          segments.forEach(segment => {
            if (segment.toLowerCase() === 'pending') return;
            categoryCount[segment] = (categoryCount[segment] || 0) + 1;
          });
        }
      });

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
