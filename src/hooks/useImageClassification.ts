import { useState, useEffect, useCallback } from 'react';
import { 
  loadClassifier, 
  isClassifierReady, 
  isClassifierLoading,
  findBestFlatLayImage,
  getCachedResult
} from '@/utils/imageClassifier';

interface UseImageClassificationReturn {
  isModelLoading: boolean;
  isModelReady: boolean;
  loadProgress: number;
  classifyProductImages: (productId: string, images: string[], category?: string | null) => Promise<string | null>;
  getCached: (productId: string) => string | null;
}

export const useImageClassification = (): UseImageClassificationReturn => {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(isClassifierReady());
  const [loadProgress, setLoadProgress] = useState(0);

  // Load the model on mount
  useEffect(() => {
    if (isClassifierReady()) {
      setIsModelReady(true);
      return;
    }

    if (isClassifierLoading()) {
      setIsModelLoading(true);
      return;
    }

    const load = async () => {
      setIsModelLoading(true);
      const success = await loadClassifier((progress) => {
        setLoadProgress(progress);
      });
      setIsModelReady(success);
      setIsModelLoading(false);
    };

    load();
  }, []);

  const classifyProductImages = useCallback(
    async (productId: string, images: string[], category?: string | null): Promise<string | null> => {
      return findBestFlatLayImage(productId, images, category);
    },
    []
  );

  const getCached = useCallback((productId: string): string | null => {
    return getCachedResult(productId);
  }, []);

  return {
    isModelLoading,
    isModelReady,
    loadProgress,
    classifyProductImages,
    getCached
  };
};
