import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryData {
  name: string;
  count: number;
}

const ALLOWED_CATEGORIES = [
  'Blade', 'Superblade', 'Nexus', 'Off Road', 'Julia', 'Flora', 'Mia', 'Patty',
  'Avenida', 'Sirio', 'Emily', 'Versilia', 'Concept', 'Nancy', 'Muni', 'Hanoi',
  'Michelle', 'Cappa Blade', 'Jelly', 'Riderama', 'Malesia', 'Divine', 'Starsway',
  'Josephine', 'Geraldine', 'Double Face', 'Beat', 'Charlie', 'Ale', 'Betty',
  'Vegas', 'Universe', 'Infinity', 'Lingerie', 'Cathedral', 'Soraya', 'Winnie',
  'Reflex', 'Liberty', 'Positano', 'Twiga',
];

const ALLOWED_SET = new Set(ALLOWED_CATEGORIES.map(c => c.toLowerCase()));

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
      const categoryCount: Record<string, number> = {};
      
      (data || []).forEach(product => {
        const cat = product.category;
        if (cat && cat.trim() !== '') {
          const segments = cat.split(' > ').map((s: string) => s.trim()).filter((s: string) => s);
          segments.forEach((segment: string) => {
            categoryCount[segment] = (categoryCount[segment] || 0) + 1;
          });
        }
      });

      // Filter to only allowed categories (case-insensitive match, use canonical name)
      const categoryArray = ALLOWED_CATEGORIES
        .map(name => ({
          name,
          count: Object.entries(categoryCount).reduce((sum, [k, v]) => 
            k.toLowerCase() === name.toLowerCase() ? sum + v : sum, 0),
        }))
        .filter(c => c.count > 0)
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
