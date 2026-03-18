import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CrmPayload {
  event: string;
  timestamp: string;
  data: {
    email: string;
    name?: string;
    phone?: string;
    product?: {
      id: string;
      name: string;
      category?: string;
    };
    reward_code?: string;
    additional_data?: Record<string, unknown>;
  };
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

    const body = await req.json();
    const { leadData, test, integrationId, webhookUrl, provider } = body;

    // Test mode - just send a test payload
    if (test && integrationId && webhookUrl) {
      console.log(`Testing webhook for integration ${integrationId}`);
      
      const testPayload: CrmPayload = {
        event: "lead.test",
        timestamp: new Date().toISOString(),
        data: {
          email: "test@example.com",
          name: "Test User",
          phone: "+1234567890",
          product: {
            id: "test-product-id",
            name: "Test Product",
            category: "Test Category",
          },
          reward_code: "TEST-ABC123",
        },
      };

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testPayload),
        });

        const status = response.ok ? "success" : "error";
        const errorMessage = response.ok ? null : `HTTP ${response.status}: ${await response.text()}`;

        // Log the test
        await supabase.from("api_logs").insert({
          integration_id: integrationId,
          direction: "outbound",
          status,
          payload: testPayload,
          error_message: errorMessage,
        });

        if (!response.ok) {
          throw new Error(errorMessage || "Webhook failed");
        }

        return new Response(
          JSON.stringify({ success: true, message: "Test webhook sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Test webhook failed:", error);
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        return new Response(
          JSON.stringify({ success: false, error: errMsg }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Real lead data - send to all active outbound integrations
    if (!leadData) {
      return new Response(
        JSON.stringify({ error: "No lead data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending lead to CRM integrations:", leadData.email);

    // Fetch all active outbound integrations
    const { data: integrations, error: intError } = await supabase
      .from("api_integrations")
      .select("*")
      .eq("type", "outbound")
      .eq("is_active", true);

    if (intError) {
      throw intError;
    }

    if (!integrations || integrations.length === 0) {
      console.log("No active outbound integrations found");
      return new Response(
        JSON.stringify({ success: true, message: "No integrations to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: CrmPayload = {
      event: "lead.created",
      timestamp: new Date().toISOString(),
      data: leadData,
    };

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send to each integration
    for (const integration of integrations) {
      if (!integration.webhook_url) {
        results.failed++;
        results.errors.push(`${integration.name}: No webhook URL configured`);
        continue;
      }

      try {
        console.log(`Sending to ${integration.name} (${integration.provider})`);
        
        const response = await fetch(integration.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const status = response.ok ? "success" : "error";
        const errorMessage = response.ok ? null : `HTTP ${response.status}`;

        // Log the call
        await supabase.from("api_logs").insert({
          integration_id: integration.id,
          direction: "outbound",
          status,
          payload,
          error_message: errorMessage,
        });

        // Update last sync time
        if (response.ok) {
          await supabase
            .from("api_integrations")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("id", integration.id);
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${integration.name}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`Error sending to ${integration.name}:`, error);
        results.failed++;
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${integration.name}: ${errMsg}`);

        // Log the error
        await supabase.from("api_logs").insert({
          integration_id: integration.id,
          direction: "outbound",
          status: "error",
          payload,
          error_message: errMsg,
        });
      }
    }

    console.log("CRM sync results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-to-crm:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
