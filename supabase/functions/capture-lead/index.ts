import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaptureLeadRequest {
  email: string;
  name?: string;
  phone?: string;
  activationId?: string;
  productId?: string;
  rewardType: "code_screen" | "code_email";
  rewardPrefix?: string;
  resendEmail?: boolean;
  leadId?: string;
  rewardCode?: string;
}

function generateRewardCode(prefix?: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${code}` : code;
}

async function getProductData(supabase: any, productId: string) {
  const { data } = await supabase
    .from("products")
    .select("id, name, category")
    .eq("id", productId)
    .maybeSingle();
  return data;
}

async function sendRewardEmail(
  resend: Resend,
  email: string,
  name: string | undefined,
  rewardCode: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`Sending reward email to ${email} with code ${rewardCode}`);
  
  const displayName = name || "there";
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Rewards <onboarding@resend.dev>";
  
  console.log(`Using from email: ${fromEmail}`);
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: "🎁 Your Reward Code is Here!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 32px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎁</div>
                    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">
                      Hey ${displayName}!
                    </h1>
                    <p style="margin: 0 0 32px 0; font-size: 16px; color: #71717a; line-height: 1.5;">
                      Thank you for signing up! Here's your exclusive reward code:
                    </p>
                    <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                      <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; color: #18181b; letter-spacing: 2px;">
                        ${rewardCode}
                      </p>
                    </div>
                    <p style="margin: 0; font-size: 14px; color: #a1a1aa;">
                      Use this code at checkout to redeem your reward.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px; background-color: #fafafa; text-align: center; border-top: 1px solid #e4e4e7;">
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      This email was sent to ${email}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
  
  if (error) {
    console.error("Resend API error:", JSON.stringify(error));
    return { success: false, error: error.message };
  }
  
  console.log("Email sent successfully. Resend ID:", data?.id);
  return { success: true };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CaptureLeadRequest = await req.json();
    console.log("Received capture-lead request:", JSON.stringify(body, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle resend email request
    if (body.resendEmail && body.leadId && body.rewardCode) {
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY not configured");
      }
      
      const resend = new Resend(resendApiKey);
      const result = await sendRewardEmail(resend, body.email, body.name, body.rewardCode);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!body.email || !emailRegex.test(body.email)) {
      throw new Error("Invalid email address");
    }

    // Generate reward code
    const rewardCode = generateRewardCode(body.rewardPrefix);
    console.log(`Generated reward code: ${rewardCode}`);

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        email: body.email.trim().toLowerCase(),
        name: body.name?.trim() || null,
        phone: body.phone?.trim() || null,
        activation_id: body.activationId || null,
        product_id: body.productId || null,
        reward_type: body.rewardType,
        reward_code: rewardCode,
        reward_sent: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      throw new Error("Failed to save lead");
    }

    console.log("Lead saved:", lead.id);

    // Send email if reward type is code_email
    let emailSent = false;
    let emailError: string | undefined;
    if (body.rewardType === "code_email" && resendApiKey) {
      const resend = new Resend(resendApiKey);
      const result = await sendRewardEmail(resend, body.email, body.name, rewardCode);
      
      if (result.success) {
        emailSent = true;
        // Update lead to mark email as sent
        await supabase
          .from("leads")
          .update({ reward_sent: true })
          .eq("id", lead.id);
      } else {
        emailError = result.error;
        console.error("Email sending failed:", emailError);
      }
    } else if (body.rewardType === "code_email" && !resendApiKey) {
      console.warn("RESEND_API_KEY not configured - email not sent");
      emailError = "Email service not configured";
    }

    // Trigger CRM webhooks
    try {
      const productData = body.productId ? await getProductData(supabase, body.productId) : undefined;
      await supabase.functions.invoke("send-to-crm", {
        body: {
          leadData: {
            email: body.email,
            name: body.name,
            phone: body.phone,
            product: productData,
            reward_code: rewardCode,
          },
        },
      });
      console.log("CRM webhooks triggered");
    } catch (crmError) {
      console.error("Error triggering CRM webhooks:", crmError);
      // Don't throw - lead is saved, CRM sync can fail gracefully
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        rewardCode,
        emailSent,
        emailError,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in capture-lead function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
