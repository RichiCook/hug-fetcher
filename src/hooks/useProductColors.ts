import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ColorData {
  name: string;
  count: number;
}

export const useProductColors = () => {
  const [colors, setColors] = useState<ColorData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('color')
      .not('color', 'is', null);

    if (error) {
      console.error('Error fetching product colors:', error);
    } else {
      // Count products per color
      const colorCount: Record<string, number> = {};
      
      (data || []).forEach(product => {
        const color = product.color;
        if (color && color.trim() !== '') {
          const normalizedColor = color.toLowerCase().trim();
          colorCount[normalizedColor] = (colorCount[normalizedColor] || 0) + 1;
        }
      });

      // Convert to array format and capitalize
      const colorArray = Object.entries(colorCount)
        .map(([name, count]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          count 
        }))
        .sort((a, b) => b.count - a.count);

      setColors(colorArray);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchColors();
  }, []);

  return {
    colors,
    loading,
    refetch: fetchColors,
  };
};
