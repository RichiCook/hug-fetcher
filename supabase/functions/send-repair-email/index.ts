import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      to, productName, productCode, damageType, damageDescription,
      photos, customerEmail, customerName, country, city,
      estimatedCostMin, estimatedCostMax, returnShippingCost, emailFields,
      isCustomerCopy,
    } = body;

    if (!to) {
      return new Response(JSON.stringify({ error: 'No recipient email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build email body based on enabled fields
    const enabledFieldIds = new Set((emailFields || []).map((f: any) => f.id));
    const lines: string[] = [];

    lines.push('<h2 style="font-family: sans-serif; color: #1a1a1a;">New Repair Request</h2>');

    if (enabledFieldIds.has('product_name_sku')) {
      lines.push(`<p><strong>Product:</strong> ${productName || 'N/A'} · ${productCode || 'N/A'}</p>`);
    }
    if (enabledFieldIds.has('damage_type')) {
      lines.push(`<p><strong>Damage Type:</strong> ${damageType || 'N/A'}</p>`);
      if (damageDescription) lines.push(`<p><em>${damageDescription}</em></p>`);
    }
    if (enabledFieldIds.has('customer_name')) {
      lines.push(`<p><strong>Customer Name:</strong> ${customerName || 'N/A'}</p>`);
    }
    if (enabledFieldIds.has('customer_email')) {
      lines.push(`<p><strong>Customer Email:</strong> ${customerEmail || 'N/A'}</p>`);
    }
    if (enabledFieldIds.has('customer_location')) {
      lines.push(`<p><strong>Location:</strong> ${city || ''}, ${country || ''}</p>`);
    }
    if (enabledFieldIds.has('estimated_cost') && estimatedCostMin != null) {
      lines.push(`<p><strong>Estimated Cost:</strong> €${estimatedCostMin} – €${estimatedCostMax}</p>`);
      lines.push(`<p><strong>Return Shipping:</strong> €${returnShippingCost}</p>`);
    }
    if (enabledFieldIds.has('warranty_status')) {
      lines.push(`<p><strong>Warranty:</strong> To be verified upon inspection</p>`);
    }
    if (enabledFieldIds.has('date_of_request')) {
      lines.push(`<p><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>`);
    }
    if (enabledFieldIds.has('damage_photos') && photos && photos.length > 0) {
      lines.push('<p><strong>Photos:</strong></p>');
      for (const url of photos) {
        lines.push(`<p><a href="${url}" target="_blank"><img src="${url}" style="max-width:200px;border-radius:4px;margin:4px 0;" /></a></p>`);
      }
    }

    const htmlBody = lines.join('\n');

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@aitems.com';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = isCustomerCopy
      ? `Repair Request Received: ${productName || 'Your Product'}`
      : `Repair Request: ${productName || 'Product'} — ${damageType || 'General'}`;

    const customerHeader = isCustomerCopy
      ? '<p style="font-family: sans-serif; color: #555;">Thank you for submitting your repair request. Here is a summary of your claim:</p>'
      : '';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        reply_to: isCustomerCopy ? undefined : (customerEmail || undefined),
        subject,
        html: customerHeader + htmlBody,
      }),
    });

    const emailResult = await emailRes.json();

    return new Response(JSON.stringify({ success: true, result: emailResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
