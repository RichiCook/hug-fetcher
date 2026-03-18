import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOE_TYPES = ['runner', 'court', 'slide', 'boot', 'lifestyle', 'performance'] as const;
type ShoeType = typeof SHOE_TYPES[number];

const SHOE_CATEGORY_KEYWORDS = ['scarpe', 'scarpa', 'sneaker', 'sneakers', 'shoes', 'shoe', 'ciabatte', 'ciabatta', 'sandali', 'sandalo', 'slide', 'slides', 'calzature', 'trainer', 'trainers'];

function isShoeProduct(category: string | null, name: string | null): boolean {
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  return SHOE_CATEGORY_KEYWORDS.some(kw => text.includes(kw));
}

function getBestImage(images: unknown, productCode: string | null): string | null {
  let parsed: string[] = [];
  if (Array.isArray(images)) {
    parsed = images.filter((img): img is string => typeof img === 'string');
  } else if (typeof images === 'string') {
    try {
      const p = JSON.parse(images);
      if (Array.isArray(p)) parsed = p.filter((img): img is string => typeof img === 'string');
    } catch { parsed = [images]; }
  }
  if (parsed.length === 0) return null;

  // Filter by SKU if available
  if (productCode) {
    const code = productCode.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const skuMatched = parsed.filter(url => url.toLowerCase().includes(code));
    if (skuMatched.length > 0) parsed = skuMatched;
  }

  // Prefer _Full.jpg flat-lay
  const flatLay = parsed.find(url => /_full\.(jpg|png|webp|jpeg)(\?.*)?$/i.test(url));
  if (flatLay) return flatLay;

  // Any non-crop, non-alt image
  const clean = parsed.find(url => {
    const l = url.toLowerCase();
    return !l.includes('_crop') && !l.includes('_alt') && !l.includes('_detail');
  });
  return clean || parsed[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products
    const allProducts: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, images, product_code, ai_attributes')
        .range(offset, offset + batchSize - 1);

      if (error) { console.error('DB error:', error); break; }
      if (data && data.length > 0) {
        allProducts.push(...data);
        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Filter to shoe products only
    const shoeProducts = allProducts.filter(p => isShoeProduct(p.category, p.name));

    // Skip already classified
    const unclassified = shoeProducts.filter(p => {
      const attrs = p.ai_attributes;
      if (!attrs || typeof attrs !== 'object') return true;
      return !(attrs as any).shoe_type;
    });

    console.log(`Found ${shoeProducts.length} shoe products, ${unclassified.length} unclassified`);

    if (unclassified.length === 0) {
      // Return existing classification summary
      const summary: Record<string, number> = {};
      for (const p of shoeProducts) {
        const type = (p.ai_attributes as any)?.shoe_type || 'unknown';
        summary[type] = (summary[type] || 0) + 1;
      }
      return new Response(JSON.stringify({
        classified: 0,
        total: shoeProducts.length,
        alreadyClassified: shoeProducts.length,
        summary
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process in batches of 5
    const BATCH_SIZE = 5;
    let classifiedCount = 0;
    const typeCounts: Record<string, number> = {};

    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
      const batch = unclassified.slice(i, i + BATCH_SIZE);

      const classificationPromises = batch.map(async (product) => {
        const imageUrl = getBestImage(product.images, product.product_code);
        if (!imageUrl) {
          console.log(`No image for product ${product.id}, skipping`);
          return null;
        }

        try {
          const messages: any[] = [
            {
              role: 'system',
              content: `You are a shoe classification expert for sportswear. Classify shoes into EXACTLY one of these categories:
- runner: Running-inspired shoes, mesh/knit upper, chunky/cushioned sole, athletic silhouette
- court: Low-profile, clean lines, tennis/basketball heritage, flat sole, classic sneaker
- slide: Ciabatte, sandals, flip-flops, slip-on open-toe footwear
- boot: Boots, high-top shoes, winter/hiking shoes, ankle coverage
- lifestyle: Classic lifestyle sneakers, retro designs, casual wear, canvas shoes
- performance: Technical/sport-specific shoes (gym, training, cleats), specialized athletic footwear

Respond with ONLY the category name, nothing else. One single word.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Classify this shoe: "${product.name}". Category: ${product.category || 'unknown'}. Look at the image and respond with one word only.`
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ];

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages,
            }),
          });

          if (!response.ok) {
            if (response.status === 429) {
              console.log('Rate limited, waiting 5s...');
              await new Promise(r => setTimeout(r, 5000));
              return null; // Skip this one, will be caught on re-run
            }
            console.error(`AI error for ${product.id}:`, response.status);
            return null;
          }

          const aiResponse = await response.json();
          const content = aiResponse.choices?.[0]?.message?.content?.trim().toLowerCase();

          if (!content) return null;

          // Validate the response is one of the valid types
          const shoeType = SHOE_TYPES.find(t => content.includes(t));
          if (!shoeType) {
            console.log(`Invalid classification "${content}" for ${product.name}, defaulting to lifestyle`);
            return { id: product.id, shoeType: 'lifestyle' as ShoeType, existingAttrs: product.ai_attributes };
          }

          return { id: product.id, shoeType, existingAttrs: product.ai_attributes };
        } catch (err) {
          console.error(`Error classifying ${product.id}:`, err);
          return null;
        }
      });

      const results = await Promise.all(classificationPromises);

      // Update database for successful classifications
      for (const result of results) {
        if (!result) continue;

        const mergedAttrs = {
          ...(typeof result.existingAttrs === 'object' && result.existingAttrs ? result.existingAttrs : {}),
          shoe_type: result.shoeType,
        };

        const { error } = await supabase
          .from('products')
          .update({ ai_attributes: mergedAttrs })
          .eq('id', result.id);

        if (error) {
          console.error(`Failed to update ${result.id}:`, error);
        } else {
          classifiedCount++;
          typeCounts[result.shoeType] = (typeCounts[result.shoeType] || 0) + 1;
        }
      }

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: classified ${results.filter(Boolean).length}/${batch.length}`);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < unclassified.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return new Response(JSON.stringify({
      classified: classifiedCount,
      total: shoeProducts.length,
      alreadyClassified: shoeProducts.length - unclassified.length,
      summary: typeCounts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in classify-shoes:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
