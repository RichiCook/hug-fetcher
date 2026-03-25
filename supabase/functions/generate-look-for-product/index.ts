import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration interfaces
interface ColorConfig {
  id: string;
  name: string;
  harmonyRules: { id: string; name: string; enabled: boolean }[];
  excludedColors: string[];
  preferredPairings: string[][];
  referenceImages: { id: string; url: string; name: string }[];
  collections: string[];
}

interface ModelReference {
  id: string;
  url: string;
  name: string;
  type: 'model' | 'environment';
  collections?: string[];
}

interface StyleReference {
  id: string;
  url: string;
  name: string;
  source: 'upload' | 'url';
  collections?: string[];
  styleDominantCategories?: string[];
}

// Category detection based on Pantofola d'Oro product categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'football_boots': ['football boots', 'scarpe da calcio', 'calcio', 'derby', 'epoca', 'alloro', 'lazzarini', 'outdoor', 'superleggera', 'junior', 'boots'],
  'sneakers': ['sneakers', 'sneaker', 'trainer', 'trainers'],
  'classics': ['classiche', 'classica', 'classic', 'classics', 'heritage'],
  'tshirt': ['t-shirt', 't-shirts', 'tshirt', 'soccer t-shirt'],
  'felpa': ['felpa', 'felpe', 'hoodie', 'hoodies'],
  'joggers': ['jogger', 'joggers', 'pantaloni'],
  'tracksuit': ['tracksuit', 'tuta', 'tute'],
  'maglia': ['maglia', 'knit', 'maglia knit'],
};

// Pantofola d'Oro outfit templates
const OUTFIT_TEMPLATES: Record<string, { name: string; required: string[][]; description: string }> = {
  'football_look': {
    name: 'Football Boots + Clothing',
    required: [['football_boots'], ['tshirt', 'felpa', 'maglia']],
    description: 'Football boots paired with PDO branded clothing'
  },
  'sneaker_casual': {
    name: 'Sneakers + Casual Clothing',
    required: [['sneakers'], ['tshirt', 'felpa', 'maglia'], ['joggers', 'tracksuit']],
    description: 'Casual sneaker look with PDO clothing'
  },
  'classic_look': {
    name: 'Classic Shoes + Clothing',
    required: [['classics'], ['tshirt', 'maglia']],
    description: 'Classic heritage shoes with refined PDO pieces'
  },
  'full_outfit': {
    name: 'Shoes + Top + Bottom',
    required: [['football_boots', 'sneakers', 'classics'], ['tshirt', 'felpa', 'maglia'], ['joggers', 'tracksuit']],
    description: 'Complete outfit with shoes, top, and bottom'
  },
};

// Exclusion rules for Pantofola d'Oro
const EXCLUSION_RULES: Record<string, string[]> = {
  'football_boots': ['classics'],
  'classics': ['football_boots'],
};

// Fisher-Yates shuffle to randomize product selection
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// No longer needed — mare category removed for PDO brand
function isMareProduct(_category: string | null, _name: string | null): boolean {
  return false;
}

// Keywords that imply women's-only products
const WOMENS_PRODUCT_KEYWORDS = ['skirt', 'dress', 'bra ', 'bralette', 'gonna', 'vestito', 'abito', 'crop top'];
const MENS_PRODUCT_KEYWORDS: string[] = [];

// Detect gender/age from category AND name
function detectGender(category: string | null, name?: string | null, description?: string | null): 'donna' | 'uomo' | 'bambini' | null {
  const text = `${category || ''} ${name || ''} ${description || ''}`.toLowerCase();
  if (text.includes('bambini') || text.includes('bambino') || text.includes('bambina') || 
      text.includes('kids') || text.includes('junior') || text.includes('ragazzo') || 
      text.includes('ragazza') || text.includes('neonato') || text.includes('neonata') || 
      text.includes('bimbo') || text.includes('bimba') || text.includes('infanzia')) return 'bambini';
  
  const hasDonna = text.includes('donna') || text.includes('women') || text.includes("woman") || /\bfemale\b/.test(text);
  const hasUomo = text.includes('uomo') || /\bmen\b/.test(text) || /\bman\b/.test(text) || /\bmale\b/.test(text) || text.includes("men's") || text.includes('mens');
  if (hasDonna && hasUomo) return 'donna';
  if (hasDonna) return 'donna';
  if (hasUomo) return 'uomo';
  
  // Infer gender from product type keywords (skirt/dress = women's)
  if (WOMENS_PRODUCT_KEYWORDS.some(kw => text.includes(kw))) return 'donna';
  if (MENS_PRODUCT_KEYWORDS.some(kw => text.includes(kw))) return 'uomo';
  
  return null;
}

// Filter products to match a reference gender — never mix Uomo/Donna/Bambini
function filterByGender(products: any[], referenceCategory: string | null, referenceName?: string | null, referenceDescription?: string | null): any[] {
  const refGender = detectGender(referenceCategory, referenceName, referenceDescription);
  if (!refGender) {
    return products.filter(p => {
      const pGender = detectGender(p.category, p.name, p.description);
      return !pGender;
    });
  }
  return products.filter(p => {
    const pGender = detectGender(p.category, p.name, p.description);
    return !pGender || pGender === refGender;
  });
}

function detectCategory(category: string | null, name: string | null): string | null {
  if (!category && !name) return null;
  
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  
  // Check mare first as it's exclusive
  if (CATEGORY_KEYWORDS['mare'].some(keyword => text.includes(keyword.toLowerCase()))) {
    return 'mare';
  }
  
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'mare') continue; // Already checked
    if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
      return cat;
    }
  }
  
  return null;
}

function groupProductsByCategory(products: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  for (const product of products) {
    const cat = detectCategory(product.category, product.name);
    if (cat) {
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(product);
    }
  }
  
  return grouped;
}

// Filter out products that have exclusions with the hero category
function filterByExclusions(products: any[], heroCategory: string | null, dynamicExclusions: Record<string, string[]>): any[] {
  if (!heroCategory) return products;
  
  const heroExclusions = dynamicExclusions[heroCategory] || [];
  
  return products.filter(product => {
    const productCat = detectCategory(product.category, product.name);
    if (!productCat) return true;
    
    // Check if this product's category is excluded by hero category
    if (heroExclusions.includes(productCat)) {
      return false;
    }
    
    // Check if this product excludes the hero category
    const productExclusions = dynamicExclusions[productCat] || [];
    if (productExclusions.includes(heroCategory)) {
      return false;
    }
    
    return true;
  });
}

// Filter mare products - they only go with other mare products
function filterMareCompatibility(products: any[], heroIsMare: boolean): any[] {
  if (heroIsMare) {
    // Only return mare products
    return products.filter(p => isMareProduct(p.category, p.name));
  } else {
    // Exclude mare products
    return products.filter(p => !isMareProduct(p.category, p.name));
  }
}

// Determine the best matching template based on hero product category
function getBestTemplateForCategory(heroCategory: string): string {
  switch (heroCategory) {
    case 'tshirt':
    case 'polo':
    case 'top':
      return 'casual_top_bottom';
    case 'felpa':
    case 'giacca':
    case 'pile':
    case 'maglione':
      return 'layered_sport';
    case 'reggiseno_sportivo':
    case 'performance':
      return 'activewear';
    case 'tuta':
      return 'full_tracksuit';
    case 'pantalone':
    case 'pantaloncini':
    case 'leggings':
      return 'casual_top_bottom';
    case 'camicia':
      return 'outerwear_combo';
    case 'mare':
      return 'mare';
    default:
      return 'casual_top_bottom'; // Default fallback for sportswear
  }
}

// Get needed categories based on template and hero category
function getNeededCategories(heroCategory: string): string[][] {
  const templateKey = getBestTemplateForCategory(heroCategory);
  const template = OUTFIT_TEMPLATES[templateKey];
  
  if (!template) return [];
  
  // Return slots that don't already contain the hero category
  return template.required.filter(slot => !slot.includes(heroCategory));
}

// Find configuration matching a collection
function findConfigForCollection<T extends { collections?: string[] }>(
  configs: T[],
  collection: string | null
): T | null {
  if (!collection || configs.length === 0) return configs[0] || null;
  
  const match = configs.find(c => c.collections?.includes(collection));
  return match || configs[0] || null;
}

// Build style and color context for AI prompt
function buildConfigurationContext(
  colorConfig: ColorConfig | null,
  stylePresets: string[],
  styleReferences: StyleReference[]
): string {
  const parts: string[] = [];
  
  if (colorConfig) {
    const enabledRules = colorConfig.harmonyRules?.filter(r => r.enabled).map(r => r.name) || [];
    if (enabledRules.length > 0) {
      parts.push(`COLOR HARMONY: ${enabledRules.join(', ')}`);
    }
    if (colorConfig.excludedColors?.length > 0) {
      parts.push(`EXCLUDED COLORS: ${colorConfig.excludedColors.join(', ')}`);
    }
    if (colorConfig.preferredPairings?.length > 0) {
      const pairings = colorConfig.preferredPairings.map(p => p.join('+'));
      parts.push(`PREFERRED COLOR PAIRINGS: ${pairings.join(', ')}`);
    }
  }
  
  if (stylePresets.length > 0) {
    parts.push(`STYLE DIRECTION: ${stylePresets.join(', ')}`);
  }
  
  if (styleReferences.length > 0) {
    parts.push(`STYLE REFERENCES: ${styleReferences.map(s => s.name).join(', ')}`);
  }
  
  return parts.length > 0 ? `\n${parts.join('\n')}` : '';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_code, force_regenerate = false, exclude_product_codes = [] } = await req.json();
    
    if (!product_code) {
      console.error('Missing product_code');
      return new Response(
        JSON.stringify({ error: 'product_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating look for product_code: ${product_code}, force: ${force_regenerate}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the hero product (use latest if duplicates share the same product_code)
    const { data: heroProducts, error: heroError } = await supabase
      .from('products')
      .select('*')
      .eq('product_code', product_code)
      .order('created_at', { ascending: false });

    if (heroError || !heroProducts || heroProducts.length === 0) {
      console.error('Hero product not found:', heroError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const heroProduct = heroProducts[0];
    const targetCollection = heroProduct.collection || null;

    // Check for cached look
    if (!force_regenerate && heroProduct.generated_look) {
      console.log('Returning cached look');
      return new Response(
        JSON.stringify({ look: heroProduct.generated_look, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect hero product category
    const heroCategory = detectCategory(heroProduct.category, heroProduct.name);
    const heroIsMare = isMareProduct(heroProduct.category, heroProduct.name);
    
    console.log(`Hero category: ${heroCategory}, is mare: ${heroIsMare}, collection: ${targetCollection}`);

    // Load all configuration settings from app_settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('*')
      .in('id', [
        'look_pairings', 
        'look_exclusions',
        'color_combinator_settings',
        'ai_generation_references',
        'style_references'
      ]);
    
    // Parse configuration settings
    const savedPairings = settingsData?.find(s => s.id === 'look_pairings')?.value as any[] | undefined;
    const savedExclusions = settingsData?.find(s => s.id === 'look_exclusions')?.value as any[] | undefined;
    const colorSettings = settingsData?.find(s => s.id === 'color_combinator_settings')?.value as {
      configs?: ColorConfig[];
      activeConfigId?: string;
    } | undefined;
    const aiReferences = settingsData?.find(s => s.id === 'ai_generation_references')?.value as {
      modelReferences?: ModelReference[];
      environmentReferences?: ModelReference[];
      activeModel?: string;
      activeEnvironment?: string;
    } | undefined;
    const styleSettings = settingsData?.find(s => s.id === 'style_references')?.value as {
      styleReferences?: StyleReference[];
      selectedPresets?: string[];
    } | undefined;

    // Find matching configurations for the target collection
    const colorConfigs = colorSettings?.configs || [];
    const matchedColorConfig = findConfigForCollection(colorConfigs, targetCollection);
    
    const modelRefs = aiReferences?.modelReferences || [];
    const envRefs = aiReferences?.environmentReferences || [];
    const matchedModel = findConfigForCollection(modelRefs.filter(r => r.type === 'model'), targetCollection);
    const matchedEnv = findConfigForCollection(envRefs.filter(r => r.type === 'environment'), targetCollection);
    
    const styleRefs = styleSettings?.styleReferences || [];
    
    // Check if any style ref has this hero's category as style-dominant
    const styleDominantRef = styleRefs.find(s => {
      const collectionMatch = !targetCollection || !s.collections?.length || s.collections.includes(targetCollection);
      const hasDominantCategory = s.styleDominantCategories?.some((cat: string) =>
        heroCategory && cat.toLowerCase().includes(heroCategory)
      );
      return collectionMatch && hasDominantCategory;
    });
    
    // If a style-dominant ref exists, use ONLY that one; otherwise use normal matching
    let matchedStyles: StyleReference[];
    if (styleDominantRef) {
      matchedStyles = [styleDominantRef];
      console.log(`Style-dominant match found: "${styleDominantRef.name}" — using ONLY this reference`);
    } else {
      matchedStyles = styleRefs.filter(s => {
        const collectionMatch = !targetCollection || !s.collections?.length || s.collections.includes(targetCollection);
        const categoryMatch = !s.categories?.length || s.categories.some((cat: string) => {
          const catLower = cat.toLowerCase();
          return heroCategory && catLower.includes(heroCategory);
        });
        return collectionMatch && categoryMatch;
      });
    }
    console.log(`Style refs: ${styleRefs.length} total, ${matchedStyles.length} matched (heroCategory: ${heroCategory}, styleDominant: ${!!styleDominantRef})`);
    const activePresets = styleSettings?.selectedPresets || [];

    // Determine effective style from configuration
    const effectiveStyle = activePresets.length > 0 ? activePresets[0] : 'elegant';

    console.log('Configuration matched:', {
      colorConfig: matchedColorConfig?.name,
      model: matchedModel?.name,
      environment: matchedEnv?.name,
      stylePresets: activePresets,
      effectiveStyle
    });
    
    // Get allowed categories from saved pairings
    let allowedCategories: string[] = [];
    if (savedPairings && heroCategory) {
      const heroPairing = savedPairings.find((p: any) => p.category === heroCategory);
      if (heroPairing) {
        allowedCategories = heroPairing.allowedWith || [];
        console.log(`Allowed categories for ${heroCategory}: ${allowedCategories.join(', ')}`);
      }
    }

    // Build dynamic exclusion rules from saved settings
    const dynamicExclusions: Record<string, string[]> = { ...EXCLUSION_RULES };
    if (savedExclusions) {
      for (const excl of savedExclusions as any[]) {
        dynamicExclusions[excl.category] = excl.excludes || [];
      }
    }

    // Get the template to use (for naming only)
    const templateKey = heroCategory ? getBestTemplateForCategory(heroCategory) : 'casual_top_bottom';
    const template = OUTFIT_TEMPLATES[templateKey];
    console.log(`Using template: ${templateKey} - ${template?.name}`);

    // Fetch all other products — only those available for purchase
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, product_code, name, category, color, price, images, collection, description')
      .neq('product_code', product_code)
      .eq('is_available', true);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    if (!allProducts || allProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No other products available to create a look' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply gender filter first — never mix Uomo, Donna, and Bambini (check both category AND name)
    let filteredProducts = filterByGender(allProducts, heroProduct.category, heroProduct.name, heroProduct.description);
    console.log(`After gender filter: ${filteredProducts.length} products (from ${allProducts.length})`);
    
    // Apply mare compatibility filter
    filteredProducts = filterMareCompatibility(filteredProducts, heroIsMare);
    
    // Apply exclusion rules (use dynamic exclusions)
    filteredProducts = filterByExclusions(filteredProducts, heroCategory, dynamicExclusions);
    
    // Filter by allowed categories (if we have saved pairings)
    if (allowedCategories.length > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const productCat = detectCategory(product.category, product.name);
        if (!productCat) return false;
        return allowedCategories.includes(productCat);
      });
      console.log(`Filtered to allowed categories: ${filteredProducts.length} products`);
    }

    // Exclude products already used in previous looks
    if (exclude_product_codes && exclude_product_codes.length > 0) {
      const excludeSet = new Set(exclude_product_codes);
      const beforeExclude = filteredProducts.length;
      filteredProducts = filteredProducts.filter(p => !excludeSet.has(p.product_code));
      console.log(`After excluding ${exclude_product_codes.length} previously used codes: ${filteredProducts.length} products (from ${beforeExclude})`);
    }

    console.log(`Filtered products: ${filteredProducts.length} (from ${allProducts.length})`);

    // Group products by category
    const groupedProducts = groupProductsByCategory(filteredProducts);
    console.log('Grouped products:', Object.keys(groupedProducts).map(k => `${k}: ${groupedProducts[k].length}`));

    // Build needed slots from allowed categories (each allowed category is a slot)
    const neededSlots: string[][] = allowedCategories.length > 0 
      ? allowedCategories.map(cat => [cat])
      : (heroCategory ? getNeededCategories(heroCategory) : template.required);
    console.log('Needed slots:', neededSlots);

    // Check what slots we can fill
    const availableSlots: { slot: string[]; products: any[] }[] = [];
    for (const slot of neededSlots) {
      const prods: any[] = [];
      for (const cat of slot) {
        if (groupedProducts[cat]) {
          prods.push(...groupedProducts[cat]);
        }
      }
      if (prods.length > 0) {
        availableSlots.push({ slot, products: prods });
      }
    }

    // Add optional shoes slot if not already present and shoes are available
    const hasShoeSlot = availableSlots.some(s => s.slot.includes('scarpe'));
    if (!hasShoeSlot && groupedProducts['scarpe']?.length > 0 && !heroIsMare) {
      availableSlots.push({ slot: ['scarpe'], products: groupedProducts['scarpe'] });
      console.log(`Added optional shoes slot: ${groupedProducts['scarpe'].length} products`);
    }

    // Add optional accessory slot if not already present and accessories are available
    const hasAccessorySlot = availableSlots.some(s => s.slot.includes('accessori'));
    if (!hasAccessorySlot && groupedProducts['accessori']?.length > 0 && heroCategory !== 'accessori') {
      availableSlots.push({ slot: ['accessori'], products: groupedProducts['accessori'] });
      console.log(`Added optional accessories slot: ${groupedProducts['accessori'].length} products`);
    }

    console.log('Available slots:', availableSlots.map(s => `${s.slot.join('/')}: ${s.products.length}`));

    if (availableSlots.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Not enough compatible products to create a complete look' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare product options for AI — SHUFFLE before slicing to ensure variety
    const productOptions: Record<string, any[]> = {};
    for (const { slot, products: prods } of availableSlots) {
      const slotKey = slot.join('/');
      const shuffled = shuffleArray(prods);
      productOptions[slotKey] = shuffled.slice(0, 25).map(p => ({
        product_code: p.product_code,
        name: p.name,
        color: p.color,
        price: p.price,
        category: p.category,
      }));
    }

    // Build exclusion rules context for AI
    const heroGender = detectGender(heroProduct.category, heroProduct.name, heroProduct.description);
    
    const exclusionContext = `
EXCLUSION RULES (MUST FOLLOW):
- Mare/beachwear products ONLY go with other mare products and accessories
- The hero product is: ${heroCategory || 'unknown category'}
- Respect style coherence: keep the look within a consistent sportswear aesthetic (casual, performance, or streetwear)
- GENDER RULE: NEVER mix "Donna" (women), "Uomo" (men), and "Bambini" (children) products. Each look must be for ONE audience only.${heroGender ? ` The hero product is ${heroGender === 'bambini' ? 'CHILDREN\'S' : heroGender === 'donna' ? 'WOMEN\'S' : 'MEN\'S'} — only select ${heroGender === 'bambini' ? 'children\'s' : heroGender === 'donna' ? 'women\'s' : 'men\'s'} or unisex items.` : ''}`;

    // Build configuration context from settings
    const configContext = buildConfigurationContext(matchedColorConfig, activePresets, matchedStyles);

    // Fetch behavioral pair scores for the hero product
    let pairScoreContext = '';
    try {
      const { data: pairScoresA } = await supabase
        .from('product_pair_scores')
        .select('product_code_a, product_code_b, score, click_count, conversion_count')
        .eq('product_code_a', product_code)
        .order('score', { ascending: false })
        .limit(15);

      const { data: pairScoresB } = await supabase
        .from('product_pair_scores')
        .select('product_code_a, product_code_b, score, click_count, conversion_count')
        .eq('product_code_b', product_code)
        .order('score', { ascending: false })
        .limit(15);

      const allPairScores = [...(pairScoresA || []), ...(pairScoresB || [])]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (allPairScores.length > 0) {
        const pairLines = allPairScores.map(p => {
          const companion = p.product_code_a === product_code ? p.product_code_b : p.product_code_a;
          return `  - ${companion} (score: ${p.score}, clicks: ${p.click_count}, conversions: ${p.conversion_count})`;
        });
        pairScoreContext = `\nPREFERRED PAIRINGS (data-driven from user behavior — prioritize these when available):\n${pairLines.join('\n')}`;
        console.log(`Found ${allPairScores.length} behavioral pair scores for hero product`);
      }
    } catch (pairErr) {
      console.warn('Could not fetch pair scores (non-blocking):', pairErr);
    }

    // Call Lovable AI to select best matching products
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a professional SPORTSWEAR stylist creating a complete outfit look for the Champion brand.

HERO PRODUCT (the centerpiece of this outfit - MUST be included):
- Name: ${heroProduct.name}
- Category: ${heroProduct.category}
- Detected Type: ${heroCategory || 'unknown'}
- Color: ${heroProduct.color || 'not specified'}
- Collection: ${heroProduct.collection || 'not specified'}
- Price: ${heroProduct.price || 'not specified'}

OUTFIT TEMPLATE: ${template.name}
DESCRIPTION: ${template.description}

${exclusionContext}
${configContext}
${pairScoreContext}

AVAILABLE PRODUCTS TO COMPLETE THE LOOK:
${JSON.stringify(productOptions, null, 2)}

YOUR TASK:
Select ONE product from each available category slot to create a cohesive, stylish sportswear outfit that complements the hero product.
Consider color harmony, style consistency, and overall athletic/streetwear aesthetic.

IMPORTANT: You MUST select a shoe (scarpe) and an accessory (accessori) if they are listed in the available products. These complete the total look.
CRITICAL: Select EXACTLY ONE shoe. Never select two shoes. Select EXACTLY ONE accessory. Never select two accessories. Each category slot must have EXACTLY ONE product.

RULES:
1. Select exactly ONE item from each category slot listed above — NO DUPLICATES within the same category
2. Items should match in style (${effectiveStyle}) and work together aesthetically
3. Colors should be harmonious - consider matching or complementary colors
4. STRICTLY follow the exclusion rules above
5. Consider the overall vibe: casual, performance, or streetwear
6. Gender/age consistency: NEVER mix "Donna" (women), "Uomo" (men), and "Bambini" (children) products. All items must be for the same audience.
7. ALWAYS include exactly ONE shoe and exactly ONE accessory to complete the total look

IMPORTANT: In the color_palette, include the main colors of the selected products PLUS one additional complementary or accent color that would enhance the overall look. This extra color should be a creative addition that ties the outfit together (e.g., a warm accent to contrast cool tones, or a metallic highlight). Always include at least 3-4 colors total.

RESPOND WITH ONLY A JSON OBJECT (no markdown, no explanation):
{
  "name": "Creative Italian-inspired name for this look (e.g., 'Urban Champion', 'Street Power')",
  "description": "One sentence describing the overall style and occasion",
  "selected_product_codes": ["code1", "code2", ...],
  "style": "${effectiveStyle}",
  "color_palette": ["color1", "color2", "color3", "extra_accent_color"],
  "reasoning": "Brief explanation of why these items work together"
}`;

    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional sportswear stylist for the Champion brand. You create cohesive athletic and streetwear outfits that work well together in terms of color, style, and sporty appeal. Always respond with valid JSON only. STRICTLY follow exclusion rules.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    console.log('AI response:', aiContent);

    // Parse AI response
    let lookData;
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      lookData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: aiContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the final look object - include hero product first
    const selectedCodes = lookData.selected_product_codes || [];
    
    // POST-GENERATION VALIDATION: Remove any products that don't match the hero's gender
    let validatedCodes = selectedCodes;
    if (heroGender) {
      const selectedProducts = allProducts.filter((p: any) => selectedCodes.includes(p.product_code));
      const invalidCodes = selectedProducts
        .filter((p: any) => {
          const pGender = detectGender(p.category, p.name, p.description);
          return pGender && pGender !== heroGender;
        })
        .map((p: any) => p.product_code);
      
      if (invalidCodes.length > 0) {
        console.log(`POST-VALIDATION: Removing ${invalidCodes.length} gender-mismatched products:`, invalidCodes);
        validatedCodes = selectedCodes.filter((code: string) => !invalidCodes.includes(code));
      }
    }

    // POST-GENERATION VALIDATION: Deduplicate categories — keep only one shoe, one accessory, etc.
    const heroCat = heroCategory;
    const seenCategories = new Set<string>();
    if (heroCat) seenCategories.add(heroCat);
    
    const deduplicatedCodes: string[] = [];
    for (const code of validatedCodes) {
      if (code === product_code) continue; // Hero handled separately
      const prod = allProducts.find((p: any) => p.product_code === code);
      if (!prod) { deduplicatedCodes.push(code); continue; }
      const cat = detectCategory(prod.category, prod.name);
      if (cat && seenCategories.has(cat)) {
        console.log(`POST-VALIDATION: Removing duplicate ${cat} product: ${code}`);
        continue;
      }
      if (cat) seenCategories.add(cat);
      deduplicatedCodes.push(code);
    }
    
    // Ensure hero product is included at the beginning
    const allProductCodes = [product_code, ...deduplicatedCodes];
    
    const generatedLook = {
      product_codes: allProductCodes,
      hero_product_code: product_code,
      name: lookData.name || 'Look Curato',
      description: lookData.description || '',
      style: lookData.style || effectiveStyle,
      color_palette: lookData.color_palette || [],
      reasoning: lookData.reasoning || '',
      template: templateKey,
      template_name: template.name,
      generated_at: new Date().toISOString(),
      // Include configuration info for image generation
      config: {
        modelReference: matchedModel?.url || null,
        environmentReference: matchedEnv?.url || null,
        styleReferences: matchedStyles.map(s => s.url),
        styleDominant: !!styleDominantRef,
        colorReferences: matchedColorConfig?.referenceImages?.map(r => r.url) || []
      }
    };

    console.log('Generated look:', generatedLook);

    // Cache the look in the database
    const { error: updateError } = await supabase
      .from('products')
      .update({ generated_look: generatedLook })
      .eq('product_code', product_code);

    if (updateError) {
      console.error('Failed to cache look:', updateError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({ look: generatedLook, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating look:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
