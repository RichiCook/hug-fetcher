import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface LeadImport {
  email: string;
  name?: string;
  phone?: string;
  additional_data?: Record<string, unknown>;
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
      .eq("provider", "leads")
      .maybeSingle();

    if (integrationError || !integration) {
      console.error("Invalid API key or inactive integration");
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const leads: LeadImport[] = body.leads || [];

    if (!Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "No leads provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Importing ${leads.length} leads for integration ${integration.id}`);

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const lead of leads) {
      try {
        if (!lead.email) {
          results.failed++;
          results.errors.push(`Lead missing email`);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lead.email)) {
          results.failed++;
          results.errors.push(`Invalid email: ${lead.email}`);
          continue;
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("email", lead.email)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Insert lead
        const { error: insertError } = await supabase
          .from("leads")
          .insert({
            email: lead.email,
            name: lead.name,
            phone: lead.phone,
            additional_data: lead.additional_data || {},
            reward_type: "imported",
          });

        if (insertError) throw insertError;
        results.imported++;
      } catch (error) {
        console.error("Error processing lead:", error);
        results.failed++;
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Failed to import "${lead.email}": ${errMsg}`);
      }
    }

    // Log the API call
    await supabase.from("api_logs").insert({
      integration_id: integration.id,
      direction: "inbound",
      status: results.failed === leads.length ? "error" : "success",
      payload: { 
        total: leads.length, 
        imported: results.imported, 
        skipped: results.skipped,
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
    console.error("Error in import-leads:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
