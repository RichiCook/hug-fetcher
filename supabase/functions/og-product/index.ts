import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch product
  const { data: product } = await supabase
    .from("products")
    .select("name, price, images, description")
    .eq("slug", slug)
    .single();

  // Fetch brand name
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("brand_name")
    .limit(1)
    .single();

  const brandName = settings?.brand_name || "Pantofola d'Oro";
  const productName = product?.name || "Product";
  const title = `${productName} | ${brandName}`;
  const description = product?.description
    ? product.description.substring(0, 160)
    : `${productName} by ${brandName}`;

  // Get first image
  let imageUrl = "";
  if (product?.images) {
    const imgs = Array.isArray(product.images) ? product.images : [];
    if (imgs.length > 0) {
      imageUrl = typeof imgs[0] === "string" ? imgs[0] : "";
    }
  }

  // Build the actual product page URL
  const siteUrl = "https://hug-fetcher.lovable.app";
  const productUrl = `${siteUrl}/product/${slug}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ""}
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ""}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(productUrl)}">${escapeHtml(productName)}</a>...</p>
  <script>window.location.replace("${productUrl}");</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
