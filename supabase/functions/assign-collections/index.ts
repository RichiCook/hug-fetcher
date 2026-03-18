import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Specific product-to-collection mappings based on provided list
const PRODUCT_COLLECTION_MAP: Record<string, string[]> = {
  'PETIT MACRAME': [
    'perizoma bianco',
    'culotte in seta nera con frastaglio in macramé',
    'canotta con ricamo a frastaglio macramé in seta bianca',
    'pantalone bianco',
    'reggiseno push-up bianco con macramé',
    'camicia da notte lunga in seta bianca con frastaglio macramé',
    'vestaglia lunga in seta bianca con frastaglio macramé',
    'camicia da notte lunga in seta nera con frastaglio macramé',
    'camicia da notte lunga nera',
    'reggiseno a triangolo bianco con macramé',
    'culotte in seta bianca con frastaglio in macramé',
    'reggiseno push-up beige rosato',
    'shorty beige rosato',
    'macramé',
    'macrame',
  ],
  'MAISON': [
    'camicia da notte lunga in seta blu con ricamo a frastaglio',
    'camicia da notte corta in raso di seta blu scuro con ricamo a frastaglio',
    'reggiseno con ferretto in seta blu con ricamo a frastaglio avorio',
    'slip medio in seta blu con ricamo a frastaglio',
    'slipdress in raso di seta rosa',
    'short in seta nera con frastaglio',
    'pigiama in seta blu con ricamo a frastaglio',
    'slipdress in raso di seta blu',
    'top in raso di seta blu scuro con ricamo a frastaglio',
    'camicia da notte lunga in seta nera con frastaglio',
    'vestaglia corta in raso',
    'raso di seta blu',
    'ricamo a frastaglio',
  ],
  'SILK': [
    'pigiama in seta blu elettrico',
    'vestaglia corta in seta blu elettrico',
    'canotta in seta con stampa floreale',
    'canotta in seta a righe',
    'short da pigiama in seta a righe',
    'canotta in seta blu elettrico',
    'short da pigiama in seta blu elettrico',
    'camicia da notte midi in seta blu elettrico',
    'pigiama in seta con stampa floreale',
    'pigiama in seta nera',
    'vestaglia lunga in seta azzurra',
    'camicia da notte in seta azzurra',
    'slipdress in seta',
    'slipdress corto in seta a righe',
    'sottoveste lunga in seta rosso granato',
    'short da pigiama in seta rosa cipria',
    'vestaglia lunga in seta blu elettrico',
    'short in seta rosso granato',
    'canotta in seta rossa',
    'blu elettrico',
    'seta azzurra',
    'stampa floreale',
    'seta a righe',
  ],
  'M PER SEMPRE': [
    'reggicalze off-white con pizzo leavers di cotone',
    'per sempre',
    'off-white con pizzo leavers',
  ],
  'DIAMANTE': [
    'baby doll in seta nera con pizzo leavers',
    'reggiseno a triangolo nero morbido con pizzo leavers',
    'reggicalze nero con pizzo leavers',
    'diamante',
  ],
  'ATELIER INTRECCI': [
    'body con fasce geometriche',
    'slip mare nero con soutache',
    'soutache',
    'intrecci',
    'fasce geometriche',
  ],
  'POESIA': [
    'bralette in blu acciaio e nero con pizzo leavers',
    'reggiseno push-up in blu acciaio e nero con pizzo leavers',
    'reggiseno push-up in beige chiaro e rosa pallido con pizzo leavers',
    'slip medio in blu acciaio e nero con pizzo leavers',
    'slip medio in beige chiaro e rosa pallido con pizzo leavers',
    'slip brasiliano in blu acciaio e nero con pizzo leavers',
    'slip brasiliano in beige chiaro e rosa pallido con pizzo leavers',
    'perizoma in blu acciaio e nero con pizzo leavers',
    'perizoma in beige chiaro e rosa pallido con pizzo leavers',
    'blu acciaio e nero',
    'beige chiaro e rosa pallido',
    'poesia',
  ],
  'NOTE BIANCHE': [
    'reggiseno a triangolo bianco morbido in pizzo leavers',
    'slip brasiliano in bianco con pizzo leavers',
    'perizoma in bianco con pizzo leavers',
    'note bianche',
    'bianco morbido in pizzo leavers',
  ],
  'ZUCCHERO FILATO': [
    'sottoveste corta in tulle stretch rosa beige trasparente',
    'tulle stretch rosa beige',
    'zucchero filato',
  ],
  'PER LEI': [
    'canotta in seta rosa con pizzo leavers',
    'canotta in seta bianca con pizzo leavers',
    'short in seta rosa con pizzo leavers',
    'short in seta bianca con pizzo leavers',
    'per lei',
    'seta rosa con pizzo leavers',
    'seta bianca con pizzo leavers',
  ],
  'SOUPLE': [
    'body in cotone nero',
    'body in cotone bianco',
    'body in cotone nude',
    't-shirt in cotone nero',
    't-shirt in cotone bianco',
    't-shirt in cotone nude',
    'reggiseno push-up in cotone nero',
    'reggiseno push-up invisible bianco',
    'reggiseno a triangolo nero con pizzo',
    'reggiseno a triangolo in pizzo bianco',
    'reggiseno a triangolo in pizzo nude',
    'canotta in cotone nero',
    'canotta in cotone bianco',
    'canotta nude in cotone',
    'short da pigiama in cotone nero',
    'short da pigiama in cotone bianco',
    'short da pigiama in cotone nude',
    'slip medio in cotone nero',
    'slip medio in cotone bianco',
    'slip medio in cotone nude',
    'shorty in cotone nero',
    'shorty in cotone bianco',
    'short in cotone nude',
    'slip brasiliano in cotone nero',
    'slip brasiliano in cotone bianco',
    'slip brasiliano in cotone nude',
    'perizoma in cotone nero',
    'perizoma in cotone bianco',
    'perizoma in cotone nude',
    'souple',
    'in cotone nero',
    'in cotone bianco',
    'in cotone nude',
  ],
  'SIMPLE DAYS': [
    'reggiseno bralette nero esclusiva online',
    'reggiseno bralette bianco esclusiva online',
    'slip medio nero esclusiva online',
    'slip medio bianco esclusiva online',
    'perizoma nero esclusiva online',
    'perizoma bianco esclusiva online',
    'simple days',
    'esclusiva online',
  ],
};

// Helper function to normalize text for matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to check if product matches any pattern
function findCollectionMatch(productName: string, productDescription: string, productCategory: string): string | null {
  const normalizedName = normalizeText(productName || '');
  const normalizedDesc = normalizeText(productDescription || '');
  const normalizedCat = normalizeText(productCategory || '');
  const searchText = `${normalizedName} ${normalizedDesc} ${normalizedCat}`;

  // Priority order: more specific matches first
  const priorityOrder = [
    'PETIT MACRAME',
    'MAISON', 
    'SILK',
    'M PER SEMPRE',
    'DIAMANTE',
    'ATELIER INTRECCI',
    'POESIA',
    'NOTE BIANCHE',
    'ZUCCHERO FILATO',
    'PER LEI',
    'SOUPLE',
    'SIMPLE DAYS',
  ];

  for (const collection of priorityOrder) {
    const patterns = PRODUCT_COLLECTION_MAP[collection];
    for (const pattern of patterns) {
      const normalizedPattern = normalizeText(pattern);
      
      // Direct substring match
      if (searchText.includes(normalizedPattern)) {
        return collection;
      }
      
      // Word-by-word matching for longer patterns
      const patternWords = normalizedPattern.split(' ').filter(w => w.length > 2);
      if (patternWords.length >= 2) {
        const matchScore = patternWords.filter(word => searchText.includes(word)).length;
        if (matchScore / patternWords.length >= 0.7) {
          return collection;
        }
      }
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting specific collection assignment...');

    // First reset all collections to allow re-assignment based on new rules
    const { error: resetError } = await supabase
      .from('products')
      .update({ collection: null })
      .not('id', 'is', null);

    if (resetError) {
      console.error('Error resetting collections:', resetError);
    }

    // Fetch all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, description, category');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    console.log(`Processing ${products?.length || 0} products`);

    const results: Record<string, number> = {};
    const updates: { id: string; collection: string }[] = [];
    const unmatched: string[] = [];

    // Match each product
    for (const product of products || []) {
      const collection = findCollectionMatch(product.name, product.description, product.category);
      
      if (collection) {
        updates.push({ id: product.id, collection });
        results[collection] = (results[collection] || 0) + 1;
      } else {
        unmatched.push(product.name);
      }
    }

    console.log(`Matched ${updates.length} products to collections`);

    // Batch update products
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ collection: update.collection })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating product ${update.id}:`, updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Assigned collections to ${updates.length} products`,
      breakdown: results,
      remainingUnassigned: unmatched.length,
      unmatchedSamples: unmatched.slice(0, 30)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error assigning collections:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
