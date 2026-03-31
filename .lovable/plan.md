

## Plan: Deduplicate SKUs by Stripping Size Suffix on Import

### Problem
SKUs like `PS2384-02CB_48_41` and `PS2384-02CB_48_41.5` are the same product in different sizes, but get imported as separate products because the full SKU (with size) is used as `product_code`.

### Solution
Add a helper function that strips the trailing size portion from the product code (the last `_XX` or `_XX.X` segment), producing a "base SKU". Use this base SKU for deduplication during import — so multiple size variants merge into a single product entry.

### Technical Details

**File: `src/components/ExcelImportModal.tsx`**

1. **Add `stripSizeSuffix` helper** — removes the last `_` segment if it looks like a shoe size (number, optionally with `.5`):
   ```typescript
   const stripSizeSuffix = (code: string): string => {
     // PS2384-02CB_48_41.5 → PS2384-02CB_48
     return code.replace(/_\d{1,2}(\.\d)?$/, '');
   };
   ```

2. **Normalize product_code before dedup** — in `handleImport`, after extracting `productCode`, compute `baseCode = stripSizeSuffix(productCode)` and use `baseCode` as the effective `product_code` stored on the product and used for existence checks.

3. **Dedup within the import batch** — when multiple rows share the same base code, keep only the first occurrence (or merge images). Skip subsequent rows for the same base code and count them as "skipped" in results.

4. **Lookup existing products by base code** — the `.in('product_code', codes)` query already works since we'll store the base code as `product_code`.

### What the user sees
- Size variants are collapsed into one product per base SKU
- The import results will show skipped count for deduplicated size variants
- Existing products matched by base SKU get updated rather than creating duplicates

