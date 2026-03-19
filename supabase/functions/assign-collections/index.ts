import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All Casadei line names from the product catalog
const LINE_NAMES = [
  // Multi-word or longer names first to avoid false matches
  'ReflexCleo', 'Knee-high', 'Kroccobel', 'Goldmember', 'Interstellar',
  'Superblade', 'Beaurivage', 'Starsway', 'Valsenales', 'Chantilly',
  'Cathedral', 'Josephine', 'K-Blade', 'Positano', 'Riderama',
  'Universe', 'Versilia', 'Offroad', 'Lingerie', 'Geraldine',
  'Malesia', 'Michelle', 'Milano',
  // Standard length names
  'Annabel', 'Antilope', 'Avenida', 'Ballet', 'Beaurivage',
  'Blade', 'Brera', 'Cappa', 'Charlie', 'Chantilly',
  'Concept', 'Crystal', 'Damier', 'Demetra', 'Divine',
  'Double', 'Flora', 'Hanoi', 'Jelly', 'Julia',
  'Liberty', 'Maxxxi', 'Marta', 'Nancy', 'Nexus',
  'Nuova', 'Panarea', 'Park', 'Passage', 'Patty',
  'Platform', 'Reflex', 'Riviera', 'Samurai', 'Scarpa',
  'Sirio', 'Sneakers', 'Solar', 'Soraya', 'Stitch',
  'Twiga', 'Vandome', 'Vegas', 'Venus', 'Winnie',
  'Zeppa', 'Emily', 'Flash',
  // Short names (more specific context needed)
  'Betty', 'Belle', 'Beat', 'Cleo', 'Criss',
  'Dami', 'Dome', 'Ale', 'Mia', 'Mini',
  'Mule', 'Muni', 'Pon',
  // Very short/generic names - match only at start
  'Off', 'New', 'High', 'Over', 'Flat',
  'Suede', 'Leather', 'Slingback', 'V',
];

// Remove duplicates and sort by length (longest first)
const SORTED_LINES = [...new Set(LINE_NAMES)].sort((a, b) => b.length - a.length);

function normalizeForMatch(text: string): string {
  return text.trim().toLowerCase();
}

function findLineMatch(productName: string): string | null {
  if (!productName) return null;
  
  // Strip "Casadei " prefix if present
  let name = productName.trim();
  if (name.toLowerCase().startsWith('casadei ')) {
    name = name.substring(8).trim();
  }
  
  const nameLower = normalizeForMatch(name);
  
  for (const line of SORTED_LINES) {
    const lineLower = line.toLowerCase();
    
    // Check if name starts with the line name (followed by space or end of string)
    if (nameLower === lineLower || nameLower.startsWith(lineLower + ' ')) {
      return line;
    }
  }
  
  // Second pass: check if the line name appears as a word anywhere in the name
  // Only for longer, more specific line names (5+ chars)
  for (const line of SORTED_LINES) {
    if (line.length < 5) continue;
    const lineLower = line.toLowerCase();
    const regex = new RegExp(`\\b${lineLower.replace('-', '\\-')}\\b`, 'i');
    if (regex.test(nameLower)) {
      return line;
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

    console.log('Starting Casadei collection (line) assignment...');

    // Fetch all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, product_code, collection');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    console.log(`Processing ${products?.length || 0} products`);

    const results: Record<string, number> = {};
    const updates: { id: string; collection: string }[] = [];
    const unmatched: string[] = [];

    for (const product of products || []) {
      const line = findLineMatch(product.name);
      
      if (line) {
        updates.push({ id: product.id, collection: line });
        results[line] = (results[line] || 0) + 1;
      } else {
        unmatched.push(product.name);
      }
    }

    console.log(`Matched ${updates.length} products to ${Object.keys(results).length} lines`);

    // Batch update products
    let errorCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ collection: update.collection })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating product ${update.id}:`, updateError);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Assigned ${updates.length} products to ${Object.keys(results).length} collections (lines)`,
      breakdown: results,
      errors: errorCount,
      remainingUnassigned: unmatched.length,
      unmatchedSamples: unmatched.slice(0, 30),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error assigning collections:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
