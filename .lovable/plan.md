

## Plan: Switch Look Image Generation from "Worn" to "Composition" Style

### What Changes

Update the AI prompt in the `generate-look-image` edge function to generate flat-lay/composition images (products arranged artistically on a surface) instead of images of a model wearing the outfit.

### Technical Details

**File: `supabase/functions/generate-look-image/index.ts`**

Rewrite the `buildPrompt` function to request a flat-lay composition instead of a fashion model photo:

1. **Replace the header** from "FASHION CATALOG PHOTO" to "PRODUCT COMPOSITION / FLAT-LAY PHOTO"
2. **Remove all model/body references** — no "worn by the model", no "model's feet", no "pose", no "full body"
3. **Update photography style** to describe a top-down or angled flat-lay arrangement on a clean surface (marble, wood, fabric backdrop)
4. **Update garment rules** to say "arrange products neatly" instead of "wear on body"
5. **Keep color accuracy rules** — these are still critical
6. **Keep style reference logic** — but reframe it for composition style (lighting, color grading, texture) rather than pose/framing
7. **Keep environment reference** — reframe as surface/backdrop reference
8. **Keep model reference** — reframe or skip (model refs become less relevant for compositions; could ignore or use as "mood" reference)
9. **Update the background section** default from "studio lighting on model" to "clean surface with products arranged in a visually appealing layout"

Key prompt changes:
- "Arrange all products in a stylish flat-lay composition viewed from above or at a slight angle"
- "Products should be neatly laid out, slightly overlapping or staggered for visual interest"
- "Show each product's full shape, design details, and colors clearly"
- "No mannequin, no human body, no worn styling"

