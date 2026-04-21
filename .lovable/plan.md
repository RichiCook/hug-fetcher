

## Plan: Move 3D Viewer to Top Hero Slot (Hoka Layout)

Make the 3D viewer take over the hero image slot at the very top of the product page when a `model_3d_url` exists — exactly like the Hoka demo. The flat product gallery is only shown when there is no 3D model.

### Changes

**File: `src/pages/ProductPage.tsx`**

1. **Hero section (around line 311)** — In the `Image Gallery` `<div className="relative">`, branch on `(product as any).model_3d_url`:
   - **If 3D model exists**: render `<ProductViewer3D>` (wrapped in `Suspense` with the hero image as fallback) inside this slot instead of the image gallery.
   - **Else**: render the existing mobile + desktop image gallery unchanged.

2. **Header transparency when 3D is active (line 296)** — When `model_3d_url` exists, switch header to a translucent variant (`bg-background/45 backdrop-blur-xl`, lighter border) so the white 3D canvas can flow underneath, matching Hoka.

3. **Negative top margin on hero section (line 311)** — When `model_3d_url` exists, add `-mt-[calc(2.5rem+1.25rem+1px)] sm:-mt-[calc(3rem+1.5rem+1px)]` to the hero `<section>` so the viewer tucks up under the sticky header (Hoka's exact offset).

4. **Remove the standalone 3D section (lines 460-475)** — Delete the separate "3D Viewer — below product details & passport" block since the viewer now lives at the top.

5. **Hero fallback variable** — Add `const heroFallbackImage = images[0];` before the return, used both in the `Suspense` fallback `<img>` and passed to `ProductViewer3D` as `fallbackImageUrl`.

6. **Suspense fallback styling** — Use `aspect-[3/4] w-full overflow-hidden bg-background/40 sm:rounded-lg` with `object-contain object-center` on the `<img>` (Hoka's styling).

### Result

- When a product has a 3D model: page opens with the rotating 3D viewer at the very top in the hero slot, header floats translucently over it, info block sits directly below.
- When no 3D model: existing image gallery hero behavior is unchanged.
- Order becomes: **3D Viewer (or Image Gallery) → Genuine Banner → Info Block → activations → Football Shirts → Lifestyle Shoes**.
- Memory `mem://features/product-page-layout` will be updated to reflect the new top placement.

