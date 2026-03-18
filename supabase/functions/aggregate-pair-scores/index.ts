import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CLICK_WEIGHT = 3;
const VIEW_WEIGHT = 1;
const CONVERSION_WEIGHT = 5;

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const pairScores: Record<string, { clicks: number; views: number; conversions: number }> = {};

    const addScore = (codeA: string, codeB: string, type: 'clicks' | 'views' | 'conversions') => {
      if (!codeA || !codeB || codeA === codeB) return;
      const [a, b] = orderPair(codeA, codeB);
      const key = `${a}|${b}`;
      if (!pairScores[key]) pairScores[key] = { clicks: 0, views: 0, conversions: 0 };
      pairScores[key][type]++;
    };

    // Fetch all scan events (paginated)
    let offset = 0;
    const pageSize = 1000;
    let allEvents: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from('scan_events')
        .select('event_type, product_code, target_product_code, look_product_codes')
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      allEvents.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    console.log(`Processing ${allEvents.length} events`);

    for (const event of allEvents) {
      const hero = event.product_code;
      const lookCodes: string[] = event.look_product_codes || [];

      switch (event.event_type) {
        case 'look_product_click':
          if (event.target_product_code) {
            addScore(hero, event.target_product_code, 'clicks');
          }
          break;

        case 'page_view':
          // Each pair in the look gets a view score
          for (const code of lookCodes) {
            if (code !== hero) addScore(hero, code, 'views');
          }
          break;

        case 'lead_capture':
          // All pairs in the look get conversion credit
          for (const code of lookCodes) {
            if (code !== hero) addScore(hero, code, 'conversions');
          }
          break;
      }
    }

    // Upsert into product_pair_scores
    const entries = Object.entries(pairScores);
    console.log(`Upserting ${entries.length} pair scores`);

    let upserted = 0;
    for (const [key, counts] of entries) {
      const [a, b] = key.split('|');
      const score = counts.clicks * CLICK_WEIGHT + counts.views * VIEW_WEIGHT + counts.conversions * CONVERSION_WEIGHT;

      const { error } = await supabase
        .from('product_pair_scores')
        .upsert({
          product_code_a: a,
          product_code_b: b,
          score,
          click_count: counts.clicks,
          view_count: counts.views,
          conversion_count: counts.conversions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_code_a,product_code_b' });

      if (error) {
        console.error(`Error upserting pair ${a}/${b}:`, error);
      } else {
        upserted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, events_processed: allEvents.length, pairs_upserted: upserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Aggregation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Aggregation failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
