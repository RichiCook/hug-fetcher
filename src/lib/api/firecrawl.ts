import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
  urls?: string[];
  stats?: {
    mappedUrls: number;
    categoriesCrawled: number;
    totalProducts: number;
  };
};

type DiscoverProductsOptions = {
  pattern?: string;
  limit?: number;
  deepCrawl?: boolean;
  maxCategories?: number;
};

export const firecrawlApi = {
  /**
   * Discover product URLs from a brand/e-commerce site
   * Uses Firecrawl's Map + Crawl to find all product pages
   */
  async discoverProducts(
    url: string, 
    options?: DiscoverProductsOptions
  ): Promise<FirecrawlResponse<string[]>> {
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-discover-products', {
        body: { url, options },
      });

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      console.error('Error calling firecrawl-discover-products:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to discover products' 
      };
    }
  },
};
