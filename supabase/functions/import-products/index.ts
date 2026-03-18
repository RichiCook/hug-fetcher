import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface ProductImport {
  name: string;
  product_code?: string;
  price?: string;
  description?: string;
  composition?: string;
  care_instructions?: string;
  images?: string[];
  category?: string;
  color?: string;
  source_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find integration by API key
    const { data: integration, error: integrationError } = await supabase
      .from("api_integrations")
      .select("*")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .eq("provider", "products")
      .maybeSingle();

    if (integrationError || !integration) {
      console.error("Invalid API key or inactive integration");
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const products: ProductImport[] = body.products || [];

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "No products provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Importing ${products.length} products for integration ${integration.id}`);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const product of products) {
      try {
        if (!product.name) {
          results.failed++;
          results.errors.push(`Product missing name`);
          continue;
        }

        // Generate slug from name
        const slug = product.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") + 
          "-" + Date.now().toString(36);

        const productData = {
          name: product.name,
          slug,
          product_code: product.product_code,
          price: product.price,
          description: product.description,
          composition: product.composition,
          care_instructions: product.care_instructions,
          images: product.images ? JSON.stringify(product.images) : "[]",
          category: product.category,
          color: product.color,
          source_url: product.source_url,
        };

        // Check if product exists by product_code
        if (product.product_code) {
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("product_code", product.product_code)
            .maybeSingle();

          if (existing) {
            // Update existing product
            const { error: updateError } = await supabase
              .from("products")
              .update({
                ...productData,
                slug: undefined, // Don't update slug
              })
              .eq("id", existing.id);

            if (updateError) throw updateError;
            results.updated++;
            continue;
          }
        }

        // Insert new product
        const { error: insertError } = await supabase
          .from("products")
          .insert(productData);

        if (insertError) throw insertError;
        results.created++;
      } catch (error) {
        console.error("Error processing product:", error);
        results.failed++;
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Failed to import "${product.name}": ${errMsg}`);
      }
    }

    // Log the API call
    await supabase.from("api_logs").insert({
      integration_id: integration.id,
      direction: "inbound",
      status: results.failed === products.length ? "error" : "success",
      payload: { 
        total: products.length, 
        created: results.created, 
        updated: results.updated, 
        failed: results.failed 
      },
      error_message: results.errors.length > 0 ? results.errors.join("; ") : null,
    });

    // Update last sync time
    await supabase
      .from("api_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integration.id);

    console.log("Import results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in import-products:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
