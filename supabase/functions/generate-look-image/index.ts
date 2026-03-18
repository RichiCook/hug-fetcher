import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductInfo {
  name: string;
  color: string | null;
  category: string | null;
  image: string | null;
}

interface ImageProviderSetting {
  provider: 'lovable_ai' | 'openai' | 'replicate' | 'runware' | 'huggingface';
  model: string;
}

interface LookConfig {
  modelReference?: string | null;
  environmentReference?: string | null;
  styleReferences?: string[];
  colorReferences?: string[];
  styleDominant?: boolean;
}

// Garment layering rules
const LAYERING_RULES = {
  // Outer garments - worn on top and fully visible
  outerGarments: [
    'slipdress', 'slip dress', 'camicia da notte', 'sottoveste', 'kimono', 
    'vestaglia', 'accappatoio', 'pigiama', 'abito', 'babydoll', 'chemise'
  ],
  
  // Underwear - worn underneath, may be partially hidden
  underwear: [
    'reggiseno', 'bra', 'slip', 'perizoma', 'thong', 'shorts', 'reggicalze', 'garter',
    'body', 'bodysuit', 'corsetto', 'corset', 'bustino', 'bustier', 'canotta', 'bralette'
  ],
  
  // Accessories - hosiery attached to garters
  hosiery: ['calze', 'autoreggenti', 'collant', 'stockings', 'tights', 'giarrettiera']
};

// Detect category from product info
function detectCategory(category: string | null, name: string | null): string {
  const searchText = `${category || ''} ${name || ''}`.toLowerCase();
  
  for (const outer of LAYERING_RULES.outerGarments) {
    if (searchText.includes(outer)) return outer;
  }
  for (const under of LAYERING_RULES.underwear) {
    if (searchText.includes(under)) return under;
  }
  for (const hosiery of LAYERING_RULES.hosiery) {
    if (searchText.includes(hosiery)) return hosiery;
  }
  return category?.toLowerCase() || 'other';
}

// Check if product is an outer garment
function isOuterGarment(product: ProductInfo): boolean {
  const cat = detectCategory(product.category, product.name);
  return LAYERING_RULES.outerGarments.some(outer => cat.includes(outer));
}

// Check if product is underwear
function isUnderwear(product: ProductInfo): boolean {
  const cat = detectCategory(product.category, product.name);
  return LAYERING_RULES.underwear.some(under => cat.includes(under));
}

// Sort products by layer order (underwear first, then outer)
function sortByLayerOrder(products: ProductInfo[]): ProductInfo[] {
  return [...products].sort((a, b) => {
    const aIsOuter = isOuterGarment(a);
    const bIsOuter = isOuterGarment(b);
    if (aIsOuter && !bIsOuter) return 1; // Outer garments last
    if (!aIsOuter && bIsOuter) return -1;
    return 0;
  });
}

// Generate with Lovable AI using product images and configuration references
async function generateWithLovableAI(
  prompt: string, 
  productImages: string[], 
  modelReferenceImage: string | null,
  environmentReferenceImage: string | null,
  styleReferenceImages: string[]
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  // Limit to max 2 product images to avoid failures
  const limitedProductImages = productImages.slice(0, 2);
  // Limit style references to max 1
  const limitedStyleRefs = styleReferenceImages.slice(0, 1);
  
  console.log(`Using ${limitedProductImages.length} product refs, ${modelReferenceImage ? 1 : 0} model ref, ${environmentReferenceImage ? 1 : 0} env ref, ${limitedStyleRefs.length} style refs`);

  // Build message content with text and images
  const messageContent: any[] = [{ type: 'text', text: prompt }];
  
  // Add model reference image first if provided
  if (modelReferenceImage) {
    messageContent.push({
      type: 'image_url',
      image_url: { url: modelReferenceImage }
    });
  }

  // Add environment reference image if provided
  if (environmentReferenceImage) {
    messageContent.push({
      type: 'image_url',
      image_url: { url: environmentReferenceImage }
    });
  }
  
  // Add style reference images
  for (const styleUrl of limitedStyleRefs) {
    if (styleUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: styleUrl }
      });
    }
  }
  
  // Add product images as references
  for (const imageUrl of limitedProductImages) {
    if (imageUrl) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }
  }

  console.log(`Generating image with ${messageContent.length - 1} total reference images`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: messageContent }],
      modalities: ['image', 'text']
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded');
    if (response.status === 402) throw new Error('Payment required');
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  
  // Enhanced logging for debugging
  console.log('Lovable AI response:', JSON.stringify({
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length || 0,
    hasMessage: !!data.choices?.[0]?.message,
    hasImages: !!data.choices?.[0]?.message?.images,
    imageCount: data.choices?.[0]?.message?.images?.length || 0,
    textContent: data.choices?.[0]?.message?.content?.substring(0, 300) || 'no text content'
  }));

  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) {
    console.error('No image in response. Full response:', JSON.stringify(data).substring(0, 1000));
    throw new Error('No image generated');
  }
  return imageUrl;
}

// Generate with text-only prompt (fallback)
async function generateWithLovableAITextOnly(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Fallback: Generating with text-only prompt (no reference images)');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text']
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error (text-only):', response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Text-only response:', JSON.stringify({
    hasImages: !!data.choices?.[0]?.message?.images,
    imageCount: data.choices?.[0]?.message?.images?.length || 0
  }));

  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) throw new Error('No image generated (text-only fallback)');
  return imageUrl;
}

// Generate with OpenAI (can't use reference images effectively)
async function generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
  console.log('Generating with OpenAI gpt-image-1');
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI error:', error);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('No image generated');
  return url;
}

// Generate with Replicate
async function generateWithReplicate(prompt: string, apiKey: string): Promise<string> {
  console.log('Generating with Replicate flux-schnell');
  
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'black-forest-labs/flux-schnell',
      input: {
        prompt: prompt,
        go_fast: true,
        num_outputs: 1,
        aspect_ratio: '3:4',
        output_format: 'webp',
        output_quality: 80
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Replicate error:', error);
    throw new Error(`Replicate error: ${response.status}`);
  }

  const prediction = await response.json();
  
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { 'Authorization': `Token ${apiKey}` }
    });
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error('Replicate generation failed');
  }

  const imageUrl = result.output?.[0];
  if (!imageUrl) throw new Error('No image generated');
  return imageUrl;
}

// Generate with Hugging Face
async function generateWithHuggingFace(prompt: string, apiKey: string): Promise<string> {
  console.log('Generating with Hugging Face FLUX.1-schnell');
  
  const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Hugging Face error:', error);
    throw new Error(`Hugging Face error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:image/png;base64,${base64}`;
}

// Generate with Runware
async function generateWithRunware(prompt: string, apiKey: string): Promise<string> {
  console.log('Generating with Runware');
  
  const response = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      { taskType: 'authentication', apiKey },
      {
        taskType: 'imageInference',
        taskUUID: crypto.randomUUID(),
        positivePrompt: prompt,
        width: 768,
        height: 1024,
        model: 'runware:100@1',
        numberResults: 1,
        outputFormat: 'WEBP',
        CFGScale: 1,
        scheduler: 'FlowMatchEulerDiscreteScheduler',
        steps: 4
      }
    ]),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Runware error:', error);
    throw new Error(`Runware error: ${response.status}`);
  }

  const data = await response.json();
  const imageResult = data.data?.find((d: any) => d.taskType === 'imageInference');
  const imageUrl = imageResult?.imageURL;
  if (!imageUrl) throw new Error('No image generated');
  return imageUrl;
}

// Build prompt using configuration references - STRICT product accuracy
// imageIndexMap tells the AI which attached image corresponds to which role
function buildPrompt(
  products: ProductInfo[], 
  lookName: string | null, 
  lookDescription: string | null,
  lookStyle: string | null,
  hasModelReference: boolean,
  hasEnvironmentReference: boolean,
  hasStyleReferences: boolean,
  productImageCount: number,
  styleDominant: boolean = false
): string {
  // Build a map of which attached image index corresponds to which role
  // Order of attached images: model ref, environment ref, style refs, then product images
  let imageIndex = 1;
  const imageLabels: string[] = [];
  
  if (hasModelReference) {
    imageLabels.push(`- Attached image ${imageIndex}: MODEL REFERENCE — use ONLY for body proportions and pose. IGNORE garment colors/designs in this image.`);
    imageIndex++;
  }
  if (hasEnvironmentReference) {
    imageLabels.push(`- Attached image ${imageIndex}: ENVIRONMENT/BACKGROUND REFERENCE — reproduce this exact setting, location, and atmosphere as the background of the photo. IGNORE any garments or colors in this image.`);
    imageIndex++;
  }
  if (hasStyleReferences) {
    if (styleDominant) {
      imageLabels.push(`- Attached image ${imageIndex}: STYLE REFERENCE — CRITICAL: EXACTLY REPLICATE the photographic treatment, composition, pose angle, framing, color grading, contrast, lighting setup, editorial feel, FILM GRAIN/NOISE TEXTURE, and ENVIRONMENT/SETTING of this reference. The generated image MUST look like it was shot in the same photoshoot as this reference — same camera, same film stock, same location. This is the HIGHEST PRIORITY reference — the final image must be indistinguishable in style, texture, and atmosphere from this photo. IGNORE the specific garments/products shown — only replicate the photographic treatment and environment.`);
    } else {
      imageLabels.push(`- Attached image ${imageIndex}: STYLE REFERENCE — this is the MOST IMPORTANT reference for the overall look and feel of the photo. Match the same photographic style, lighting setup, color grading, mood, composition, camera angle, and editorial tone. The generated photo should feel like it belongs in the same editorial series as this reference. IGNORE the specific garments/products shown — only replicate the photographic treatment.`);
    }
    imageIndex++;
  }
  
  // Build EXACT product descriptions with emphasis on accuracy and link to image index
  const productDescriptions = products
    .map((p, index) => {
      const parts = [];
      if (p.color) parts.push(`Color: "${p.color}"`);
      if (p.name) parts.push(`Name: ${p.name}`);
      if (p.category) parts.push(`Category: ${p.category}`);
      
      // Only label images we actually have (limited to productImageCount)
      if (index < productImageCount) {
        const thisImageIndex = imageIndex + index;
        imageLabels.push(`- Attached image ${thisImageIndex}: PRODUCT REFERENCE for "${p.name}" — this image is the ONLY source of truth for this garment's exact color, texture, pattern, and design details. Copy the color EXACTLY as shown.`);
        return `- GARMENT ${index + 1} (see attached image ${thisImageIndex}): ${parts.join(' | ')}`;
      }
      return `- GARMENT ${index + 1} (no reference image): ${parts.join(' | ')}`;
    })
    .join('\n');

  const styleDirection = lookStyle || 'sporty streetwear';

  // Build background/environment section based on whether we have an environment reference
  let backgroundSection: string;
  if (hasEnvironmentReference) {
    backgroundSection = `- Use the ENVIRONMENT REFERENCE image as the background/setting for this photo
- Reproduce the same location, atmosphere, and spatial composition shown in the environment reference
- The model should be placed naturally within this environment
- Do NOT use a plain studio background — the environment reference defines the setting`;
  } else if (styleDominant && hasStyleReferences) {
    backgroundSection = `- REPRODUCE the exact background, environment, setting, and atmosphere shown in the STYLE REFERENCE image.
- The location, lighting conditions, and spatial composition must match the style reference.
- Do NOT default to a studio background — the style reference defines the setting.
- REPLICATE the exact FILM GRAIN, NOISE LEVEL, and TEXTURE visible in the style reference. If the reference has visible grain, the output MUST have the same grain level and character.
- Match the exact COLOR TEMPERATURE and TONAL RANGE of the style reference — if it is cool/blue-tinted, warm/amber, or muted/dark, reproduce that exactly. Do NOT brighten or clean up the tones.`;
  } else {
    backgroundSection = `- Clean neutral background (white or light gray studio)
- Even studio lighting`;
  }

  const headerLine = styleDominant && hasStyleReferences
    ? `STYLE REPLICATION PHOTO — MATCH THE STYLE REFERENCE EXACTLY`
    : `FASHION CATALOG PHOTO — COLOR ACCURACY IS THE #1 PRIORITY`;

  return `${headerLine}

IMAGE REFERENCE MAP (each attached image has ONE specific role — do not mix roles):
${imageLabels.join('\n')}

GARMENTS TO SHOW ON THE MODEL:
${productDescriptions}

COLOR ACCURACY RULES (CRITICAL — violating these makes the image unusable):
1. For each garment, look at its PRODUCT REFERENCE image and extract the EXACT color as it appears in that photo.
2. DO NOT darken, lighten, saturate, desaturate, warm, cool, or shift the hue of any garment color.
3. A light pastel color must remain a light pastel. A muted tone must remain muted. Match the EXACT shade, brightness, and saturation from the product reference.
4. If the product reference shows a light mauve/lilac jacket, the generated image must show the same light mauve/lilac — NOT a darker, more saturated, or brownish version.
5. The PRODUCT REFERENCE images are the ONLY source of truth for garment colors. Text color names are approximate — always defer to what the image actually shows.
6. Ambient light, background color, and environment must NOT tint or shift garment colors.

GARMENT DESIGN RULES:
1. Replicate the EXACT design, cut, silhouette, and details visible in each product reference image.
2. DO NOT invent features, add patterns, change proportions, or modify the garment.
3. Logos, zippers, buttons, stitching, and pockets must match the reference exactly.
4. NEVER generate competitor brand logos, designs, or recognizable shoes/garments from other brands (e.g. Nike, Adidas, Puma, New Balance, etc.). Only the brand's own products as shown in the product reference images are allowed.
5. Shoes MUST look exactly like the product reference image — same silhouette, same colors, same logo. Do NOT replace them with generic or other-brand sneakers.

PHOTOGRAPHY STYLE:
${styleDominant && hasStyleReferences ? `- THE STYLE REFERENCE IS THE ABSOLUTE AUTHORITY for ALL photographic decisions: composition, pose, framing, camera angle, lighting direction, color grading, contrast, saturation, mood, atmosphere, and editorial tone.
- The generated image MUST be INDISTINGUISHABLE in photographic style from the style reference — as if shot in the same session, same photographer, same setup. Only the garments change.
- Do NOT apply generic fashion catalog lighting or studio aesthetics. The style reference overrides ALL default photography directions.
- Garment colors must still be accurate to their product reference images, but lighting mood and color grading should match the style reference.
- REPLICATE the exact FILM GRAIN, NOISE, and TEXTURE visible in the style reference. If the reference has visible grain, the output MUST have the same grain level and character (fine grain, heavy grain, digital noise, etc.).
- Match the exact COLOR TEMPERATURE and TONAL RANGE — if the reference is cool/blue-tinted or warm/amber, reproduce that exactly. Do NOT default to neutral/clean tones.
- Match the DEPTH OF FIELD, FOCUS SOFTNESS, and any lens characteristics (wide angle distortion, telephoto compression, vignetting).
- Reproduce the same level of CONTRAST: crushed blacks, lifted shadows, highlight rolloff — copy it precisely from the style reference.
- If the reference looks like it was shot on film, the output MUST look like film too — with the same grain structure and color response.
- The ENVIRONMENT in the style reference (outdoor pitch, urban night, warehouse, etc.) defines WHERE this photo takes place. Reproduce that setting exactly.` : `- ${styleDirection} editorial fashion photography
${hasStyleReferences ? `- THE STYLE REFERENCE IMAGE DEFINES THE OVERALL PHOTOGRAPHIC TREATMENT. Match its lighting, color grading, mood, contrast, and editorial feel as closely as possible. The generated image should look like it was shot in the same editorial series.` : ''}
- Lighting must be balanced so garment colors appear exactly as in their product reference images`}
${styleDominant && hasStyleReferences ? `- FRAMING, CROP, and POSE must match the style reference — do NOT default to full-body if the reference shows a different crop or angle.` : `- Full body or 3/4 pose showing all garments clearly`}
- ALL garments including shoes MUST be WORN by the model on their body. Never place shoes or any product on the ground beside the model. Shoes go on the model's feet.
${backgroundSection}

Collection: ${lookName || 'Champion Sportswear'}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      products, 
      lookName, 
      lookDescription, 
      lookStyle,
      providerOverride, 
      apiKey, 
      modelReferenceImage,
      config 
    } = await req.json();

    // Initialize Supabase client to fetch settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get image provider setting from database
    let provider: ImageProviderSetting = { 
      provider: 'lovable_ai', 
      model: 'google/gemini-2.5-flash-image-preview' 
    };

    if (providerOverride) {
      provider = providerOverride;
    } else {
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'image_provider')
        .single();
      
      if (settingData?.value) {
        provider = settingData.value as ImageProviderSetting;
      }
    }

    // Get references from config passed in, or fallback to fetching from app_settings
    let modelReference = modelReferenceImage || (config as LookConfig)?.modelReference || null;
    let environmentReference = (config as LookConfig)?.environmentReference || null;
    let styleReferences = (config as LookConfig)?.styleReferences || [];
    const styleDominant = (config as LookConfig)?.styleDominant || false;
    // Fallback: fetch references from app_settings if not provided via config
    if (!modelReference || !environmentReference || styleReferences.length === 0) {
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('*')
        .in('id', ['ai_generation_references', 'style_references']);
      
      // Fetch model & environment references
      if (!modelReference || !environmentReference) {
        const aiRefs = settingsData?.find(s => s.id === 'ai_generation_references')?.value as {
          modelReferences?: { id: string; url: string; name: string; type: string; collections?: string[] }[];
          environmentReferences?: { id: string; url: string; name: string; type: string; collections?: string[] }[];
          activeModel?: string;
          activeEnvironment?: string;
        } | undefined;
        
        if (aiRefs) {
          // Use active model reference
          if (!modelReference && aiRefs.modelReferences?.length) {
            const activeRef = aiRefs.activeModel 
              ? aiRefs.modelReferences.find(r => r.id === aiRefs.activeModel)
              : aiRefs.modelReferences[0];
            modelReference = activeRef?.url || null;
          }
          // Use active environment reference
          if (!environmentReference && aiRefs.environmentReferences?.length) {
            const activeRef = aiRefs.activeEnvironment
              ? aiRefs.environmentReferences.find(r => r.id === aiRefs.activeEnvironment)
              : aiRefs.environmentReferences[0];
            environmentReference = activeRef?.url || null;
          }
        }
      }
      
      // Fetch style references
      if (styleReferences.length === 0) {
        const styleSettings = settingsData?.find(s => s.id === 'style_references')?.value as {
          styleReferences?: { url: string }[];
        } | undefined;
        
        if (styleSettings?.styleReferences?.length) {
          styleReferences = styleSettings.styleReferences.map(s => s.url);
        }
      }
    }

    console.log('Using image provider:', provider.provider);
    console.log('Model reference:', modelReference ? 'provided' : 'none');
    console.log('Environment reference:', environmentReference ? 'provided' : 'none');
    console.log('Style references:', styleReferences.length);
    console.log('Style dominant:', styleDominant);
    const productList = products as ProductInfo[];
    
    // Collect all product images as references
    const productImages = productList
      .map(p => p.image)
      .filter((img): img is string => !!img);

    // Build prompt with configuration context — pass productImageCount so prompt can label images
    const limitedProductImageCount = Math.min(productImages.length, 2);
    const prompt = buildPrompt(
      productList, 
      lookName, 
      lookDescription, 
      lookStyle,
      !!modelReference,
      !!environmentReference,
      styleReferences.length > 0,
      limitedProductImageCount,
      styleDominant
    );
    console.log('Generated prompt with style direction:', lookStyle);

    let imageUrl: string;

    switch (provider.provider) {
      case 'openai':
        const openaiKey = apiKey || Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) throw new Error('OpenAI API key not configured');
        const openaiPrompt = `${prompt}\n\nNote: Create realistic depiction of these lingerie items: ${productList.map(p => `${p.color || ''} ${p.name || ''}`).join(', ')}`;
        imageUrl = await generateWithOpenAI(openaiPrompt, openaiKey);
        break;

      case 'replicate':
        const replicateKey = apiKey || Deno.env.get('REPLICATE_API_KEY');
        if (!replicateKey) throw new Error('Replicate API key not configured');
        imageUrl = await generateWithReplicate(prompt, replicateKey);
        break;

      case 'huggingface':
        const hfKey = apiKey || Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
        if (!hfKey) throw new Error('Hugging Face access token not configured');
        imageUrl = await generateWithHuggingFace(prompt, hfKey);
        break;

      case 'runware':
        const runwareKey = apiKey || Deno.env.get('RUNWARE_API_KEY');
        if (!runwareKey) throw new Error('Runware API key not configured');
        imageUrl = await generateWithRunware(prompt, runwareKey);
        break;

      case 'lovable_ai':
      default:
        // Try with product images and configuration references
        try {
          imageUrl = await generateWithLovableAI(prompt, productImages, modelReference, environmentReference, styleReferences);
        } catch (error) {
          console.log('First attempt failed, trying text-only fallback:', error instanceof Error ? error.message : 'unknown');
          imageUrl = await generateWithLovableAITextOnly(prompt);
        }
        break;
    }

    console.log('Image generated successfully with provider:', provider.provider);

    return new Response(JSON.stringify({ 
      image: imageUrl,
      provider: provider.provider,
      reference_images_used: Math.min(productImages.length, 2),
      model_reference_used: !!modelReference,
      environment_reference_used: !!environmentReference,
      style_references_used: styleReferences.length,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating look image:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Rate limit exceeded') {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.message === 'Payment required') {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
