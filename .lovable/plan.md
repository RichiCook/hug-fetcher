

## AI-Curated Looks v2.0 with Version Toggle

### Summary

Redesign the AI-Curated Looks section (`ProductGeneratedLook.tsx`) with a luxury card-based layout (v2.0), keep the current layout as v1.0, add a version toggle persisted in `app_settings`, and add a Similar Products section below.

### Architecture

The current `ProductGeneratedLook.tsx` (635 lines) contains all look rendering logic. Rather than bloating it further, we will:

1. Extract v1.0 rendering into `src/components/product/LookCardV1.tsx`
2. Create v2.0 rendering in `src/components/product/LookCardV2.tsx`
3. Create `src/components/product/SimilarProducts.tsx`
4. Create `src/components/product/ProductPreviewSheet.tsx` (bottom sheet popup)
5. Keep `ProductGeneratedLook.tsx` as the orchestrator that picks v1 or v2

### Database

- Store layout version in `app_settings` table with id `looks_layout_version`, value `{ version: "v2" }`. No migration needed — uses existing `app_settings` upsert pattern.

### Files to Create/Modify

**1. `src/components/product/LookCardV2.tsx`** (new, ~350 lines)
- Horizontal scroll-snap carousel with cards (min-width calc(100% - 40px), scroll-snap-align center)
- Each card: editorial AI image (3:4 aspect) with shimmer loading state + progress bar, gradient overlay with look name/tagline
- Stacked product rows: featured product (dark bg, non-clickable), paired products (light bg, clickable with chevron)
- Total + "Check on our Store" CTA button
- Collapsible styling note (collapsed by default, max-height transition)
- Pill-shaped pagination dots (active: 18x5px dark, inactive: 5x5px light)
- No color palette dots
- All typography: Cormorant Garamond headings, DM Sans body

**2. `src/components/product/ProductPreviewSheet.tsx`** (new, ~120 lines)
- Bottom sheet overlay triggered by tapping paired product row
- Fixed overlay with slide-up animation (350ms cubic-bezier)
- Handle bar, close button, large product image (1:1), name, price, "Check on our Store" CTA
- Width 393px / 100% on mobile

**3. `src/components/product/SimilarProducts.tsx`** (new, ~100 lines)
- Horizontal scroll carousel of product cards (148px wide)
- Header: search icon + "Similar Products" (Cormorant Garamond) + "Based on style" (DM Sans)
- Cards: 1:1 image, name, price, tag badges (warm-toned)
- Fetches products from same category/collection via Supabase query

**4. `src/components/ProductGeneratedLook.tsx`** (modify)
- Fetch `looks_layout_version` from `app_settings` on mount
- Conditionally render v1 (current inline code) or delegate to `LookCardV2`
- Pass all existing props/data through

**5. `src/pages/ProductEditPage.tsx`** or activation settings (modify)
- Add "AI-Curated Looks Layout" toggle (v1.0 Classic / v2.0 Refined)
- Upserts to `app_settings` with id `looks_layout_version`

**6. `src/pages/ProductPage.tsx`** (modify)
- Add `<SimilarProducts>` component after `ProductGeneratedLook`

**7. `tailwind.config.ts`** (modify)
- Add shimmer keyframe animation for the loading state

### Key Design Decisions

- Version preference stored in `app_settings` (shared across all users/sessions) — consistent with existing pattern for `look_display_settings`, `image_provider`, etc.
- The featured product is identified by matching `product_code === productCode` (the current page's product) or `hero_product_code`
- "Check on our Store" links to the product's `source_url`
- Similar Products queries products with matching category, excluding the current product

### Interaction Flow

```text
User scans QR → ProductPage loads
  → ProductGeneratedLook fetches layout version
  → If v2: renders LookCardV2 carousel
    → User taps paired product → ProductPreviewSheet opens
    → User taps "Check on our Store" → opens source_url
  → SimilarProducts renders below
```

