import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  price: string | null;
  images: string[];
  category: string | null;
  color: string | null;
  collection: string | null;
  source_url: string | null;
  description: string | null;
  ai_attributes?: Record<string, any> | null;
}

interface GenerateLooksRequest {
  products: Product[];
  startingProductId?: string;
  count: number;
}

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

// Category detection based on sportswear categories (order matters — more specific first)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'mare': ['mare', 'beachwear', 'pantaloncini da mare', 'swim'],
  'reggiseno_sportivo': ['reggiseni sportivi', 'reggiseno sportivo', 'sports bra', 'reggiseni', 'bra'],
  'leggings': ['leggings', 'legging'],
  'pantaloncini': ['pantaloncini', 'shorts', 'short'],
  'tuta': ['tuta', 'tute', 'tracksuit'],
  'polo': ['polo'],
  'pile': ['pile', 'fleece'],
  'maglione': ['maglione', 'maglioni', 'sweater', 'sweaters'],
  'giacca': ['giacca', 'giacche', 'jacket', 'jackets'],
  'felpa': ['felpa', 'felpe', 'hoodie', 'hoodies', 'felpe con cappuccio', 'felpe con zip'],
  'camicia': ['camicia', 'camicie', 'shirt'],
  'tshirt': ['t-shirt', 't-shirts', 'tshirt'],
  'scarpe': ['scarpe', 'scarpa', 'sneaker', 'sneakers', 'shoes', 'shoe', 'ciabatte', 'ciabatta', 'sandali', 'sandalo', 'slide', 'slides', 'calzature', 'trainers', 'trainer'],
  'top': ['top', 'canotta', 'canotte', 'tank'],
  'pantalone': ['pantaloni', 'pantalone', 'jogger', 'joggers', 'cargo', 'pantaloni tuta', 'pantaloni con polsini'],
  'performance': ['performance', 'activewear'],
  'accessori': ['accessori', 'cappelli', 'berretti', 'borse', 'zaini', 'borsoni', 'sacca', 'borsa', 'zaino', 'cappello', 'berretto', 'fascia', 'polsini', 'cintura'],
  'intimo': ['calze', 'intimo', 'underwear', 'socks'],
};

// Sportswear outfit templates
const OUTFIT_TEMPLATES: Record<string, { name: string; required: string[][]; description: string }> = {
  'casual_top_bottom': {
    name: 'T-Shirt/Polo + Pantaloni/Shorts',
    required: [['tshirt', 'polo', 'top'], ['pantalone', 'pantaloncini']],
    description: 'Classic casual sportswear combination'
  },
  'layered_sport': {
    name: 'Felpa/Giacca + T-Shirt + Pantaloni',
    required: [['felpa', 'giacca', 'pile'], ['tshirt', 'top'], ['pantalone', 'pantaloncini', 'leggings']],
    description: 'Layered sportswear look with outerwear'
  },
  'activewear': {
    name: 'Reggiseno Sportivo + Leggings/Shorts + Top',
    required: [['reggiseno_sportivo'], ['leggings', 'pantaloncini'], ['top', 'tshirt']],
    description: 'Active workout outfit'
  },
  'full_tracksuit': {
    name: 'Tuta + T-Shirt/Top',
    required: [['tuta'], ['tshirt', 'top']],
    description: 'Full tracksuit with underlayer'
  },
  'performance_set': {
    name: 'Performance Top + Leggings/Shorts',
    required: [['performance', 'tshirt', 'top'], ['leggings', 'pantaloncini']],
    description: 'Performance workout set'
  },
  'outerwear_combo': {
    name: 'Giacca/Pile + T-Shirt + Pantaloni',
    required: [['giacca', 'pile', 'maglione'], ['tshirt', 'polo', 'camicia'], ['pantalone']],
    description: 'Outerwear layered look'
  },
  'mare': {
    name: 'Mare (Beachwear)',
    required: [['mare']],
    description: 'Beachwear - only matches with other mare/beach products'
  }
};

// Exclusion rules for sportswear
const EXCLUSION_RULES: Record<string, string[]> = {
  'mare': ['tshirt', 'felpa', 'giacca', 'pantalone', 'leggings', 'reggiseno_sportivo', 'tuta', 'polo', 'pile', 'maglione', 'camicia', 'performance', 'intimo'],
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

function isMareProduct(product: Product): boolean {
  const text = `${product.category || ''} ${product.name || ''}`.toLowerCase();
  return CATEGORY_KEYWORDS['mare'].some(keyword => text.includes(keyword.toLowerCase()));
}

// Detect gender/age from category AND name: "Donna" = female, "Uomo" = male, "Bambini" = children, null = unisex/unknown
// Keywords that imply women's-only products
const WOMENS_PRODUCT_KEYWORDS = ['skirt', 'dress', 'bra ', 'bralette', 'gonna', 'vestito', 'abito', 'crop top'];
// Keywords that imply men's-only products
const MENS_PRODUCT_KEYWORDS: string[] = []; // ROA doesn't have explicitly men-only product types

function detectGender(category: string | null, name?: string | null, description?: string | null): 'donna' | 'uomo' | 'bambini' | null {
  const text = `${category || ''} ${name || ''} ${description || ''}`.toLowerCase();
  // Check bambini first — children's products must never mix with adult
  if (text.includes('bambini') || text.includes('bambino') || text.includes('bambina') || 
      text.includes('kids') || text.includes('junior') || text.includes('ragazzo') || 
      text.includes('ragazza') || text.includes('neonato') || text.includes('neonata') || 
      text.includes('bimbo') || text.includes('bimba') || text.includes('infanzia')) return 'bambini';
  
  // Explicit gender labels (check women/donna BEFORE men to avoid substring issues)
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

// Filter products to match the gender/age of the starting/hero product — never mix Uomo/Donna/Bambini
function filterByGender(products: Product[], referenceProduct: Product | null): Product[] {
  if (!referenceProduct) return products;
  const refGender = detectGender(referenceProduct.category, referenceProduct.name, referenceProduct.description);
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

function groupProductsByCategory(products: Product[]): Record<string, Product[]> {
  const grouped: Record<string, Product[]> = {};
  
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

function filterByColors(products: Product[], colors: string[]): Product[] {
  if (colors.length === 0) return products;
  
  return products.filter(product => {
    if (!product.color) return false;
    const productColor = product.color.toLowerCase();
    return colors.some(color => productColor.includes(color.toLowerCase()));
  });
}

// Filter out products that have exclusions with previously selected categories
function filterByExclusions(
  products: Product[],
  selectedCategories: string[],
  dynamicExclusions: Record<string, string[]>
): Product[] {
  return products.filter(product => {
    const productCat = detectCategory(product.category, product.name);
    if (!productCat) return true;
    
    // Check if this product's category is excluded by any selected category
    for (const selectedCat of selectedCategories) {
      const exclusions = dynamicExclusions[selectedCat] || [];
      if (exclusions.includes(productCat)) {
        return false;
      }
    }
    
    // Check if this product excludes any selected category
    const productExclusions = dynamicExclusions[productCat] || [];
    for (const selectedCat of selectedCategories) {
      if (productExclusions.includes(selectedCat)) {
        return false;
      }
    }
    
    return true;
  });
}

// Filter mare products - they only go with other mare products
function filterMareCompatibility(
  products: Product[],
  startingProduct: Product | null
): Product[] {
  if (!startingProduct) return products;
  
  const startingIsMare = isMareProduct(startingProduct);
  
  if (startingIsMare) {
    // Only return mare products
    return products.filter(p => isMareProduct(p));
  } else {
    // Exclude mare products
    return products.filter(p => !isMareProduct(p));
  }
}

// Get products matching any of the allowed categories for a slot
function getProductsForSlot(
  groupedProducts: Record<string, Product[]>,
  allowedCategories: string[],
  colors: string[],
  selectedCategories: string[],
  startingProduct: Product | null,
  dynamicExclusions: Record<string, string[]>
): Product[] {
  let products: Product[] = [];
  for (const cat of allowedCategories) {
    if (groupedProducts[cat]) {
      products.push(...groupedProducts[cat]);
    }
  }
  
  // Apply mare compatibility filter
  products = filterMareCompatibility(products, startingProduct);
  
  // Apply exclusion rules
  products = filterByExclusions(products, selectedCategories, dynamicExclusions);
  
  // Apply color filter
  return colors.length > 0 ? filterByColors(products, colors) : products;
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { products, startingProductId, count } = await req.json() as GenerateLooksRequest;

    // Find starting product if specified
    const startingProduct: Product | null = startingProductId 
      ? products.find(p => p.id === startingProductId) ?? null
      : null;

    // Get the collection from starting product for config matching
    const targetCollection = startingProduct?.collection || null;
    console.log('Target collection for config matching:', targetCollection);

    // Fetch all configuration settings
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

    // Parse settings
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
    const startingCategoryForStyles = startingProduct ? detectCategory(startingProduct.category, startingProduct.name) : null;
    
    // Check if any style ref has this category as style-dominant
    const styleDominantRef = styleRefs.find(s => {
      const collectionMatch = !targetCollection || !s.collections?.length || s.collections.includes(targetCollection);
      const hasDominantCategory = s.styleDominantCategories?.some((cat: string) =>
        startingCategoryForStyles && cat.toLowerCase().includes(startingCategoryForStyles)
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
          return startingCategoryForStyles && catLower.includes(startingCategoryForStyles);
        });
        return collectionMatch && categoryMatch;
      });
    }
    console.log(`Style refs: ${styleRefs.length} total, ${matchedStyles.length} matched (startingCategory: ${startingCategoryForStyles}, styleDominant: ${!!styleDominantRef})`);
    const activePresets = styleSettings?.selectedPresets || [];

    // Determine effective style from configuration only
    const effectiveStyle = activePresets.length > 0 ? activePresets[0] : 'elegant';
    
    console.log('Configuration matched:', {
      colorConfig: matchedColorConfig?.name,
      model: matchedModel?.name,
      environment: matchedEnv?.name,
      stylePresets: activePresets,
      effectiveStyle
    });

    // Build dynamic exclusion rules
    const dynamicExclusions: Record<string, string[]> = { ...EXCLUSION_RULES };
    if (savedExclusions) {
      for (const excl of savedExclusions as any[]) {
        dynamicExclusions[excl.category] = excl.excludes || [];
      }
    }

    console.log('Generating looks with params:', { 
      startingProductId, 
      style: effectiveStyle, 
      count, 
      productCount: products.length,
      collection: targetCollection
    });

    // Auto-detect template based on starting product category
    let templateKey = 'casual_top_bottom';
    
    if (startingProduct) {
      const startingCat = detectCategory(startingProduct.category, startingProduct.name);
      if (startingCat) {
        switch (startingCat) {
          case 'mare': templateKey = 'mare'; break;
          case 'tshirt': case 'polo': case 'top': templateKey = 'casual_top_bottom'; break;
          case 'felpa': case 'giacca': case 'pile': case 'maglione': templateKey = 'layered_sport'; break;
          case 'reggiseno_sportivo': case 'performance': templateKey = 'activewear'; break;
          case 'tuta': templateKey = 'full_tracksuit'; break;
          case 'pantalone': case 'pantaloncini': case 'leggings': templateKey = 'casual_top_bottom'; break;
          case 'camicia': templateKey = 'outerwear_combo'; break;
        }
      }
    }

    const template = OUTFIT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Unknown outfit template: ${templateKey}`);
    }

    console.log('Using template:', templateKey, template.name);

    // Check if starting product is mare - if so, force mare template
    if (startingProduct && isMareProduct(startingProduct) && templateKey !== 'mare') {
      console.log('Starting product is mare, forcing mare template');
      templateKey = 'mare';
    }

    // Filter out mare products if not using mare template (unless starting product)
    let filteredProducts = products;
    
    // Apply gender filter first — never mix Uomo and Donna
    filteredProducts = filterByGender(filteredProducts, startingProduct);
    console.log(`After gender filter: ${filteredProducts.length} products`);
    
    if (templateKey !== 'mare') {
      filteredProducts = filteredProducts.filter(p => !isMareProduct(p) || p.id === startingProductId);
    } else {
      // Mare template: only mare products
      filteredProducts = filteredProducts.filter(p => isMareProduct(p));
    }

    // Group products by category
    const groupedProducts = groupProductsByCategory(filteredProducts);
    console.log('Grouped products:', Object.keys(groupedProducts).map(k => `${k}: ${groupedProducts[k].length}`));

    // Determine starting product category for exclusions
    const startingCategory = startingProduct 
      ? detectCategory(startingProduct.category, startingProduct.name)
      : null;
    const selectedCategories: string[] = startingCategory ? [startingCategory] : [];

    // Get available products for each slot in the template
    const slotProducts: { slot: string[]; products: Product[] }[] = [];
    for (const slot of template.required) {
      const prods = getProductsForSlot(groupedProducts, slot, [], selectedCategories, startingProduct, dynamicExclusions);
      slotProducts.push({ slot, products: prods });
      
      // Add detected categories from this slot to selectedCategories for next iterations
      const detectedCats = new Set<string>();
      for (const p of prods.slice(0, 5)) { // Sample first few
        const cat = detectCategory(p.category, p.name);
        if (cat) detectedCats.add(cat);
      }
      selectedCategories.push(...Array.from(detectedCats));
    }

    // Add optional shoes slot if shoes are available and hero isn't shoes
    const startingIsMare = startingProduct ? isMareProduct(startingProduct) : false;
    
    // Detect bottom type for shoe pairing hints
    let bottomType: string | null = null;
    if (startingProduct) {
      const sc = detectCategory(startingProduct.category, startingProduct.name);
      if (sc === 'pantalone') bottomType = 'pantalone';
      else if (sc === 'leggings') bottomType = 'leggings';
      else if (sc === 'pantaloncini') bottomType = 'pantaloncini';
      else if (sc === 'tuta') bottomType = 'tuta';
      else if (sc === 'mare') bottomType = 'mare';
    }
    // Also check non-starting slot products for bottom type
    if (!bottomType) {
      for (const sp of slotProducts) {
        for (const cat of sp.slot) {
          if (['pantalone', 'leggings', 'pantaloncini', 'tuta', 'mare'].includes(cat)) {
            bottomType = cat;
            break;
          }
        }
        if (bottomType) break;
      }
    }
    
    if (!startingIsMare && groupedProducts['scarpe']?.length > 0 && startingCategory !== 'scarpe') {
      const shoeProds = getProductsForSlot(groupedProducts, ['scarpe'], [], selectedCategories, startingProduct, dynamicExclusions);
      if (shoeProds.length > 0) {
        slotProducts.push({ slot: ['scarpe'], products: shoeProds });
        console.log(`Added optional shoes slot: ${shoeProds.length} products`);
      }
    }

    // Add optional accessories slot if accessories are available and hero isn't accessories
    if (!startingIsMare && groupedProducts['accessori']?.length > 0 && startingCategory !== 'accessori') {
      const accProds = getProductsForSlot(groupedProducts, ['accessori'], [], selectedCategories, startingProduct, dynamicExclusions);
      if (accProds.length > 0) {
        slotProducts.push({ slot: ['accessori'], products: accProds });
        console.log(`Added optional accessories slot: ${accProds.length} products`);
      }
    }

    console.log('Slot products:', slotProducts.map(s => `${s.slot.join('/')}: ${s.products.length}`));

    // Check if we have products for the core required slots (exclude optional shoes/accessories)
    const coreSlotProducts = slotProducts.slice(0, template.required.length);
    const missingSlots = coreSlotProducts.filter(s => s.products.length === 0);
    if (missingSlots.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Not enough products for: ${missingSlots.map(s => s.slot.join('/')).join(', ')}`,
        available: Object.keys(groupedProducts).map(k => `${k}: ${groupedProducts[k].length}`)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build exclusion rules context for AI
    const startingGender = startingProduct ? detectGender(startingProduct.category, startingProduct.name, startingProduct.description) : null;
    
    const exclusionContext = `
EXCLUSION RULES (MUST FOLLOW):
- Mare/beachwear products ONLY go with other mare products and accessories
- Respect style coherence: keep the look within a consistent sportswear aesthetic (casual, performance, or streetwear)
- GENDER RULE: NEVER mix "Donna" (women), "Uomo" (men), and "Bambini" (children) products. Each look must be for ONE audience only.${startingGender ? ` The starting product is ${startingGender === 'bambini' ? 'CHILDREN\'S' : startingGender === 'donna' ? 'WOMEN\'S' : 'MEN\'S'} — only select ${startingGender === 'bambini' ? 'children\'s' : startingGender === 'donna' ? 'women\'s' : 'men\'s'} or unisex items.` : ''}`;

    // Build configuration context from settings
    const configContext = buildConfigurationContext(matchedColorConfig, activePresets, matchedStyles);

    // Build the prompt for AI — SHUFFLE products before slicing
    // Include shoe_type for shoe products
    const productSummary = slotProducts.map(({ slot, products: prods }) => {
      const shuffled = shuffleArray(prods);
      const isShoeSlot = slot.includes('scarpe');
      return `${slot.join('/').toUpperCase()}:\n${shuffled.slice(0, 25).map(p => {
        const shoeType = isShoeSlot && p.ai_attributes?.shoe_type ? `, ShoeType: ${p.ai_attributes.shoe_type}` : '';
        return `  - ID: ${p.id}, Name: "${p.name}", Color: ${p.color || 'unknown'}, Price: ${p.price || 'N/A'}${shoeType}`;
      }).join('\n')}`;
    }).join('\n\n');

    // Build shoe-trouser pairing hints
    let shoePairingHint = '';
    if (bottomType) {
      const pairingMap: Record<string, string> = {
        'pantalone': 'Prefer "court" or "lifestyle" shoes for trousers — clean, low-profile.',
        'leggings': 'Prefer "runner" or "performance" shoes for leggings — athletic and dynamic.',
        'pantaloncini': 'Prefer "runner" or "lifestyle" shoes for shorts — sporty and casual.',
        'tuta': 'Prefer "runner" or "lifestyle" shoes for tracksuits — sporty heritage.',
        'mare': 'Prefer "slide" shoes for beachwear — open-toe, casual.',
      };
      shoePairingHint = pairingMap[bottomType] || '';
    }

    const startingProductContext = startingProduct 
      ? `\nSTARTING PRODUCT (MUST be included in every look):
  - ID: ${startingProduct.id}
  - Name: "${startingProduct.name}"
  - Category: ${startingProduct.category || 'unknown'}
  - Color: ${startingProduct.color || 'unknown'}
  - Collection: ${startingProduct.collection || 'unknown'}
  - Price: ${startingProduct.price || 'N/A'}

IMPORTANT: Every look MUST include this starting product. Build complementary outfits around it.\n`
      : '';

    const prompt = `You are a professional SPORTSWEAR stylist for the Champion brand. Create ${count} complete outfit look(s) using the "${template.name}" template.
${startingProductContext}
TEMPLATE: ${template.name}
DESCRIPTION: ${template.description}
${exclusionContext}
${configContext}

CRITERIA:
- Style: ${effectiveStyle}
- Color preference: Follow configuration harmony rules

AVAILABLE PRODUCTS BY CATEGORY:
${productSummary}

RULES:
1. Each look MUST include exactly ONE item from EACH category listed above (including SCARPE and ACCESSORI if available) — NO DUPLICATES within the same category
${startingProduct ? '2. EVERY look MUST include the starting product specified above' : ''}
${startingProduct ? '3' : '2'}. Items should match in style (${effectiveStyle}) and work together aesthetically
${startingProduct ? '4' : '3'}. Colors should be harmonious - consider matching or complementary colors
${startingProduct ? '5' : '4'}. Consider the overall vibe: casual, performance, or streetwear
${startingProduct ? '6' : '5'}. Gender/age consistency: NEVER mix "Donna" (women), "Uomo" (men), and "Bambini" (children) products. All items must be for the same audience.
${startingProduct ? '7' : '6'}. ALWAYS include exactly ONE shoe (scarpe) and exactly ONE accessory (accessori) to complete the total look — NEVER two shoes or two accessories
${startingProduct ? '8' : '7'}. CRITICAL: If the hero/starting product is a shoe, do NOT add another shoe. If the hero is an accessory, do NOT add another accessory.
${shoePairingHint ? `${startingProduct ? '9' : '8'}. SHOE PAIRING: ${shoePairingHint} Use the ShoeType attribute when available to pick the best match.` : ''}

Return your response as a JSON array with this exact structure:
[
  {
    "name": "Creative sportswear look name (e.g., 'Urban Champion', 'Street Power')",
    "description": "Brief description of the outfit and its vibe",
    "product_ids": ["id1", "id2", "id3"],
    "style": "${effectiveStyle}",
    "color_palette": ["color1", "color2"],
    "reasoning": "Why these items work together"
  }
]

Only return the JSON array, no other text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional sportswear stylist for the Champion brand. You create cohesive athletic and streetwear outfits that work well together in terms of color, style, and sporty appeal. Always respond with valid JSON only. STRICTLY follow exclusion rules.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response content:', content);

    // Parse the JSON response
    let looks;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        looks = JSON.parse(jsonMatch[0]);
      } else {
        looks = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // === Post-processing: deduplicate products ===
    const heroProductId = startingProduct?.id || null;

    for (const look of looks) {
      if (!look.product_ids || !Array.isArray(look.product_ids)) continue;

      // Step 1: Remove exact duplicate product IDs
      const seen = new Set<string>();
      look.product_ids = look.product_ids.filter((id: string) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Step 2: Remove duplicate categories — keep only one product per category
      const categoryMap: Record<string, string[]> = {};
      for (const pid of look.product_ids) {
        const prod = products.find(p => p.id === pid);
        if (!prod) continue;
        const cat = detectCategory(prod.category, prod.name);
        if (cat) {
          if (!categoryMap[cat]) categoryMap[cat] = [];
          categoryMap[cat].push(pid);
        }
      }

      const idsToRemove = new Set<string>();
      for (const [cat, pids] of Object.entries(categoryMap)) {
        if (pids.length <= 1) continue;
        // Keep the hero if it's in this category, otherwise keep the first
        const keepId = pids.includes(heroProductId!) ? heroProductId! : pids[0];
        for (const pid of pids) {
          if (pid !== keepId) idsToRemove.add(pid);
        }
        console.log(`Dedup: removed ${idsToRemove.size} extra "${cat}" product(s) from look`);
      }

      if (idsToRemove.size > 0) {
        look.product_ids = look.product_ids.filter((id: string) => !idsToRemove.has(id));
      }
    }

    // Validate and enrich the looks with product details
    const enrichedLooks = looks.map((look: any) => {
      const lookProducts = look.product_ids
        .map((id: string) => products.find(p => p.id === id))
        .filter(Boolean);
      
      // Calculate total price
      let totalPrice = 0;
      for (const product of lookProducts) {
        if (product.price) {
          const priceNum = parseFloat(product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
          if (!isNaN(priceNum)) {
            totalPrice += priceNum;
          }
        }
      }

      return {
        ...look,
        composition: template.name,
        total_price: totalPrice > 0 ? `€${totalPrice.toFixed(2)}` : null,
        products: lookProducts,
        // Include configuration info for image generation
        config: {
          modelReference: matchedModel?.url || null,
          environmentReference: matchedEnv?.url || null,
          styleReferences: matchedStyles.map(s => s.url),
          styleDominant: !!styleDominantRef,
          colorReferences: matchedColorConfig?.referenceImages?.map(r => r.url) || []
        }
      };
    });

    console.log('Generated looks:', enrichedLooks.length);

    return new Response(JSON.stringify({ looks: enrichedLooks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-looks function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
