const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

export interface RelatedProduct {
  name: string;
  url: string;
  price: string;
  image: string;
}

export interface FashionProduct {
  productCode: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  composition: string;
  careInstructions: string;
  categories: string[];
  collection: string;
  images: string[];
  wearWith: RelatedProduct[];
  youMayAlsoLike: RelatedProduct[];
}

export interface ScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    json?: FashionProduct;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

const fashionProductSchema = {
  type: "object",
  properties: {
    productCode: {
      type: "string",
      description: "The product code, SKU, article number, or item number"
    },
    name: {
      type: "string",
      description: "The product name or title"
    },
    price: {
      type: "string",
      description: "The product price including currency symbol"
    },
    currency: {
      type: "string",
      description: "The currency code (USD, EUR, GBP, etc.)"
    },
    description: {
      type: "string",
      description: "The main product description including features and details"
    },
    composition: {
      type: "string",
      description: "The material composition with percentages (e.g., '70% lana, 30% cashmere')"
    },
    careInstructions: {
      type: "string",
      description: "Care and washing instructions (e.g., 'hand wash cold', 'do not bleach')"
    },
    categories: {
      type: "array",
      items: { type: "string" },
      description: "Array of product categories from breadcrumbs or category labels (e.g., 'Women', 'Dresses', 'Maxi Dresses')"
    },
    collection: {
      type: "string",
      description: "The collection name this product belongs to. Look for these La Perla collections: ATELIER INTRECCI, MAISON, M PER SEMPRE, SILK, DIAMANTE, NOTE BIANCHE, PETIT MACRAME, SIMPLE DAYS, TRIO OF BRIEFS, ZUCCHERO FILATO, DREAMLAND, PER LEI, POESIA, SOUPLE"
    },
    images: {
      type: "array",
      items: { type: "string" },
      description: "Array of all product image URLs"
    },
    wearWith: {
      type: "array",
      description: "Products shown as 'wear with', 'complete the look', 'completa il look', 'style with' - items to pair with this product",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "The related product name" },
          url: { type: "string", description: "The full URL to the related product page" },
          price: { type: "string", description: "The related product price" },
          image: { type: "string", description: "The related product image URL" }
        },
        required: ["name", "url", "price", "image"]
      }
    },
    youMayAlsoLike: {
      type: "array",
      description: "Products shown as 'you may also like', 'potrebbe piacerti', 'recommended for you', or general recommendations",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "The recommended product name" },
          url: { type: "string", description: "The full URL to the recommended product page" },
          price: { type: "string", description: "The recommended product price" },
          image: { type: "string", description: "The recommended product image URL" }
        },
        required: ["name", "url", "price", "image"]
      }
    }
  },
  required: ["productCode", "name", "price", "description", "composition", "careInstructions", "categories", "collection", "images", "wearWith", "youMayAlsoLike"]
};

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static removeApiKey(): void {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
  }

  // Helper to extract the real image URL for a related product from HTML
  private static extractImageForProductUrl(html: string, productUrl: string, baseUrl: string): string | null {
    if (!html || !productUrl) return null;
    
    // Extract product code from the URL (e.g., /p/2416035006 -> 2416035006)
    const codeMatch = productUrl.match(/\/p\/(\d+)/i) || productUrl.match(/(\d{10,})/);
    if (!codeMatch) return null;
    
    const productCode = codeMatch[1];
    console.log(`[Hybrid] Looking for image for product code: ${productCode}`);
    
    // Look for image URLs containing this product code in the HTML
    // Pattern: src="...2416035006..." or data-src="...2416035006..."
    const imgPatterns = [
      new RegExp(`(?:src|data-src|data-lazy)=["']([^"']*${productCode}[^"']*\\.(?:jpg|jpeg|png|webp)[^"']*)["']`, 'gi'),
      new RegExp(`https?://[^"'\\s]*${productCode}[^"'\\s]*\\.(?:jpg|jpeg|png|webp)`, 'gi'),
    ];
    
    for (const pattern of imgPatterns) {
      const match = pattern.exec(html);
      if (match) {
        const imgUrl = match[1] || match[0];
        if (imgUrl.startsWith('http')) {
          console.log(`[Hybrid] Found image for ${productCode}: ${imgUrl.substring(0, 80)}...`);
          return imgUrl;
        }
        // Resolve relative URL
        try {
          const resolved = new URL(imgUrl, baseUrl).href;
          console.log(`[Hybrid] Found image for ${productCode}: ${resolved.substring(0, 80)}...`);
          return resolved;
        } catch {
          return null;
        }
      }
    }
    
    return null;
  }

  static async mapBrandUrls(
    brandUrl: string,
    options?: { search?: string; limit?: number }
  ): Promise<{ success: boolean; urls?: string[]; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not found. Please add your Firecrawl API key.' };
    }

    try {
      const response = await fetch(`${FIRECRAWL_API_URL}/map`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: brandUrl,
          limit: options?.limit || 5000,
          includeSubdomains: true,
        }),
      });

      const data = await response.json();
      console.log('Map API response:', data);

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || `Request failed with status ${response.status}` 
        };
      }

      // Filter to only HTML pages (exclude assets, images, files)
      const nonHtmlExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp',
        '.css', '.js', '.json', '.xml', '.txt', '.pdf', '.doc', '.docx',
        '.xls', '.xlsx', '.zip', '.rar', '.mp3', '.mp4', '.avi', '.mov',
        '.woff', '.woff2', '.ttf', '.eot', '.otf', '.map'
      ];
      
      const htmlUrls = (data.links || []).filter((url: string) => {
        const lowerUrl = url.toLowerCase();
        // Exclude URLs with non-HTML file extensions
        return !nonHtmlExtensions.some(ext => lowerUrl.endsWith(ext));
      });
      
      return { success: true, urls: htmlUrls };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to map URLs' 
      };
    }
  }

  static async scrapeFashionProduct(url: string): Promise<ScrapeResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not found. Please add your Firecrawl API key.' };
    }

    try {
      // HYBRID APPROACH: 
      // 1. Use free scraper for main product images (from initial HTML)
      // 2. Use Firecrawl's rendered HTML (with JS executed) + DOM parsing for related products
      // 3. Use Firecrawl AI for text fields only (name, description, composition, etc.)
      const { FreeScraperService } = await import('./FreeScraperService');
      const reliableImageData = await FreeScraperService.fetchHtmlAndExtractImages(url);
      console.log('[Hybrid] Main images from initial HTML:', reliableImageData.images.length);

      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['json', 'html', 'links'],
          jsonOptions: {
            schema: fashionProductSchema,
            prompt: `Extract all fashion product information from this e-commerce page.

CRITICAL RULES:
1. Each related product MUST be UNIQUE - do NOT include duplicates with the same name or URL
2. EVERY image URL MUST be the FULL, COMPLETE URL exactly as it appears in the HTML
3. Do NOT truncate or modify image URLs - copy them exactly including any hash fragments (#product etc.)
4. Look for the highest quality image URLs in: data-zoom-image, data-full-image, data-large-image, JSON-LD structured data

MAIN PRODUCT:
- images: Extract ALL product image URLs from the gallery/carousel. Look for:
  * data-zoom-image or data-full-image attributes (highest quality)
  * JSON-LD structured data (@type: Product) 
  * <picture> source srcset
  * The COMPLETE URL path - do not shorten or modify
- productCode: Look for "Codice prodotto", "Product code", "SKU", "Art.", "Articolo"
- description: From "Dettagli" or "Details" section
- composition: Material percentages from "Composizione" section  
- careInstructions: From "Lavaggio" or care icons section

RELATED PRODUCTS - Extract TWO SEPARATE arrays:

1. "wearWith" - ONLY from sections labeled: "Completa il look", "Complete the look", "Wear it with", "Shop the look"

2. "youMayAlsoLike" - ONLY from sections labeled: "Potrebbe piacerti anche", "You may also like", "Ti potrebbe interessare"

For EACH related product, extract the FULL URLs without modification:
- name: the product name (must be unique per array)
- url: the COMPLETE product URL 
- price: the price with currency symbol
- image: the COMPLETE image URL exactly as it appears

IMPORTANT: Copy ALL URLs exactly as they appear - do not shorten paths or remove query strings/hash fragments.`
          },
          onlyMainContent: false,
          waitFor: 3000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || `Request failed with status ${response.status}` 
        };
      }

      // Extract images from HTML if available
      const extractImagesFromHtml = (html: string | undefined): string[] => {
        if (!html) return [];
        const images: string[] = [];
        
        // Priority order: data-zoom-image, data-full-image, data-large-image, data-src, src
        const highQualityAttrs = [
          'data-zoom-image',
          'data-full-image', 
          'data-large-image',
          'data-highres',
          'data-zoom',
          'data-master'
        ];
        
        // First try to get high-quality image URLs
        for (const attr of highQualityAttrs) {
          const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'gi');
          let match;
          while ((match = regex.exec(html)) !== null) {
            const imgUrl = match[1];
            if (imgUrl && imgUrl.startsWith('http')) {
              images.push(imgUrl);
            }
          }
        }
        
        // Look for picture source elements with srcset (often has highest quality)
        const sourceRegex = /<source[^>]+srcset=["']([^"'\s,]+)/gi;
        let match;
        while ((match = sourceRegex.exec(html)) !== null) {
          const imgUrl = match[1];
          if (imgUrl && imgUrl.startsWith('http') && !imgUrl.includes('placeholder')) {
            images.push(imgUrl);
          }
        }
        
        // Extract from img tags - check multiple attributes
        const imgTagRegex = /<img[^>]*>/gi;
        while ((match = imgTagRegex.exec(html)) !== null) {
          const imgTag = match[0];
          
          // Try data-src first (lazy loading), then src
          const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
          const srcMatch = imgTag.match(/\ssrc=["']([^"']+)["']/i);
          const dataOrigMatch = imgTag.match(/data-original=["']([^"']+)["']/i);
          
          const imgUrl = dataSrcMatch?.[1] || dataOrigMatch?.[1] || srcMatch?.[1];
          if (imgUrl && imgUrl.startsWith('http') && !imgUrl.includes('placeholder') && !imgUrl.includes('spinner') && !imgUrl.includes('icon')) {
            images.push(imgUrl);
          }
        }
        
        // Look for JSON-LD structured data which often has correct image URLs
        const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        while ((match = jsonLdRegex.exec(html)) !== null) {
          try {
            const jsonData = JSON.parse(match[1]);
            if (jsonData.image) {
              const imgs = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
              imgs.forEach((img: string | { url?: string }) => {
                const imgUrl = typeof img === 'string' ? img : img.url;
                if (imgUrl && imgUrl.startsWith('http')) {
                  images.push(imgUrl);
                }
              });
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }
        
        // Normalize MaxMara image URLs to the correct format:
        // https://b2c-media.maxmara.com/sys-master/m0/MM/2025/2/5046045106/009/s3details/5046045106009-w-lamine_normal.jpg#product
        const normalizeMaxMaraUrl = (url: string): string => {
          if (!url.includes('maxmara.com')) return url;
          
          // Extract the 10-digit product code from URL
          const codeMatch = url.match(/(\d{10})/);
          if (!codeMatch) return url;
          
          const productCode = codeMatch[1];
          const prefix = productCode.slice(0, 7); // e.g., "5046045106" -> "5046045"
          const suffix = productCode.slice(7);    // e.g., "106" -> "009"
          
          // Try to extract the path components before the product code
          // Format: /sys-master/m0/MM/{year}/{number}/{prefix}/{suffix}/s3details/
          const pathMatch = url.match(/sys-master\/([^\/]+)\/([^\/]+)\/(\d{4})\/(\d+)/);
          if (!pathMatch) return url;
          
          const [, m0, mm, year, num] = pathMatch;
          
          // Extract image filename suffix (e.g., "-w-lamine_normal" or "-a-DEFILE_normal")
          const filenameMatch = url.match(/\d{10}(-[a-z]-[^.]+)/i);
          const filenameSuffix = filenameMatch ? filenameMatch[1] : '-a-DEFILE_normal';
          
          // Construct the correct URL format
          const correctUrl = `https://b2c-media.maxmara.com/sys-master/${m0}/${mm}/${year}/${num}/${prefix}/${suffix}/s3details/${productCode}${filenameSuffix}.jpg#product`;
          
          return correctUrl;
        };
        
        // Deduplicate, normalize, and prefer longer URLs (usually more complete paths)
        const uniqueImages = [...new Set(images)].map(normalizeMaxMaraUrl);
        return uniqueImages.sort((a, b) => b.length - a.length);
      };

      // Note: extractRelatedProductImages removed - now using FreeScraperService.fetchHtmlAndExtractImages for reliable extraction

      // Process and combine data from multiple sources
      const jsonData = data.data?.json as FashionProduct | undefined;
      const htmlData = data.data?.html as string | undefined;
      
      if (jsonData) {
        // HYBRID: Use images from free scraper (initial HTML) - these are reliable
        if (reliableImageData.images.length > 0) {
          console.log('[Hybrid] Using main images from initial HTML:', reliableImageData.images.length);
          jsonData.images = reliableImageData.images;
        } else if (!jsonData.images || jsonData.images.length === 0) {
          // Fallback: try extracting from Firecrawl's HTML response
          const htmlImages = extractImagesFromHtml(htmlData);
          if (htmlImages.length > 0) {
            jsonData.images = htmlImages;
            console.log('Extracted images from Firecrawl HTML:', htmlImages.length);
          }
        }
        
      // HYBRID: Parse related products from Firecrawl's RENDERED HTML (has JS-loaded content)
        // This gives us correct URLs because we use DOM parsing, not AI extraction
        if (htmlData) {
          // Debug: Check if related product sections exist in Firecrawl HTML
          const hasCompleteOutfit = htmlData.includes('complete-you-outfit') || htmlData.includes('complete-your-outfit') || htmlData.includes('completa-il-look');
          const hasYouMayLike = htmlData.includes('you-may-also-like') || htmlData.includes('potrebbe-piacerti');
          console.log('[Hybrid] Firecrawl HTML contains: completeOutfit=', hasCompleteOutfit, ', youMayLike=', hasYouMayLike);
          console.log('[Hybrid] Firecrawl HTML length:', htmlData.length);
          
          const relatedProducts = FreeScraperService.parseRelatedProductsFromHtml(htmlData, url);
          
          if (relatedProducts.wearWith.length > 0) {
            console.log('[Hybrid] Using DOM-parsed wearWith from Firecrawl HTML:', relatedProducts.wearWith.length);
            jsonData.wearWith = relatedProducts.wearWith;
          } else if (jsonData.wearWith && jsonData.wearWith.length > 0) {
            // Fallback: use Firecrawl's AI extraction but try to fix image URLs
            console.log('[Hybrid] Using Firecrawl AI wearWith, fixing images...');
            const seen = new Set<string>();
            jsonData.wearWith = jsonData.wearWith
              .filter(item => {
                const key = item.url || item.name;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .map(item => ({
                ...item,
                // Extract real image from the product URL in the HTML
                image: this.extractImageForProductUrl(htmlData, item.url, url) || item.image
              }));
          }
          
          if (relatedProducts.youMayAlsoLike.length > 0) {
            console.log('[Hybrid] Using DOM-parsed youMayAlsoLike from Firecrawl HTML:', relatedProducts.youMayAlsoLike.length);
            jsonData.youMayAlsoLike = relatedProducts.youMayAlsoLike;
          } else if (jsonData.youMayAlsoLike && jsonData.youMayAlsoLike.length > 0) {
            // Fallback: use Firecrawl's AI extraction but try to fix image URLs
            console.log('[Hybrid] Using Firecrawl AI youMayAlsoLike, fixing images...');
            const seen = new Set<string>();
            jsonData.youMayAlsoLike = jsonData.youMayAlsoLike
              .filter(item => {
                const key = item.url || item.name;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .map(item => ({
                ...item,
                image: this.extractImageForProductUrl(htmlData, item.url, url) || item.image
              }));
          }
        }
        
        console.log('Final processed - images:', jsonData.images?.length || 0, 
                    'wearWith:', jsonData.wearWith?.length || 0,
                    'youMayAlsoLike:', jsonData.youMayAlsoLike?.length || 0);
      }
      
      return { 
        success: true, 
        data: {
          json: jsonData,
          metadata: data.data?.metadata
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape URL' 
      };
    }
  }
}
