

# Fix: Excel Import Failing with Duplicate Slug Errors

## Problem
All 2,336 products failed to import because slugs collide with the `products_slug_key` unique constraint. Two causes:
1. Products with the same name and product code generate identical slugs
2. Without a product code, `Date.now()` produces the same value for products processed in the same millisecond

## Solution

### 1. Make slugs unique per row (ExcelImportModal.tsx)
- Add a per-row index to the slug suffix so no two rows in the same import can collide
- Change `generateSlug` to accept a unique index: `generateSlug(name, productCode, index)`
- Append the index (or a random string) to every slug to guarantee uniqueness

### 2. Handle existing products via upsert logic
- Before inserting a batch, check if products with matching `product_code` already exist
- If a product_code match is found, update the existing row instead of inserting
- For products without a product_code, always insert with a unique slug

### Technical Details

**File: `src/components/ExcelImportModal.tsx`**

- Update `generateSlug` to include a unique counter or random suffix:
  ```
  const generateSlug = (name, productCode, index) => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suffix = productCode
      ? `-${productCode}-${index}`
      : `-${Date.now().toString(36)}${index.toString(36)}`;
    return `${base}${suffix}`;
  };
  ```

- Update the batch insert logic (lines 198-206) to use Supabase `.upsert()` with `onConflict: 'slug'` or handle conflicts on `product_code`:
  - If products have a `product_code`, upsert on `product_code` (skip slug conflict)
  - If no `product_code`, the unique slug from step 1 prevents collisions

- Pass a global row counter into `generateSlug` so each product across all batches gets a unique index

