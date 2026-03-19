/**
 * Filter images to only include those matching the product's SKU/product_code.
 * URLs typically contain the product code as part of the filename (e.g., CHPEU_117567_KK001_Full.jpg).
 * If no product_code is provided or no images match, returns all images unfiltered.
 */
export const filterImagesBySku = (images: string[], productCode: string | null | undefined): string[] => {
  if (!productCode || images.length === 0) return images;
  
  // Normalize: strip all non-alphanumeric characters for flexible matching
  // DB may store "2Y263B0101BEACH6301" while URLs contain "2Y263B0101BEACH_6301"
  const codeNormalized = productCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  const matched = images.filter(url => {
    // Normalize the URL path the same way for comparison
    const urlNormalized = url.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return urlNormalized.includes(codeNormalized);
  });
  
  // If we found matches, return them; otherwise return all images (don't hide everything)
  return matched.length > 0 ? matched : images;
};

/**
 * Check if a category represents shoes/footwear
 */
const isShoeCategory = (category: string | null | undefined): boolean => {
  if (!category) return false;
  const lowerCategory = category.toLowerCase();
  return lowerCategory.includes('shoe') || 
         lowerCategory.includes('scarpe') || 
         lowerCategory.includes('boot') || 
         lowerCategory.includes('stival') ||
         lowerCategory.includes('sandal') ||
         lowerCategory.includes('sneaker') ||
         lowerCategory.includes('mocassin') ||
         lowerCategory.includes('loafer') ||
         lowerCategory.includes('décolleté') ||
         lowerCategory.includes('decollete') ||
         lowerCategory.includes('pump') ||
         lowerCategory.includes('heel') ||
         lowerCategory.includes('ciabatt') ||
         lowerCategory.includes('slide');
};

/**
 * Check if a URL is a plain flat-lay product image (not close-up, not worn/model, not detail)
 * 
 * Champion URL patterns:
 * - _Full.jpg → main flat-lay product shot ✓ BEST
 * - _Full_Front.jpg → front flat-lay ✓ OK  
 * - _Full_Back.jpg → back flat-lay ✓ OK
 * - _Full_Crop.jpg → close-up/detail ✗ AVOID
 * - _Full_Alt1.jpg → alternate angle (often worn/model) ✗ AVOID
 * 
 * Max Mara URL patterns:
 * - -w- → flat lay ✓
 * - -a- → shoe flat lay ✓
 */
const isFlatLayUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  
  // Champion patterns: _Full.jpg is the clean flat-lay (no suffix after _Full)
  // Match _Full.jpg but NOT _Full_Crop, _Full_Alt, etc.
  if (lower.includes('_full.jpg') || lower.includes('_full.png')) {
    // Make sure it's truly just "_Full.ext" and not "_Full_Something.ext"
    const fullMatch = lower.match(/_full\.(jpg|png|webp)/);
    if (fullMatch) return true;
  }
  
  // Also match _Full_Front as a secondary flat-lay
  if (lower.includes('_full_front.')) return true;
  
  // Max Mara flat lay patterns
  if (lower.includes('-w-') && lower.includes('_normal.jpg')) return true;
  if (lower.includes('-a-') && lower.includes('_normal.jpg')) return true;
  
  return false;
};

/**
 * Check if a URL looks like a close-up, crop, or detail shot
 */
const isCloseUpOrDetail = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('_crop') || 
         lower.includes('_detail') || 
         lower.includes('_closeup') ||
         lower.includes('_close_up') ||
         lower.includes('_zoom');
};

/**
 * Check if a URL looks like a worn/model shot or alternate angle
 */
const isBackView = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('_back') || lower.includes('_rear');
};

const isWornOrAlternate = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.includes('_alt') || 
         lower.includes('_model') || 
         lower.includes('_worn') || 
         lower.includes('_lifestyle');
};

/**
 * Get the flat lay / product-only image from an array of images.
 * Prioritizes plain flat-lay shots over close-ups and worn/model images.
 * 
 * Priority order:
 * 1. SKU-matched plain flat-lay (_Full.jpg or -w-/_a- patterns)
 * 2. SKU-matched _Full_Front.jpg
 * 3. SKU-matched _Full_Back.jpg
 * 4. Any flat-lay image
 * 5. Any image that's NOT a close-up and NOT worn/alternate
 * 6. First non-thumbnail image
 * 7. First image
 */
export const getFlatLayImage = (images: string[] | null | undefined, category?: string | null): string | null => {
  if (!images || images.length === 0) return null;

  const isShoe = isShoeCategory(category);
  
  // For Max Mara compatibility: shoes use -a-, clothing uses -w-
  const primarySuffix = isShoe ? '-a-' : '-w-';
  const secondarySuffix = isShoe ? '-w-' : '-a-';

  // Priority 1: Plain _Full.ext with NO suffix after "Full" (no _Alt1, _Front, _Back, _Crop, etc.)
  const plainFull = images.find(img => {
    const lower = img.toLowerCase();
    return /_full\.(jpg|png|webp|jpeg)(\?.*)?$/.test(lower);
  });
  if (plainFull) return plainFull;

  // Priority 3: Max Mara primary suffix with normal size
  const primaryNormal = images.find(img => 
    img.includes(primarySuffix) && img.includes('_normal.jpg')
  );
  if (primaryNormal) return primaryNormal;

  // Priority 4: Max Mara secondary suffix with normal size
  const secondaryNormal = images.find(img => 
    img.includes(secondarySuffix) && img.includes('_normal.jpg')
  );
  if (secondaryNormal) return secondaryNormal;

  // Priority 5: Any Max Mara primary suffix image
  const primaryAny = images.find(img => img.includes(primarySuffix));
  if (primaryAny) return primaryAny;

  // Priority 6: Any Max Mara secondary suffix image
  const secondaryAny = images.find(img => img.includes(secondarySuffix));
  if (secondaryAny) return secondaryAny;

  // Priority 7: Any image that's NOT a close-up AND NOT a worn/alternate shot
  const cleanImage = images.find(img => 
    !isCloseUpOrDetail(img) && !isWornOrAlternate(img) && !isBackView(img) && !img.includes('#thumbnail')
  );
  if (cleanImage) return cleanImage;

  // Priority 8: First image that's not a thumbnail
  const firstNonThumb = images.find(img => !img.includes('#thumbnail'));
  if (firstNonThumb) return firstNonThumb;

  // Fallback: return first image
  return images[0];
};

/**
 * Get the worn / model image from an array of images
 */
export const getWornImage = (images: string[] | null | undefined): string | null => {
  if (!images || images.length === 0) return null;

  // Priority 1: Find a normal image that's NOT a flat lay
  const wornNormal = images.find(img => 
    img.includes('_normal.jpg') && 
    !img.includes('-w-') && 
    !img.includes('#thumbnail')
  );
  if (wornNormal) return wornNormal;

  // Priority 2: First non-flat-lay image
  const firstNonFlatLay = images.find(img => 
    !img.includes('-w-') && !img.includes('#thumbnail')
  );
  if (firstNonFlatLay) return firstNonFlatLay;

  // Fallback: return first image
  return images[0];
};

/**
 * Parse images from various formats (string, array, JSON string)
 */
export const parseImages = (images: unknown): string[] => {
  if (!images) return [];
  
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === 'string');
  }
  
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((img): img is string => typeof img === 'string');
      }
    } catch {
      // If it's not valid JSON, return as single-item array
      return [images];
    }
  }
  
  return [];
};

/**
 * Get the best main product image by first filtering to the correct SKU/color variant,
 * then selecting the flat-lay shot. This prevents showing images from other color variants.
 */
export const getMainProductImage = (
  images: unknown,
  productCode?: string | null,
  category?: string | null
): string | null => {
  const parsed = parseImages(images);
  if (parsed.length === 0) return null;
  
  const skuFiltered = filterImagesBySku(parsed, productCode);
  return getFlatLayImage(skuFiltered, category) || skuFiltered[0] || parsed[0];
};