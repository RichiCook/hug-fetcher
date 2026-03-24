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
      .select('name');

    if (error) {
      console.error('Error fetching product categories:', error);
    } else {
      // Match model names from product names (e.g. "Liberty Blade Pumps" → "Blade")
      const categoryCount: Record<string, number> = {};
      
      (data || []).forEach(product => {
        const productName = (product.name || '').toLowerCase();
        ALLOWED_CATEGORIES.forEach(modelName => {
          // Word-boundary check: model name must appear as a whole word in the product name
          const regex = new RegExp(`\\b${modelName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          if (regex.test(productName)) {
            categoryCount[modelName] = (categoryCount[modelName] || 0) + 1;
          }
        });
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
