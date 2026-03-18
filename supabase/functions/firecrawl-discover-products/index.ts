const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common category patterns for fashion/e-commerce sites
const CATEGORY_PATTERNS = [
  /\/(intimo|lingerie|underwear|bras?|panties|briefs|sleepwear|nightwear|swimwear|beachwear)\/?$/i,
  /\/(reggiseni|slip|body|corsetteria|pigiami|notte|mare|costumi)\/?$/i,
  /\/(clothing|clothes|apparel|fashion|collection|collections)\/?$/i,
  /\/(womens?|mens?|kids?|children|baby)\/?$/i,
  /\/(shop|store|catalog|products?|category|categories)\/?$/i,
  /\/(new|sale|outlet|bestsellers?|featured)\/?$/i,
  /\/[a-z-]{3,20}\/?$/, // Short paths like /dresses/, /tops/
];

// Product URL patterns - more inclusive to catch various e-commerce structures
const PRODUCT_PATTERNS = [
  /\/[a-z0-9-]+(-[a-z0-9]+){2,}/, // 3+ hyphenated segments (was 4+)
  /\/[a-z-]+-\d{3,}/, // Slug with product ID (3+ digits)
  /\/(product|item|p|pd|pdp|detail)\//, // Common product path prefixes
  /\/[a-z-]+\.(html?|aspx?|php)/i, // Product pages with extensions
  /\/[a-z0-9-]{10,}$/, // Long slugs at end of path (likely products)
  /\d{5,}/, // URLs containing 5+ digit numbers (product IDs)
];

interface DiscoveryOptions {
  pattern?: string;
  limit?: number;
  deepCrawl?: boolean;
  maxCategories?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, options = {} } = await req.json() as { url: string; options?: DiscoveryOptions };

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const baseUrl = new URL(formattedUrl).origin;
    const limit = options.limit || 5000; // Increased from 500 to 5000
    const deepCrawl = options.deepCrawl !== false; // Default to true
    const maxCategories = options.maxCategories || 30; // Increased from 10 to 30
    const customPattern = options.pattern ? new RegExp(options.pattern, 'i') : null;

    console.log(`Starting product discovery for: ${formattedUrl}`);
    console.log(`Options: deepCrawl=${deepCrawl}, limit=${limit}, maxCategories=${maxCategories}`);

    const allProductUrls = new Set<string>();
    const discoveredCategories = new Set<string>();

    // Step 1: Map the site to get initial URLs
    console.log('Step 1: Mapping site...');
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        limit: 5000,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapResponse.json();

    if (!mapResponse.ok) {
      console.error('Map API error:', mapData);
      return new Response(
        JSON.stringify({ success: false, error: mapData.error || 'Failed to map site' }),
        { status: mapResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mappedUrls: string[] = mapData.links || [];
    console.log(`Found ${mappedUrls.length} URLs from map`);

    // Identify product URLs and category URLs from map results
    for (const mappedUrl of mappedUrls) {
      const urlPath = new URL(mappedUrl).pathname;
      
      // Check if it's a product URL
      const isProduct = customPattern 
        ? customPattern.test(mappedUrl)
        : PRODUCT_PATTERNS.some(p => p.test(urlPath));
      
      if (isProduct) {
        allProductUrls.add(mappedUrl);
      }

      // Check if it's a category URL (for deep crawl)
      if (deepCrawl && discoveredCategories.size < maxCategories * 2) {
        const isCategory = CATEGORY_PATTERNS.some(p => p.test(urlPath));
        if (isCategory && urlPath.split('/').filter(Boolean).length <= 2) {
          discoveredCategories.add(mappedUrl);
        }
      }
    }

    console.log(`Initial product URLs from map: ${allProductUrls.size}`);
    console.log(`Category pages found: ${discoveredCategories.size}`);

    // Step 2: Deep crawl category pages to find more products
    if (deepCrawl && discoveredCategories.size > 0) {
      console.log('Step 2: Deep crawling category pages...');
      
      const categoriesToCrawl = Array.from(discoveredCategories).slice(0, maxCategories);
      
      for (const categoryUrl of categoriesToCrawl) {
        console.log(`Crawling category: ${categoryUrl}`);
        
        try {
          // Scrape the category page to get all links
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: categoryUrl,
              formats: ['links', 'html'],
              waitFor: 2000, // Wait for JS to load products
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            const links: string[] = scrapeData.data?.links || [];
            const html: string = scrapeData.data?.html || '';
            
            console.log(`Found ${links.length} links on ${categoryUrl}`);

            // Extract product URLs from links
            for (const link of links) {
              try {
                const linkUrl = new URL(link, baseUrl);
                if (linkUrl.origin !== baseUrl) continue; // Skip external links
                
                const urlPath = linkUrl.pathname;
                const isProduct = customPattern 
                  ? customPattern.test(link)
                  : PRODUCT_PATTERNS.some(p => p.test(urlPath));
                
                if (isProduct) {
                  allProductUrls.add(linkUrl.href);
                }
              } catch {
                // Invalid URL, skip
              }
            }

            // Also try to extract product URLs from HTML (look for href patterns)
            const hrefRegex = /href=["']([^"']+)["']/gi;
            let match;
            while ((match = hrefRegex.exec(html)) !== null) {
              try {
                const href = match[1];
                if (href.startsWith('#') || href.startsWith('javascript:')) continue;
                
                const linkUrl = new URL(href, baseUrl);
                if (linkUrl.origin !== baseUrl) continue;
                
                const urlPath = linkUrl.pathname;
                const isProduct = customPattern 
                  ? customPattern.test(href)
                  : PRODUCT_PATTERNS.some(p => p.test(urlPath));
                
                if (isProduct) {
                  allProductUrls.add(linkUrl.href);
                }
              } catch {
                // Invalid URL, skip
              }
            }

            // Check for pagination and crawl page 2 if exists
            const paginationMatch = html.match(/[?&]page=2|\/page\/2/i);
            if (paginationMatch) {
              const page2Url = categoryUrl.includes('?') 
                ? `${categoryUrl}&page=2`
                : `${categoryUrl}?page=2`;
              
              console.log(`Found pagination, crawling: ${page2Url}`);
              
              const page2Response = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: page2Url,
                  formats: ['links'],
                  waitFor: 2000,
                }),
              });

              if (page2Response.ok) {
                const page2Data = await page2Response.json();
                const page2Links: string[] = page2Data.data?.links || [];
                
                for (const link of page2Links) {
                  try {
                    const linkUrl = new URL(link, baseUrl);
                    if (linkUrl.origin !== baseUrl) continue;
                    
                    const urlPath = linkUrl.pathname;
                    const isProduct = customPattern 
                      ? customPattern.test(link)
                      : PRODUCT_PATTERNS.some(p => p.test(urlPath));
                    
                    if (isProduct) {
                      allProductUrls.add(linkUrl.href);
                    }
                  } catch {
                    // Invalid URL, skip
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error crawling category ${categoryUrl}:`, error);
        }

        // Rate limit between category crawls
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Convert to array and limit results
    const productUrls = Array.from(allProductUrls).slice(0, limit);

    console.log(`Discovery complete. Total product URLs found: ${productUrls.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        urls: productUrls,
        stats: {
          mappedUrls: mappedUrls.length,
          categoriesCrawled: deepCrawl ? Math.min(discoveredCategories.size, maxCategories) : 0,
          totalProducts: productUrls.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in firecrawl-discover-products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to discover products';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
