// Updated CORS proxies - January 2026 (Champion.com compatible)
const CORS_PROXIES = [
  "https://corsproxy.io/?",                           // Most reliable, supports all methods
  "https://api.allorigins.win/raw?url=",              // Good fallback, 20/min rate limit
  "https://proxy.cors.sh/",                           // cors.sh - reliable
  "https://cors-anywhere.herokuapp.com/",             // Classic, 50/3min limit
  "https://api.codetabs.com/v1/proxy?quest=",         // GET only, 5/sec limit
  "https://corsproxy.org/?",                          // Alternative corsproxy
];

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
    json?: FashionProduct;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

export class FreeScraperService {
  private static currentProxyIndex = 0;

  private static getNextProxy(): string {
    const proxy = CORS_PROXIES[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % CORS_PROXIES.length;
    return proxy;
  }

  // Check if the response looks like a valid HTML page (not a blocked/error page)
  private static isValidHtmlResponse(html: string): boolean {
    // Check for common block/error patterns
    const blockPatterns = [
      /access denied/i,
      /blocked/i,
      /captcha/i,
      /cloudflare/i,
      /please enable javascript/i,
      /checking your browser/i,
      /ray id/i,
      /error 403/i,
      /error 503/i,
      /just a moment/i,
    ];
    
    // If HTML is very short, it's likely an error
    if (html.length < 500) {
      console.log(`[Scraper] HTML too short (${html.length} bytes), likely blocked`);
      return false;
    }
    
    // Check for block patterns
    for (const pattern of blockPatterns) {
      if (pattern.test(html)) {
        console.log(`[Scraper] Detected block pattern: ${pattern}`);
        return false;
      }
    }
    
    // Should have basic HTML structure
    if (!html.includes('<body') && !html.includes('<html')) {
      console.log(`[Scraper] No HTML structure found`);
      return false;
    }
    
    return true;
  }

  private static async fetchWithProxy(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxy = this.getNextProxy();
      try {
        const targetUrl = proxy + encodeURIComponent(url);
        
        console.log(`[Scraper] Trying proxy: ${proxy} for URL: ${url}`);
        const response = await fetch(targetUrl, {
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        console.log(`[Scraper] Received ${html.length} bytes of HTML`);

        // Check if response looks valid
        if (!this.isValidHtmlResponse(html)) {
          throw new Error("Response appears to be blocked or invalid");
        }

        // Log first 500 chars for debugging
        console.log(`[Scraper] HTML preview:`, html.substring(0, 500));

        return html;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        console.log(`[Scraper] Proxy ${proxy} failed:`, lastError.message);
      }
    }

    throw lastError || new Error("All proxies failed");
  }

  private static extractProductData(html: string, url: string): FashionProduct {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract product name
    const name = this.extractName(doc, url);

    // Extract price
    const { price, currency } = this.extractPrice(doc);

    // Extract description
    const description = this.extractDescription(doc);

    // Extract composition and care instructions
    const { composition, careInstructions } = this.extractCompositionAndCare(doc);

    // Extract images
    const images = this.extractImages(doc, url);

    // Extract product code/SKU
    const productCode = this.extractProductCode(doc, html, url);

    // Extract categories from breadcrumbs
    const categories = this.extractCategories(doc);

    // Extract collection name
    const collection = this.extractCollection(doc, html);

    // Extract wear with / completa il look products
    const wearWith = this.extractWearWith(doc, url);

    // Extract "you may also like" products separately
    const youMayAlsoLike = this.extractYouMayAlsoLike(doc, url);

    return {
      productCode,
      name,
      price,
      currency,
      description,
      composition,
      careInstructions,
      categories,
      collection,
      images,
      wearWith,
      youMayAlsoLike,
    };
  }

  // La Perla collections list
  private static LA_PERLA_COLLECTIONS = [
    'ATELIER INTRECCI',
    'MAISON',
    'M PER SEMPRE',
    'SILK',
    'DIAMANTE',
    'NOTE BIANCHE',
    'PETIT MACRAME',
    'SIMPLE DAYS',
    'TRIO OF BRIEFS',
    'ZUCCHERO FILATO',
    'DREAMLAND',
    'PER LEI',
    'POESIA',
    'SOUPLE'
  ];

  private static extractCollection(doc: Document, html: string): string {
    // Try various selectors for collection name
    const collectionSelectors = [
      '[class*="collection-name"]',
      '[class*="collection-title"]',
      '[data-collection]',
      '[class*="product-collection"]',
      '.collection',
      '[class*="line-name"]',
      '[class*="linea"]',
      // La Perla specific
      '[class*="collezione"]',
      '[class*="collection"]',
      '.breadcrumb',
      '[class*="breadcrumb"]',
    ];

    for (const selector of collectionSelectors) {
      const element = doc.querySelector(selector);
      if (element?.textContent?.trim()) {
        const text = element.textContent.trim().toUpperCase();
        // Check if it matches a known collection
        for (const collection of this.LA_PERLA_COLLECTIONS) {
          if (text.includes(collection) || text.includes(collection.replace(/ /g, '-'))) {
            return collection;
          }
        }
      }
    }

    // Try to find collection in structured data
    const ldJsonScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ldJsonScripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data.brand?.name && data.category) {
          const category = Array.isArray(data.category) ? data.category.join(' > ') : data.category;
          const upperCategory = category.toUpperCase();
          for (const collection of this.LA_PERLA_COLLECTIONS) {
            if (upperCategory.includes(collection)) {
              return collection;
            }
          }
        }
        if (data.collection) {
          const upperCollection = data.collection.toUpperCase();
          for (const collection of this.LA_PERLA_COLLECTIONS) {
            if (upperCollection.includes(collection)) {
              return collection;
            }
          }
          return data.collection;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check URL for collection names
    const url = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const upperUrl = url.toUpperCase();
    for (const collection of this.LA_PERLA_COLLECTIONS) {
      const urlVariant = collection.replace(/ /g, '-');
      if (upperUrl.includes(urlVariant) || upperUrl.includes(collection.replace(/ /g, ''))) {
        return collection;
      }
    }

    // Search in HTML content for collection mentions
    const upperHtml = html.toUpperCase();
    
    // Create search patterns for each collection
    for (const collection of this.LA_PERLA_COLLECTIONS) {
      const patterns = [
        collection,
        collection.replace(/ /g, '-'),
        collection.replace(/ /g, '_'),
        collection.replace(/ /g, ''),
      ];
      
      for (const pattern of patterns) {
        // Look for collection in specific contexts
        const contextPatterns = [
          new RegExp(`collection[:\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          new RegExp(`collezione[:\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          new RegExp(`linea[:\\s"']+${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          new RegExp(`>${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`, 'i'),
        ];
        
        for (const regex of contextPatterns) {
          if (regex.test(html)) {
            return collection;
          }
        }
      }
    }

    // Last resort: check breadcrumbs and meta tags
    const metaTags = doc.querySelectorAll('meta[property*="category"], meta[name*="category"]');
    for (const meta of metaTags) {
      const content = meta.getAttribute('content')?.toUpperCase() || '';
      for (const collection of this.LA_PERLA_COLLECTIONS) {
        if (content.includes(collection)) {
          return collection;
        }
      }
    }

    return '';
  }

  private static extractName(doc: Document, url?: string): string {
    // Common error/empty state messages to ignore
    const invalidNames = [
      "nessun risultato",
      "no results",
      "page not found",
      "404",
      "error",
      "not found",
      "pagina non trovata",
      "errore",
      "risultati",
      "search results",
      "unknown product",
      "max mara", // Just brand name, not product
    ];

    const isValidName = (text: string): boolean => {
      if (!text) return false;
      const lower = text.toLowerCase().trim();
      // Reject if it matches common error messages
      if (
        invalidNames.some(
          (invalid) => lower === invalid || lower.startsWith(invalid + " ") || lower.endsWith(" " + invalid),
        )
      ) {
        return false;
      }
      // Reject if EXACTLY matches an invalid name
      if (invalidNames.includes(lower)) {
        return false;
      }
      // Reject very short names (likely not product names)
      if (lower.length < 3) return false;
      // Reject if it's just numbers
      if (/^\d+$/.test(lower)) return false;
      return true;
    };

    const cleanName = (text: string): string => {
      return text
        .replace(/\s+/g, " ")
        .replace(/\s*-\s*Max Mara.*$/i, "")
        .replace(/\s*\|\s*Max Mara.*$/i, "")
        .trim();
    };

    // Try JSON-LD structured data first (most reliable)
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || "");
        const products = Array.isArray(data) ? data : [data];
        for (const item of products) {
          if (item["@type"] === "Product" && item.name) {
            const name = cleanName(item.name);
            if (isValidName(name)) {
              console.log("[Scraper] Found name from JSON-LD:", name);
              return name;
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    // Try common product name selectors
    const selectors = [
      'h1[itemprop="name"]',
      '[data-testid="product-name"]',
      '[data-testid="productName"]',
      ".pdp__info__header h1",
      ".product-name h1",
      ".product-title",
      ".product__title",
      ".pdp-title",
      "h1.title",
      '[class*="product-name"]',
      '[class*="product-title"]',
      "h1",
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      const text = cleanName(el?.textContent || "");
      if (text && isValidName(text)) {
        console.log("[Scraper] Found name from selector:", selector, "->", text);
        return text;
      }
    }

    // Try og:title meta tag as fallback
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
    if (ogTitle) {
      const cleaned = cleanName(ogTitle);
      if (isValidName(cleaned)) {
        console.log("[Scraper] Found name from og:title:", cleaned);
        return cleaned;
      }
    }

    // Try to extract from first product image alt text
    const imgAlt = doc.querySelector('.pdp__images img, [class*="product"] img, main img')?.getAttribute("alt");
    if (imgAlt) {
      const cleaned = cleanName(imgAlt);
      if (isValidName(cleaned)) {
        console.log("[Scraper] Found name from img alt:", cleaned);
        return cleaned;
      }
    }

    // Try page title as fallback
    const pageTitle = doc.querySelector("title")?.textContent?.trim();
    if (pageTitle) {
      const cleaned = cleanName(pageTitle.split(/\s*[|–]\s*/)[0]);
      if (isValidName(cleaned)) {
        console.log("[Scraper] Found name from page title:", cleaned);
        return cleaned;
      }
    }

    // Last resort: try to extract from URL
    if (url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        // Look for product slug in path (usually the last part)
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const part = pathParts[i];
          // Skip if it looks like a product code (mostly numbers/codes)
          if (/^[a-z0-9-]+$/i.test(part) && !/^\d+$/.test(part) && part.includes("-")) {
            const nameFromUrl = part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            if (isValidName(nameFromUrl) && nameFromUrl.length > 5) {
              console.log("[Scraper] Extracted name from URL:", nameFromUrl);
              return nameFromUrl;
            }
          }
        }
      } catch {
        // Invalid URL
      }
    }

    console.log("[Scraper] Could not extract valid name");
    return "Unknown Product";
  }

  private static extractPrice(doc: Document): { price: string; currency: string } {
    const selectors = [
      '[itemprop="price"]',
      '[data-testid="price"]',
      '[data-testid="product-price"]',
      ".product-price",
      ".price",
      ".pdp-price",
      '[class*="price"]',
      '[class*="Price"]',
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      const text = el?.textContent?.trim();
      if (text) {
        // Extract currency symbol
        const currencyMatch = text.match(/[$€£¥₹]/);
        const currency = currencyMatch ? this.currencySymbolToCode(currencyMatch[0]) : "USD";
        return { price: text, currency };
      }
    }

    // Try meta tag
    const priceMeta = doc.querySelector('meta[property="product:price:amount"]');
    const currencyMeta = doc.querySelector('meta[property="product:price:currency"]');
    if (priceMeta) {
      const amount = priceMeta.getAttribute("content") || "";
      const currency = currencyMeta?.getAttribute("content") || "USD";
      return { price: amount, currency };
    }

    return { price: "N/A", currency: "USD" };
  }

  private static currencySymbolToCode(symbol: string): string {
    const map: Record<string, string> = {
      $: "USD",
      "€": "EUR",
      "£": "GBP",
      "¥": "JPY",
      "₹": "INR",
    };
    return map[symbol] || "USD";
  }

  private static extractDescription(doc: Document): string {
    // First try to find by heading text (multilingual)
    const headingTexts = ["dettagli", "details", "description", "descrizione", "détails", "detalles"];
    const headings = doc.querySelectorAll(
      'h2, h3, h4, strong, b, [class*="heading"], [class*="title"], [class*="accordion"]',
    );

    for (const heading of headings) {
      const text = heading.textContent?.toLowerCase().trim() || "";
      if (headingTexts.some((t) => text === t || text.startsWith(t))) {
        // Found the heading, get content from parent section or sibling
        const section =
          heading.closest("section") ||
          heading.closest('[class*="detail"]') ||
          heading.closest('[class*="accordion"]') ||
          heading.parentElement;
        if (section) {
          // Get all text content except the heading itself
          const clone = section.cloneNode(true) as Element;
          const headingInClone = clone.querySelector("h2, h3, h4, strong, b");
          if (headingInClone) headingInClone.remove();
          const content = clone.textContent?.trim() || "";
          if (content.length > 20) {
            return content.substring(0, 1000);
          }
        }
        // Try next sibling
        let sibling = heading.nextElementSibling;
        while (sibling) {
          const content = sibling.textContent?.trim() || "";
          if (content.length > 20) {
            return content.substring(0, 1000);
          }
          sibling = sibling.nextElementSibling;
        }
      }
    }

    // Fallback: try common selectors
    const selectors = [
      '[itemprop="description"]',
      '[data-testid="product-description"]',
      ".product-description",
      ".product-details",
      ".pdp-description",
      "#product-description",
      '[class*="description"]',
      '[class*="dettagli"]',
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim().substring(0, 1000);
      }
    }

    // Try meta description
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc) {
      return metaDesc.getAttribute("content") || "";
    }

    return "";
  }

  private static extractCompositionAndCare(doc: Document): { composition: string; careInstructions: string } {
    let composition = "";
    let careInstructions = "";

    // Look for "Composizione e lavaggio" or similar headings
    const headingTexts = [
      "composizione e lavaggio",
      "composizione",
      "composition",
      "materiale",
      "material",
      "fabric",
      "tessuto",
      "matériaux",
      "composición",
    ];

    const headings = doc.querySelectorAll(
      'h2, h3, h4, strong, b, [class*="heading"], [class*="title"], [class*="accordion"]',
    );

    for (const heading of headings) {
      const text = heading.textContent?.toLowerCase().trim() || "";
      if (headingTexts.some((t) => text.includes(t))) {
        // Found the heading, get content from parent section
        const section =
          heading.closest("section") ||
          heading.closest('[class*="composition"]') ||
          heading.closest('[class*="accordion"]') ||
          heading.parentElement;

        if (section) {
          const content = section.textContent?.trim() || "";
          // Remove the heading text
          const cleanContent = content.replace(new RegExp(heading.textContent || "", "i"), "").trim();

          // Split by percentage pattern - composition usually has percentages
          const lines = cleanContent.split(/[.;]\s*/);

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Check if line contains percentage (composition)
            if (/%/.test(trimmedLine) && !composition) {
              composition = trimmedLine;
            }
            // Care instructions often contain washing/ironing keywords
            else if (/lavar|wash|iron|ferro|asciug|dry|clean|pulit|candeg|bleach/i.test(trimmedLine)) {
              careInstructions = careInstructions ? careInstructions + "; " + trimmedLine : trimmedLine;
            }
          }

          if (composition || careInstructions) break;
        }
      }
    }

    // Fallback: look for percentage patterns anywhere
    if (!composition) {
      const allText = doc.body?.textContent || "";
      const compositionMatch = allText.match(/\d+%\s*\w+[^.]*(?:,\s*\d+%\s*\w+[^.]*)*/);
      if (compositionMatch) {
        composition = compositionMatch[0].trim();
      }
    }

    return { composition, careInstructions };
  }

  private static extractImages(doc: Document, baseUrl: string): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    console.log("[FreeScraper] Extracting images...");

    // Try product image selectors - expanded for MaxMara and other sites
    const selectors = [
      // MaxMara specific
      ".w-pdp-image-carousel img",
      ".w-pdp-image img",
      '[class*="pdp-image"] img',
      ".slick-slide img",
      // Generic selectors
      '[data-testid="product-image"] img',
      ".product-image img",
      ".product-gallery img",
      ".pdp-image img",
      '[class*="product-image"] img',
      '[class*="gallery"] img',
      '[class*="carousel"] img',
      '[class*="slider"] img',
      "picture source",
      "picture img",
      '[itemprop="image"]',
      // Fallback: main content area images
      "main img",
      "#main img",
      ".main-content img",
    ];

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`[FreeScraper] Found ${elements.length} elements via: ${selector}`);
      }
      elements.forEach((el) => {
        const src =
          el.getAttribute("src") ||
          el.getAttribute("data-src") ||
          el.getAttribute("data-lazy") ||
          el.getAttribute("srcset")?.split(" ")[0] ||
          el.getAttribute("content");
        if (src && !seen.has(src) && this.isValidProductImage(src)) {
          seen.add(src);
          images.push(this.resolveUrl(src, baseUrl));
        }
      });
    }

    // Also try og:image
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const src = ogImage.getAttribute("content");
      if (src && !seen.has(src)) {
        console.log("[FreeScraper] Found og:image");
        images.push(this.resolveUrl(src, baseUrl));
      }
    }

    // Try JSON-LD for images
    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
    if (jsonLd?.textContent) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        const ldImages = data.image || data.images || [];
        const imgArray = Array.isArray(ldImages) ? ldImages : [ldImages];
        for (const img of imgArray) {
          const src = typeof img === "string" ? img : img?.url;
          if (src && !seen.has(src)) {
            console.log("[FreeScraper] Found image in JSON-LD");
            seen.add(src);
            images.push(this.resolveUrl(src, baseUrl));
          }
        }
      } catch {}
    }

    console.log(`[FreeScraper] Total images found: ${images.length}`);
    return images.slice(0, 10);
  }

  // Public method for hybrid scraping - fetch HTML and extract images reliably
  static async fetchHtmlAndExtractImages(url: string): Promise<{
    html: string;
    images: string[];
  }> {
    try {
      const html = await this.fetchWithProxy(url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const images = this.extractImages(doc, url);
      console.log("[FreeScraper Hybrid] Extracted:", images.length, "images from initial HTML");
      return { html, images };
    } catch (error) {
      console.error("[FreeScraper] Failed to fetch HTML for hybrid extraction:", error);
      return { html: "", images: [] };
    }
  }

  // Public method to parse related products from any HTML (including Firecrawl's rendered HTML)
  static parseRelatedProductsFromHtml(
    html: string,
    url: string,
  ): {
    wearWith: RelatedProduct[];
    youMayAlsoLike: RelatedProduct[];
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const wearWith = this.extractWearWith(doc, url);
    const youMayAlsoLike = this.extractYouMayAlsoLike(doc, url);
    console.log(
      "[FreeScraper] Parsed from HTML:",
      wearWith.length,
      "wearWith,",
      youMayAlsoLike.length,
      "youMayAlsoLike",
    );
    return { wearWith, youMayAlsoLike };
  }

  private static isValidProductImage(src: string): boolean {
    // Filter out small icons, placeholders, tracking pixels
    const invalidPatterns = [
      /placeholder/i,
      /icon/i,
      /logo/i,
      /pixel/i,
      /tracking/i,
      /1x1/i,
      /spacer/i,
      /\.gif$/i,
      /\.svg$/i,
    ];
    return !invalidPatterns.some((pattern) => pattern.test(src));
  }

  private static extractProductCode(doc: Document, html: string, url: string): string {
    // Try structured data
    const selectors = [
      '[itemprop="sku"]',
      '[data-testid="product-sku"]',
      '[data-testid="sku"]',
      '[class*="sku"]',
      '[class*="product-code"]',
      '[class*="article-number"]',
      '[class*="codice"]',
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el?.textContent?.trim()) {
        // Clean up the text - remove labels and get just the code
        const text = el.textContent.trim();
        const codeMatch = text.match(/[:：]\s*(.+)$/);
        return codeMatch ? codeMatch[1].trim() : text;
      }
    }

    // Try to find by text labels (multilingual support)
    const labels = [
      "codice prodotto",
      "codice articolo", // Italian (check first as more specific)
      "product code",
      "sku",
      "article number",
      "item number",
      "style",
      "código de producto",
      "código",
      "referencia", // Spanish
      "code produit",
      "référence", // French
      "produktcode",
      "artikelnummer", // German
    ];

    // Search in text content - look for elements containing the label
    const allElements = doc.querySelectorAll("span, p, div, dt, dd, li, td, strong, b");
    for (const el of allElements) {
      const text = el.textContent?.toLowerCase().trim() || "";
      for (const label of labels) {
        if (text.startsWith(label) || text.includes(label + ":") || text.includes(label + " ")) {
          const fullText = el.textContent?.trim() || "";
          // Extract everything after the colon - allow spaces, dashes, alphanumeric
          const codeMatch = fullText.match(/[:：]\s*(.+)$/i);
          if (codeMatch) {
            return codeMatch[1].trim();
          }
        }
      }
    }

    // Also search the raw HTML for patterns like "Codice prodotto:</strong> VALUE"
    for (const label of labels) {
      const patterns = [
        new RegExp(label + "[:\\s]*</(?:strong|b|span)>\\s*([^<]+)", "i"),
        new RegExp(label + "[:\\s]+([^<\\n]+)", "i"),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const code = match[1].trim();
          if (code.length > 3 && code.length < 50) {
            return code;
          }
        }
      }
    }

    // Try to extract from URL
    const urlMatch = url.match(/[-_/](\d{5,12})(?:[-_./]|$)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try to find in JSON-LD
    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
    if (jsonLd?.textContent) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        if (data.sku) return data.sku;
        if (data.productID) return data.productID;
        if (data.mpn) return data.mpn;
      } catch {}
    }

    return "";
  }

  private static extractCategories(doc: Document): string[] {
    const categories: string[] = [];
    const excludeTerms = ["home", "homepage", "accueil", "inicio", "startseite"];

    // Try breadcrumbs - expanded selectors
    const breadcrumbSelectors = [
      '[itemprop="itemListElement"] [itemprop="name"]',
      ".breadcrumb a",
      ".breadcrumbs a",
      '[class*="breadcrumb"] a',
      '[class*="Breadcrumb"] a',
      'nav[aria-label="breadcrumb"] a',
      'nav[aria-label*="breadcrumb"] a',
      'ol[class*="breadcrumb"] li a',
      'ul[class*="breadcrumb"] li a',
      '[data-testid*="breadcrumb"] a',
      // Also try span/li elements if links don't work
      '[class*="breadcrumb"] li',
      '[class*="breadcrumb"] span:not(:empty)',
    ];

    for (const selector of breadcrumbSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !excludeTerms.includes(text.toLowerCase())) {
            // Avoid duplicates
            if (!categories.includes(text)) {
              categories.push(text);
            }
          }
        });
        if (categories.length > 0) break;
      }
    }

    // Remove last item if it matches the product name (breadcrumb usually ends with product name)
    if (categories.length > 1) {
      const productName = this.extractName(doc);
      const lastCategory = categories[categories.length - 1];
      if (lastCategory.toLowerCase() === productName.toLowerCase()) {
        categories.pop();
      }
    }

    // Try JSON-LD
    if (categories.length === 0) {
      const jsonLd = doc.querySelector('script[type="application/ld+json"]');
      if (jsonLd?.textContent) {
        try {
          const data = JSON.parse(jsonLd.textContent);
          if (data.category) {
            if (typeof data.category === "string") {
              categories.push(
                ...data.category
                  .split(/[>/,]/)
                  .map((c: string) => c.trim())
                  .filter((c: string) => c && !excludeTerms.includes(c.toLowerCase())),
              );
            }
          }
        } catch {}
      }
    }

    return categories;
  }

  private static extractWearWith(doc: Document, baseUrl: string): RelatedProduct[] {
    const wearWith: RelatedProduct[] = [];

    console.log("[FreeScraper] Looking for wear-with/completa-il-look section...");

    // PRIORITY 1: Try id="complete-your-fit" or id="complete-your-outfit" first
    let section: Element | null = null;

    const priorityIdSelectors = [
      "#complete-your-fit",
      "#complete-your-outfit",
      "#complete-you-fit",
      "#complete-you-outfit",
    ];

    for (const selector of priorityIdSelectors) {
      section = doc.querySelector(selector);
      if (section) {
        console.log(`[FreeScraper] Found section via priority ID: ${selector}`);
        break;
      }
    }

    // PRIORITY 2: Try data-carousel-tracking="completeTheLook"
    if (!section) {
      section = doc.querySelector('[data-carousel-tracking="completeTheLook"]');
      if (section) {
        console.log('[FreeScraper] Found section via data-carousel-tracking="completeTheLook"');
      }
    }

    // PRIORITY 3: MaxMara specific selectors for "Completa il look" (NOT "you may also like")
    if (!section) {
      const wearWithSelectors = [
        // MaxMara specific - note the typo in class name "you" vs "your"
        ".w-complete-you-outfit_carousel",
        ".w-complete-your-outfit_carousel",
        ".w-complete-you-outfit__carousel",
        ".w-complete-your-outfit__carousel",
        ".w-complete-your-outfit",
        ".w-complete-you-outfit",
        '[class*="complete-you-outfit"]',
        '[class*="complete-your-outfit"]',
      ];

      // Selectors to EXCLUDE (these are "you may also like" sections)
      const excludeSelectors = [
        ".w-you-may-also-like",
        ".w-recently-viewed",
        '[class*="also-like"]',
        '[class*="recently-viewed"]',
        '[class*="recommendations"]',
        '[data-carousel-tracking="recommendations"]',
        '[data-carousel-tracking="recentlyViewed"]',
      ];

      for (const selector of wearWithSelectors) {
        const candidate = doc.querySelector(selector);
        if (candidate) {
          // Make sure this is not inside an excluded section
          let isExcluded = false;
          for (const exSelector of excludeSelectors) {
            if (candidate.closest(exSelector) || candidate.querySelector(exSelector)) {
              isExcluded = true;
              break;
            }
          }
          if (!isExcluded) {
            section = candidate;
            console.log(`[FreeScraper] Found wear-with section via: ${selector}`);
            break;
          }
        }
      }
    }

    // If not found, try by heading text - ONLY "completa il look" type headings
    if (!section) {
      // These are ONLY for "wear with" style sections - NOT "you may also like"
      const wearWithHeadings = [
        "completa il look",
        "completa il tuo look",
        "complete the look",
        "wear it with",
        "wear with",
        "style with",
        "shop the look",
        "abbina con",
        "indossa con",
        "complète le look",
        "complete your look",
        "completez votre look",
      ];

      // These should be EXCLUDED
      const excludeHeadings = [
        "potrebbe piacerti",
        "may also like",
        "ti potrebbe interessare",
        "consigliati",
        "recommended",
        "visti di recente",
        "recently viewed",
      ];

      const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, span, p, div");

      for (const heading of headings) {
        const text = heading.textContent?.toLowerCase().trim() || "";

        // Skip if it matches an exclude heading
        if (excludeHeadings.some((t) => text.includes(t))) {
          continue;
        }

        if (wearWithHeadings.some((t) => text.includes(t))) {
          console.log(`[FreeScraper] Found wear-with heading: "${text}"`);

          // Traverse up to find container with products
          let parent = heading.parentElement;
          let depth = 0;
          while (parent && parent !== doc.body && depth < 10) {
            const productLinks = parent.querySelectorAll('a[href*="/p/"], a[href*="/product"]');
            if (productLinks.length > 0) {
              section = parent;
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
          if (section) break;
        }
      }
    }

    // Fallback: try common class selectors
    if (!section) {
      const sectionSelectors = [
        '[class*="completa-il-look"]',
        '[class*="complete-look"]',
        '[class*="wear-with"]',
        '[class*="complete-the-look"]',
        '[class*="related-products"]',
        '[class*="cross-sell"]',
      ];

      for (const selector of sectionSelectors) {
        section = doc.querySelector(selector);
        if (section) {
          console.log(`[FreeScraper] Found section via selector: ${selector}`);
          break;
        }
      }
    }

    if (section) {
      console.log(`[FreeScraper] Extracting products from section: ${section.className}`);

      const seenUrls = new Set<string>();

      // PRIORITY: Look for slick-slide elements with data-product-card-img-container
      const slickSlides = section.querySelectorAll(".slick-slide");
      console.log(`[FreeScraper] Found ${slickSlides.length} slick-slide elements`);

      if (slickSlides.length > 0) {
        slickSlides.forEach((slide) => {
          // PRIORITY: Look for data-product-card-img-container inside the slide
          const imgContainer = slide.querySelector("[data-product-card-img-container]");

          let link: string | null = null;
          let imageUrl = "";
          let name = "";

          if (imgContainer) {
            // Extract href from the <a> tag inside the container
            const linkEl = imgContainer.querySelector("a[href]");
            link = linkEl?.getAttribute("href") || null;

            // Extract image from img inside container
            const img = imgContainer.querySelector("img");
            if (img) {
              imageUrl =
                img.getAttribute("src") ||
                img.getAttribute("data-src") ||
                img.getAttribute("data-lazy") ||
                img.getAttribute("data-original") ||
                "";
              name = img.getAttribute("alt") || "";
            }

            console.log(`[FreeScraper] Found via data-product-card-img-container: ${link}`);
          }

          // Fallback: Find link in slide the old way
          if (!link) {
            const linkEl = slide.querySelector('a[href*="/p/"]') || slide.querySelector("a[href]");
            link = linkEl?.getAttribute("href") || null;
          }

          if (!link || seenUrls.has(link)) return;
          if (!link.includes("/p/") && !link.includes("/product")) return;
          seenUrls.add(link);

          // If we didn't get image from imgContainer, try finding it the old way
          if (!imageUrl) {
            const img = slide.querySelector("img");
            if (img) {
              imageUrl =
                img.getAttribute("src") ||
                img.getAttribute("data-src") ||
                img.getAttribute("data-lazy") ||
                img.getAttribute("data-original") ||
                "";
            }
          }

          // If we didn't get name, try finding it the old way
          if (!name) {
            const img = slide.querySelector("img");
            name = img?.getAttribute("alt") || "";
            if (!name) {
              const textEl = slide.querySelector('[class*="name"], [class*="title"], p, span, h3, h4');
              name = textEl?.textContent?.trim() || "";
            }
          }

          const resolvedUrl = this.resolveUrl(link, baseUrl);
          const resolvedImage = this.resolveUrl(imageUrl, baseUrl);

          console.log(`[FreeScraper] Found wear-with (slick): ${name || "unnamed"} - ${resolvedUrl}`);

          wearWith.push({
            name,
            url: resolvedUrl,
            price: "",
            image: resolvedImage,
          });
        });
      }

      // Fallback: generic product link extraction
      if (wearWith.length === 0) {
        const itemSelectors = [
          'a[href*="/p/"]',
          'a[href*="/product"]',
          '[class*="product-card"] a',
          '[class*="slide"] a[href*="/p/"]',
        ];

        for (const selector of itemSelectors) {
          const items = section.querySelectorAll(selector);
          console.log(`[FreeScraper] Selector "${selector}" found ${items.length} items`);

          items.forEach((item) => {
            const link = item.getAttribute("href");
            if (!link || seenUrls.has(link)) return;
            if (!link.includes("/p/") && !link.includes("/product")) return;
            seenUrls.add(link);

            const card = item.closest('[class*="card"], [class*="product"], [class*="item"], [class*="slide"]') || item;
            const img = card.querySelector("img") || item.querySelector("img");

            let name = "";
            const nameEl = card.querySelector('[class*="name"], [class*="title"], h3, h4, p');
            if (nameEl?.textContent?.trim()) {
              name = nameEl.textContent.trim();
            }
            if (!name && img) {
              name = img.getAttribute("alt") || "";
            }

            let imageUrl = "";
            if (img) {
              imageUrl = img.getAttribute("src") || img.getAttribute("data-src") || "";
            }

            const resolvedUrl = this.resolveUrl(link, baseUrl);
            const resolvedImage = this.resolveUrl(imageUrl, baseUrl);

            console.log(`[FreeScraper] Found wear-with: ${name || "unnamed"} - ${resolvedUrl}`);

            wearWith.push({
              name,
              url: resolvedUrl,
              price: "",
              image: resolvedImage,
            });
          });

          if (wearWith.length > 0) break;
        }
      }
    } else {
      console.log("[FreeScraper] No wear-with section found in the HTML");
    }

    console.log(`[FreeScraper] Total wear-with products found: ${wearWith.length}`);
    return wearWith.slice(0, 6);
  }

  private static extractYouMayAlsoLike(doc: Document, url: string): RelatedProduct[] {
    const youMayAlsoLike: RelatedProduct[] = [];
    const baseUrl = new URL(url).origin;

    console.log('[FreeScraper] Looking for "you may also like" section...');

    // Selectors specifically for "you may also like" / recommendations
    const alsoLikeSelectors = [
      ".w-you-may-also-like",
      ".w-you-may-also-like__carousel",
      '[data-carousel-tracking="recommendations"]',
      '[class*="you-may-also-like"]',
      '[class*="also-like"]',
      '[class*="recommendations"]',
      ".pdp-rec-engine",
    ];

    let section: Element | null = null;

    for (const selector of alsoLikeSelectors) {
      section = doc.querySelector(selector);
      if (section) {
        console.log(`[FreeScraper] Found "you may also like" section via: ${selector}`);
        break;
      }
    }

    // Try by heading text
    if (!section) {
      const alsoLikeHeadings = [
        "potrebbe piacerti",
        "may also like",
        "ti potrebbe interessare",
        "consigliati per te",
        "recommended for you",
        "you might like",
        "potrebbe piacerti anche",
        "ti piacerà anche",
      ];

      const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, span, p, div");

      for (const heading of headings) {
        const text = heading.textContent?.toLowerCase().trim() || "";

        if (alsoLikeHeadings.some((t) => text.includes(t))) {
          console.log(`[FreeScraper] Found "you may also like" heading: "${text}"`);

          let parent = heading.parentElement;
          let depth = 0;
          while (parent && parent !== doc.body && depth < 10) {
            const productLinks = parent.querySelectorAll('a[href*="/p/"], a[href*="/product"]');
            if (productLinks.length > 0) {
              section = parent;
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
          if (section) break;
        }
      }
    }

    if (section) {
      console.log(`[FreeScraper] Extracting "you may also like" from section: ${section.className}`);

      const seenUrls = new Set<string>();

      // Try slick-slide structure first
      const slickSlides = section.querySelectorAll(".slick-slide");

      if (slickSlides.length > 0) {
        slickSlides.forEach((slide) => {
          const linkEl = slide.querySelector('a[href*="/p-"]') || slide.querySelector("a[href]");
          const link = linkEl?.getAttribute("href");

          if (!link || seenUrls.has(link)) return;
          if (!link.includes("/p-") && !link.includes("/product")) return;
          seenUrls.add(link);

          const img = slide.querySelector("img");
          let imageUrl = "";
          if (img) {
            imageUrl =
              img.getAttribute("src") ||
              img.getAttribute("data-src") ||
              img.getAttribute("data-lazy") ||
              img.getAttribute("data-original") ||
              "";
          }

          let name = img?.getAttribute("alt") || "";
          if (!name) {
            const textEl = slide.querySelector('[class*="name"], [class*="title"], p, span, h3, h4');
            name = textEl?.textContent?.trim() || "";
          }

          youMayAlsoLike.push({
            name,
            url: this.resolveUrl(link, baseUrl),
            price: "",
            image: this.resolveUrl(imageUrl, baseUrl),
          });
        });
      }

      // Fallback: generic product link extraction
      if (youMayAlsoLike.length === 0) {
        const items = section.querySelectorAll('a[href*="/p/"], a[href*="/product"]');

        items.forEach((item) => {
          const link = item.getAttribute("href");
          if (!link || seenUrls.has(link)) return;
          if (!link.includes("/p/") && !link.includes("/product")) return;
          seenUrls.add(link);

          const card = item.closest('[class*="card"], [class*="product"], [class*="item"], [class*="slide"]') || item;
          const img = card.querySelector("img") || item.querySelector("img");

          let name = "";
          const nameEl = card.querySelector('[class*="name"], [class*="title"], h3, h4, p');
          if (nameEl?.textContent?.trim()) {
            name = nameEl.textContent.trim();
          }
          if (!name && img) {
            name = img.getAttribute("alt") || "";
          }

          let imageUrl = "";
          if (img) {
            imageUrl = img.getAttribute("src") || img.getAttribute("data-src") || "";
          }

          youMayAlsoLike.push({
            name,
            url: this.resolveUrl(link, baseUrl),
            price: "",
            image: this.resolveUrl(imageUrl, baseUrl),
          });
        });
      }
    } else {
      console.log('[FreeScraper] No "you may also like" section found in the HTML');
    }

    console.log(`[FreeScraper] Total "you may also like" products found: ${youMayAlsoLike.length}`);
    return youMayAlsoLike.slice(0, 6);
  }

  private static resolveUrl(url: string, baseUrl: string): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return "https:" + url;

    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  static async scrapeFashionProduct(url: string): Promise<ScrapeResponse> {
    try {
      console.log(`[FreeScraper] Fetching: ${url}`);
      const html = await this.fetchWithProxy(url);

      const product = this.extractProductData(html, url);

      // Extract page title for metadata
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const title = doc.querySelector("title")?.textContent || "";
      const description = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";

      return {
        success: true,
        data: {
          json: product,
          metadata: {
            title,
            description,
            sourceURL: url,
          },
        },
      };
    } catch (error) {
      console.error(`[FreeScraper] Error scraping ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to scrape URL",
      };
    }
  }

  // Simple URL discovery using sitemap or HTML links
  static async discoverUrls(
    brandUrl: string,
    options?: { limit?: number; crawlCategories?: boolean },
  ): Promise<{ success: boolean; urls?: string[]; error?: string }> {
    try {
      const baseUrl = new URL(brandUrl);
      const urls: string[] = [];
      const seen = new Set<string>();

      // Helper to parse sitemap and extract URLs
      const parseSitemap = async (sitemapUrl: string, onlyProducts: boolean = false): Promise<string[]> => {
        try {
          console.log(`[FreeScraper] Fetching sitemap: ${sitemapUrl}`);
          const xml = await this.fetchWithProxy(sitemapUrl);
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, "text/xml");

          // Check if it's a sitemap index (contains other sitemaps)
          const sitemapLocs = doc.querySelectorAll("sitemap loc");
          if (sitemapLocs.length > 0) {
            console.log(`[FreeScraper] Found sitemap index with ${sitemapLocs.length} sitemaps`);

            // First, look for product-specific sitemaps
            const productSitemaps: string[] = [];
            const otherSitemaps: string[] = [];

            sitemapLocs.forEach((loc) => {
              const url = loc.textContent?.trim();
              if (url) {
                if (url.toLowerCase().includes("product")) {
                  productSitemaps.push(url);
                } else {
                  otherSitemaps.push(url);
                }
              }
            });

            // Prioritize product sitemaps
            const sitemapsToProcess = productSitemaps.length > 0 ? productSitemaps : otherSitemaps.slice(0, 3);
            console.log(
              `[FreeScraper] Processing ${sitemapsToProcess.length} sitemaps (${productSitemaps.length} product sitemaps found)`,
            );

            const nestedUrls: string[] = [];
            for (const nestedSitemapUrl of sitemapsToProcess) {
              try {
                const nested = await parseSitemap(nestedSitemapUrl, true);
                nestedUrls.push(...nested);
              } catch (e) {
                console.log(`[FreeScraper] Failed to parse nested sitemap: ${nestedSitemapUrl}`);
              }
            }
            return nestedUrls;
          }

          // Regular sitemap with URLs
          const locs = doc.querySelectorAll("url loc");
          const extractedUrls: string[] = [];
          locs.forEach((loc) => {
            const url = loc.textContent?.trim();
            if (url) {
              extractedUrls.push(url);
            }
          });

          console.log(`[FreeScraper] Extracted ${extractedUrls.length} URLs from sitemap`);
          return extractedUrls;
        } catch (e) {
          console.log(`[FreeScraper] Failed to parse sitemap: ${sitemapUrl}`);
          return [];
        }
      };

      // Helper to check if a URL looks like a product page (La Perla style - long hyphenated slugs)
      const looksLikeProductUrl = (pathname: string): boolean => {
        // Product slugs typically have 3+ hyphenated words like /reggiseno-a-balconcino-bianco-in-pizzo/
        const parts = pathname.replace(/^\/|\/$/g, '').split('-');
        // At least 4 parts and looks like a slug (not a category)
        if (parts.length >= 4 && pathname.split('/').length <= 2) {
          // Avoid category patterns
          const categoryKeywords = ['collection', 'category', 'shop', 'sale', 'new', 'donna', 'uomo', 'women', 'men'];
          return !categoryKeywords.some(k => pathname.toLowerCase().includes(k));
        }
        return false;
      };

      // Helper to crawl a page and extract product links
      const crawlPageForProducts = async (pageUrl: string): Promise<string[]> => {
        try {
          console.log(`[FreeScraper] Crawling page for products: ${pageUrl}`);
          const html = await this.fetchWithProxy(pageUrl);
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const productUrls: string[] = [];
          
          // Common product link selectors for e-commerce sites
          const productSelectors = [
            // Generic product links
            'a[href*="/product"]',
            'a[href*="/products/"]',
            'a[href*="/p/"]',
            // Common class patterns
            '[class*="product"] a[href]',
            '[class*="Product"] a[href]',
            '[class*="item"] a[href]',
            '[class*="card"] a[href]',
            // Data attributes
            '[data-product] a[href]',
            '[data-testid*="product"] a[href]',
            // Grid/list items
            '.product-grid a[href]',
            '.product-list a[href]',
            '.products a[href]',
            // BigCommerce / La Perla specific
            'article a[href]',
            'article.card a[href]',
            '.productCard a[href]',
            '[data-product-id] a[href]',
            '.plp-product a[href]',
            '[class*="plp"] a[href]',
            // More generic - product cards often have images
            '[class*="grid"] a[href]',
            '[class*="listing"] a[href]',
          ];

          const excludePatterns = [
            '/cart', '/checkout', '/account', '/login', '/register',
            '/search', '/contact', '/about', '/faq', '/help',
            '/privacy', '/terms', '/shipping', '/returns',
            '/wishlist', '/compare', '/review', '/blog', '/news',
            '.jpg', '.png', '.gif', '.css', '.js', '.pdf', '.svg'
          ];

          for (const selector of productSelectors) {
            doc.querySelectorAll(selector).forEach((a) => {
              const href = a.getAttribute("href");
              if (href) {
                try {
                  const fullUrl = new URL(href, pageUrl).href;
                  // Only include URLs from the same domain
                  if (fullUrl.startsWith(baseUrl.origin) && !productUrls.includes(fullUrl)) {
                    const urlPath = new URL(fullUrl).pathname.toLowerCase();
                    if (!excludePatterns.some(p => urlPath.includes(p))) {
                      productUrls.push(fullUrl);
                    }
                  }
                } catch {}
              }
            });
            if (productUrls.length > 20) break; // Found enough products with this selector
          }

          // If no products found with specific selectors, look for La Perla-style product URLs
          // These are root-level slugs with many hyphens like /reggiseno-a-balconcino-bianco.../
          if (productUrls.length < 10) {
            console.log(`[FreeScraper] Trying La Perla-style slug detection...`);
            doc.querySelectorAll('a[href]').forEach((a) => {
              const href = a.getAttribute("href");
              if (href) {
                try {
                  const fullUrl = new URL(href, pageUrl).href;
                  const urlPath = new URL(fullUrl).pathname;
                  
                  if (
                    fullUrl.startsWith(baseUrl.origin) &&
                    !productUrls.includes(fullUrl) &&
                    !excludePatterns.some(p => urlPath.toLowerCase().includes(p)) &&
                    looksLikeProductUrl(urlPath)
                  ) {
                    productUrls.push(fullUrl);
                  }
                } catch {}
              }
            });
          }

          console.log(`[FreeScraper] Found ${productUrls.length} product links on page`);
          return productUrls;
        } catch (e) {
          console.log(`[FreeScraper] Failed to crawl page: ${pageUrl}`);
          return [];
        }
      };

      // Helper to find category/collection pages to crawl
      const findCategoryPages = async (startUrl: string): Promise<string[]> => {
        try {
          console.log(`[FreeScraper] Finding category pages from: ${startUrl}`);
          const html = await this.fetchWithProxy(startUrl);
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          const categoryUrls: string[] = [];
          
          // Common category URL patterns - expanded for La Perla and similar sites
          const categoryPatterns = [
            /\/category\//i,
            /\/categories\//i,
            /\/collection/i,
            /\/collections\//i,
            /\/shop\/?$/i,
            /\/shop\//i,
            /\/catalog/i,
            // Gender categories
            /\/(donna|uomo|women|men|kids|bambini|lui|lei)\/?$/i,
            /\/(donna|uomo|women|men|kids|bambini|lui|lei)\//i,
            // La Perla specific categories
            /\/(intimo|reggiseni|slip|body|corsetteria|notte|mare|pigiami|camicie-da-notte|vestaglie|bikini|costumi)\/?$/i,
            /\/(lingerie|bras|panties|bodysuits|corsetry|nightwear|swimwear|pajamas|nightgowns|robes|bikinis|swimsuits)\/?$/i,
            // Generic product listing patterns
            /\/(accessories|accessori|abbigliamento|clothing|shoes|scarpe|bags|borse)\/?$/i,
            /\/sale\/?$/i,
            /\/new-?arrivals?\/?$/i,
            /\/novita\/?$/i,
            /\/outlet\/?$/i,
          ];

          // Also look for nav/menu links
          const navSelectors = [
            'nav a[href]',
            '[class*="nav"] a[href]',
            '[class*="menu"] a[href]',
            '[class*="Menu"] a[href]',
            'header a[href]',
            '[role="navigation"] a[href]',
            // Mega menu links
            '[class*="mega"] a[href]',
            '[class*="dropdown"] a[href]',
          ];

          for (const selector of navSelectors) {
            doc.querySelectorAll(selector).forEach((a) => {
              const href = a.getAttribute("href");
              if (href) {
                try {
                  const fullUrl = new URL(href, startUrl).href;
                  const path = new URL(fullUrl).pathname;
                  
                  // Check if it looks like a category page
                  if (
                    fullUrl.startsWith(baseUrl.origin) &&
                    !categoryUrls.includes(fullUrl) &&
                    categoryPatterns.some(p => p.test(path))
                  ) {
                    categoryUrls.push(fullUrl);
                  }
                } catch {}
              }
            });
          }

          // Fallback: Look for short, single-segment paths that are likely category pages
          if (categoryUrls.length < 5) {
            doc.querySelectorAll('a[href]').forEach((a) => {
              const href = a.getAttribute("href");
              if (href) {
                try {
                  const fullUrl = new URL(href, startUrl).href;
                  const path = new URL(fullUrl).pathname.toLowerCase();
                  const segments = path.split('/').filter(Boolean);
                  
                  // Short paths with 1-2 segments are often categories
                  if (
                    fullUrl.startsWith(baseUrl.origin) &&
                    !categoryUrls.includes(fullUrl) &&
                    segments.length <= 2 &&
                    segments.length >= 1 &&
                    !path.includes('.') && // Not a file
                    !/^\d+$/.test(segments[0]) // Not just a number
                  ) {
                    // Exclude common non-category pages
                    const excludes = ['cart', 'checkout', 'account', 'login', 'register', 'search', 'contact', 'about', 'faq', 'help', 'privacy', 'terms', 'shipping', 'returns'];
                    if (!excludes.some(e => path.includes(e))) {
                      categoryUrls.push(fullUrl);
                    }
                  }
                } catch {}
              }
            });
          }

          console.log(`[FreeScraper] Found ${categoryUrls.length} category pages`);
          return categoryUrls.slice(0, 15); // Limit to 15 categories
        } catch (e) {
          console.log(`[FreeScraper] Failed to find category pages`);
          return [];
        }
      };

      // Try product-specific sitemaps FIRST, then fall back to general ones
      const sitemapUrls = [
        // Product-specific sitemaps first
        `${baseUrl.origin}/sitemap_products.xml`,
        `${baseUrl.origin}/sitemap-products.xml`,
        `${baseUrl.origin}/product-sitemap.xml`,
        `${baseUrl.origin}/products-sitemap.xml`,
        // Then general sitemaps (which may contain links to product sitemaps)
        `${baseUrl.origin}/sitemap.xml`,
        `${baseUrl.origin}/sitemap_index.xml`,
      ];

      for (const sitemapUrl of sitemapUrls) {
        const extractedUrls = await parseSitemap(sitemapUrl);
        extractedUrls.forEach((url) => {
          if (!seen.has(url)) {
            seen.add(url);
            urls.push(url);
          }
        });

        if (urls.length > 0) {
          console.log(`[FreeScraper] Found ${urls.length} total URLs from: ${sitemapUrl}`);
          break;
        }
      }

      // NEW: If sitemap didn't find enough URLs OR user wants category crawling,
      // crawl the provided URL and category pages for product links
      if (urls.length < 50 || options?.crawlCategories) {
        console.log(`[FreeScraper] Sitemap found ${urls.length} URLs, crawling pages for more...`);
        
        // First, crawl the provided URL (might be a category page itself)
        const directProducts = await crawlPageForProducts(brandUrl);
        directProducts.forEach((url) => {
          if (!seen.has(url)) {
            seen.add(url);
            urls.push(url);
          }
        });

        // Find and crawl category pages
        const categoryPages = await findCategoryPages(brandUrl);
        for (const categoryUrl of categoryPages) {
          if (urls.length >= (options?.limit || 5000)) break;
          
          const categoryProducts = await crawlPageForProducts(categoryUrl);
          categoryProducts.forEach((url) => {
            if (!seen.has(url)) {
              seen.add(url);
              urls.push(url);
            }
          });
        }

        console.log(`[FreeScraper] After category crawling: ${urls.length} total URLs`);
      }

      // If still no URLs found, crawl the provided URL for any links
      if (urls.length === 0) {
        console.log(`[FreeScraper] No sitemap or products found, crawling page for all links`);
        try {
          const html = await this.fetchWithProxy(brandUrl);
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          doc.querySelectorAll("a[href]").forEach((a) => {
            const href = a.getAttribute("href");
            if (href) {
              try {
                const fullUrl = new URL(href, brandUrl).href;
                if (fullUrl.startsWith(baseUrl.origin) && !seen.has(fullUrl)) {
                  seen.add(fullUrl);
                  urls.push(fullUrl);
                }
              } catch {}
            }
          });
          
          console.log(`[FreeScraper] Found ${urls.length} links from page crawl`);
        } catch (e) {
          console.log(`[FreeScraper] Failed to crawl main page:`, e);
        }
      }

      const limit = options?.limit || 5000;
      
      // Log summary
      console.log(`[FreeScraper] Discovery complete: ${urls.length} URLs found`);
      if (urls.length === 0) {
        console.log(`[FreeScraper] No URLs found - the site may be blocking requests via CORS proxy`);
      }
      
      return {
        success: true,
        urls: urls.slice(0, limit),
      };
    } catch (error) {
      console.error(`[FreeScraper] discoverUrls error:`, error);
      return {
        success: false,
        error: error instanceof Error 
          ? `Failed to discover URLs: ${error.message}. The site may be blocking automated requests.`
          : "Failed to discover URLs",
      };
    }
  }
}
