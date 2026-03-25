import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CollectionData {
  name: string;
  count: number;
}

const ALLOWED_COLLECTIONS = [
  'Derby', 'Lazzarini', 'Epoca', 'Alloro', 'Superleggera', 'Del Duca', 'Emidio',
  'Galassia', 'New Star', 'N.10', 'Classic', 'Del Bello', 'Foro Italico',
  'Gold Mid', 'N.100', 'SANTIAGO', 'Italia Ottantadue', 'KIDSUPER',
  'Venice Beach FC', 'Tacchettee',
];

export const useProductCollections = () => {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('name');

    if (error) {
      console.error('Error fetching collections:', error);
      setLoading(false);
      return;
    }

    const collectionCount: Record<string, number> = {};

    (data || []).forEach(product => {
      const productName = (product.name || '').toLowerCase();
      ALLOWED_COLLECTIONS.forEach(modelName => {
        const regex = new RegExp(`\\b${modelName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (regex.test(productName)) {
          collectionCount[modelName] = (collectionCount[modelName] || 0) + 1;
        }
      });
    });

    const collectionList = Object.entries(collectionCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    setCollections(collectionList);
    setLoading(false);
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  return {
    collections,
    loading,
    refetch: fetchCollections,
  };
};
