import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShopifyVariant {
  sku: string;
  available: boolean;
}

interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
}

interface ShopifyPage {
  products: ShopifyProduct[];
}

const STORE_BASE = "https://www.roa-hiking.com";

async function fetchAllStoreProducts(): Promise<Map<string, boolean>> {
  // Map from SKU (e.g. "J318381-36-Grey") -> available
  const skuAvailability = new Map<string, boolean>();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${STORE_BASE}/products.json?limit=250&page=${page}`;
    console.log(`Fetching page ${page}: ${url}`);

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch page ${page}: ${res.status}`);
      break;
    }

    const data: ShopifyPage = await res.json();

    if (!data.products || data.products.length === 0) {
      hasMore = false;
      break;
    }

    for (const product of data.products) {
      for (const variant of product.variants) {
        const sku = (variant.sku || "").trim().toUpperCase();
        if (!sku) continue;

        // If any variant with this exact SKU is available, mark it available
        if (variant.available) {
          skuAvailability.set(sku, true);
        } else if (!skuAvailability.has(sku)) {
          skuAvailability.set(sku, false);
        }

        // Also store a "base" key without size for products stored without size in DB
        // e.g. "J318381-GREY" from "J318381-36-GREY"
        const parts = sku.split("-");
        if (parts.length >= 3) {
          // product_code format: CODE-SIZE-COLOR -> base = CODE-COLOR
          const baseKey = `${parts[0]}-${parts.slice(2).join("-")}`;
          if (variant.available) {
            skuAvailability.set(baseKey, true);
          } else if (!skuAvailability.has(baseKey)) {
            skuAvailability.set(baseKey, false);
          }
        }
      }
    }

    console.log(
      `Page ${page}: ${data.products.length} products, ${skuAvailability.size} unique SKUs so far`
    );

    if (data.products.length < 250) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return skuAvailability;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch all ROA store products
    console.log("Starting availability check against roa-hiking.com...");
    const storeAvailability = await fetchAllStoreProducts();
    console.log(`Fetched ${storeAvailability.size} SKUs from ROA store`);

    // Step 2: Fetch all products from our database
    const allProducts: { id: string; product_code: string; is_available: boolean }[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_code, is_available")
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error("Error fetching DB products:", error);
        break;
      }

      if (!data || data.length === 0) break;
      allProducts.push(...data);
      if (data.length < batchSize) break;
      offset += batchSize;
    }

    console.log(`Found ${allProducts.length} products in database`);

    // Step 3: Compare and determine changes
    const toMarkUnavailable: string[] = [];
    const toMarkAvailable: string[] = [];
    let matched = 0;
    let unmatched = 0;

    for (const product of allProducts) {
      const sku = (product.product_code || "").trim().toUpperCase();
      if (!sku) continue;

      // Try exact SKU match first, then base key (without size)
      let storeIsAvailable = storeAvailability.get(sku);

      if (storeIsAvailable === undefined) {
        // Try base key: CODE-COLOR (strip size segment)
        const parts = sku.split("-");
        if (parts.length >= 3) {
          const baseKey = `${parts[0]}-${parts.slice(2).join("-")}`;
          storeIsAvailable = storeAvailability.get(baseKey);
        }
      }

      if (storeIsAvailable === undefined) {
        // SKU not found on store at all - don't change availability
        // (product may be from a different source or not yet listed)
        unmatched++;
        continue;
      }

      matched++;

      if (product.is_available && !storeIsAvailable) {
        toMarkUnavailable.push(product.id);
      } else if (!product.is_available && storeIsAvailable) {
        toMarkAvailable.push(product.id);
      }
    }

    console.log(
      `Matched: ${matched}, Unmatched: ${unmatched}, Changes: ${toMarkUnavailable.length} to unavailable, ${toMarkAvailable.length} to available`
    );

    // Step 4: Batch update
    if (toMarkUnavailable.length > 0) {
      for (let i = 0; i < toMarkUnavailable.length; i += 500) {
        const chunk = toMarkUnavailable.slice(i, i + 500);
        const { error } = await supabase
          .from("products")
          .update({ is_available: false })
          .in("id", chunk);

        if (error) console.error("Error marking unavailable:", error);
      }
    }

    if (toMarkAvailable.length > 0) {
      for (let i = 0; i < toMarkAvailable.length; i += 500) {
        const chunk = toMarkAvailable.slice(i, i + 500);
        const { error } = await supabase
          .from("products")
          .update({ is_available: true })
          .in("id", chunk);

        if (error) console.error("Error marking available:", error);
      }
    }

    const result = {
      totalStoreSkus: storeAvailability.size,
      totalDbProducts: allProducts.length,
      matched,
      unmatched,
      markedUnavailable: toMarkUnavailable.length,
      markedAvailable: toMarkAvailable.length,
      unchanged:
        allProducts.length -
        toMarkUnavailable.length -
        toMarkAvailable.length,
    };

    console.log("Availability check complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Availability check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
