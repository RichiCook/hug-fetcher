import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CollectionData {
  name: string;
  count: number;
}

export const useProductCollections = () => {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('collection');

    if (error) {
      console.error('Error fetching collections:', error);
      setLoading(false);
      return;
    }

    // Count occurrences of each collection
    const collectionCounts: Record<string, number> = {};
    for (const product of data || []) {
      if (product.collection && product.collection.trim()) {
        const name = product.collection.trim();
        collectionCounts[name] = (collectionCounts[name] || 0) + 1;
      }
    }

    // Convert to array and sort
    const collectionList = Object.entries(collectionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

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
