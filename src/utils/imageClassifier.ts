import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let classifier: any = null;
let isLoading = false;
let loadingPromise: Promise<any> | null = null;

const CACHE_KEY = 'image_classification_cache';
const PERSON_LABELS = [
  'person', 'man', 'woman', 'human', 'people', 'model', 'fashion model',
  'suit', 'dress', 'jersey', 'jean', 'sweatshirt', 'miniskirt', 'gown',
  'trench coat', 'cardigan', 'poncho', 'cloak', 'lab coat', 'velvet'
];

interface ClassificationResult {
  flatLayIndex: number;
  confidence: number;
}

interface CacheEntry {
  productId: string;
  imageUrl: string;
  timestamp: number;
}

/**
 * Get cached classification result for a product
 */
export const getCachedResult = (productId: string): string | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry = cache[productId] as CacheEntry | undefined;
    if (entry) {
      return entry.imageUrl;
    }
  } catch (e) {
    console.warn('Failed to read classification cache:', e);
  }
  return null;
};

/**
 * Save classification result to cache
 */
const setCachedResult = (productId: string, imageUrl: string): void => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[productId] = {
      productId,
      imageUrl,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save classification cache:', e);
  }
};

/**
 * Load the classification model (lazy loading)
 */
export const loadClassifier = async (onProgress?: (progress: number) => void): Promise<boolean> => {
  if (classifier) return true;
  
  if (loadingPromise) {
    await loadingPromise;
    return !!classifier;
  }

  isLoading = true;
  
  loadingPromise = (async () => {
    try {
      console.log('Loading image classification model...');
      classifier = await pipeline(
        'image-classification',
        'Xenova/vit-base-patch16-224',
        {
          progress_callback: (progress: any) => {
            if (progress.status === 'progress' && onProgress) {
              onProgress(Math.round(progress.progress));
            }
          }
        }
      );
      console.log('Image classification model loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load classifier:', error);
      return false;
    } finally {
      isLoading = false;
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

/**
 * Check if the classifier is currently loading
 */
export const isClassifierLoading = (): boolean => isLoading;

/**
 * Check if the classifier is ready
 */
export const isClassifierReady = (): boolean => !!classifier;

/**
 * Classify a single image and return person confidence score
 */
const classifyImage = async (imageUrl: string): Promise<number> => {
  if (!classifier) {
    throw new Error('Classifier not loaded');
  }

  try {
    const results = await classifier(imageUrl, { topk: 5 });
    
    // Calculate person/worn confidence based on detected labels
    let personScore = 0;
    for (const result of results) {
      const label = result.label.toLowerCase();
      if (PERSON_LABELS.some(p => label.includes(p))) {
        personScore += result.score;
      }
    }
    
    return personScore;
  } catch (error) {
    console.warn('Failed to classify image:', imageUrl, error);
    return 0;
  }
};

/**
 * Find the best flat lay image from an array of images
 * Returns the image URL with the lowest "person" confidence
 */
export const findBestFlatLayImage = async (
  productId: string,
  images: string[],
  category?: string | null
): Promise<string | null> => {
  if (!images || images.length === 0) return null;

  // Check cache first
  const cached = getCachedResult(productId);
  if (cached && images.includes(cached)) {
    return cached;
  }

  if (!classifier) {
    console.warn('Classifier not loaded, returning first image');
    return images[0];
  }

  // Filter to normal-sized images for classification
  const normalImages = images.filter(img => img.includes('_normal.jpg'));
  const imagesToClassify = normalImages.length > 0 ? normalImages : images.slice(0, 4);

  let bestImage = imagesToClassify[0];
  let lowestPersonScore = Infinity;

  for (const imageUrl of imagesToClassify) {
    const personScore = await classifyImage(imageUrl);
    console.log(`Image ${imageUrl.split('/').pop()}: person score = ${personScore.toFixed(3)}`);
    
    if (personScore < lowestPersonScore) {
      lowestPersonScore = personScore;
      bestImage = imageUrl;
    }
  }

  // Cache the result
  setCachedResult(productId, bestImage);
  
  return bestImage;
};
