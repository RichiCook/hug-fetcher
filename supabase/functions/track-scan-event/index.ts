import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_EVENT_TYPES = ['scan', 'page_view', 'look_product_click', 'look_regenerate', 'lead_capture'];

const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /discordbot/i, /slackbot/i,
  /pinterest/i, /applebot/i, /semrushbot/i, /ahrefsbot/i, /mj12bot/i,
  /dotbot/i, /petalbot/i, /bytespider/i, /gptbot/i,
  /bot\b/i, /crawl/i, /spider/i, /headless/i, /phantom/i, /lighthouse/i,
  /pagespeed/i, /preview/i, /fetch/i,
];

function isBot(ua: string | null): boolean {
  if (!ua) return true; // No user-agent = likely bot
  return BOT_PATTERNS.some(p => p.test(ua));
}

async function resolveGeo(ip: string): Promise<{ country?: string; city?: string; region?: string }> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,regionName`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return {};
    const data = await res.json();
    if (data.status !== 'success') return {};
    return { country: data.country, city: data.city, region: data.regionName };
  } catch {
    return {};
  }
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Bot detection
    const userAgent = req.headers.get('user-agent');
    if (isBot(userAgent)) {
      return new Response(
        JSON.stringify({ success: true, filtered: 'bot' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { session_id, event_type, product_code, target_product_code, look_product_codes, metadata } = body;

    if (!session_id || !event_type || !product_code) {
      return new Response(
        JSON.stringify({ error: 'session_id, event_type, and product_code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_EVENT_TYPES.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve geo from client IP
    const clientIp = getClientIp(req);
    let geo: { country?: string; city?: string; region?: string } = {};
    if (clientIp) {
      geo = await resolveGeo(clientIp);
    }

    const enrichedMetadata = {
      ...(metadata || {}),
      ...(geo.country ? { country: geo.country, city: geo.city, region: geo.region } : {}),
      user_agent: userAgent,
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('scan_events').insert({
      session_id,
      event_type,
      product_code,
      target_product_code: target_product_code || null,
      look_product_codes: look_product_codes || null,
      metadata: enrichedMetadata,
    });

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
