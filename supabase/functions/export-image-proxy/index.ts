const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
      return new Response(JSON.stringify({ error: 'Unsupported protocol' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch(parsedTarget.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Lovable Export Proxy)',
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'referer': `${parsedTarget.origin}/`,
      },
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream responded ${upstream.status}` }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=3600';

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
