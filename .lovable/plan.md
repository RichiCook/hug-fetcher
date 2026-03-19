

## Plan: Deduplicate Celebrity Content & Stream Unmatched to Category

### What we're solving
1. **Duplicates** — The Excel import creates duplicates when re-imported (same celebrity + same image URL). Need deduplication both on import and a way to clean existing duplicates.
2. **Unmatched entries (no SKU)** — Currently, entries without a product code are shown in admin but never appear on any product page. When toggled active, they should stream to all products in the same general category (e.g., all "Pumps" or all "Boots").

### Changes

#### 1. Add `category` column to `celebrity_content` table
- New nullable `category` text column — allows assigning a general category (e.g., "Pumps", "Boots", "Sandals") to entries that have no specific SKU
- Admin UI will show a category dropdown for unmatched entries

#### 2. Deduplicate on import
- Change `upsertMany` in `useCelebrityContent.ts` from `.insert()` to `.upsert()` with `onConflict` on `celebrity_name, image_url`
- Add a unique constraint on `(celebrity_name, image_url)` via migration
- Add a "Remove Duplicates" button in the admin page that deletes duplicate rows keeping the newest one

#### 3. Add category assignment UI for unmatched entries
- In `CelebrityContentPage.tsx`, add a category dropdown (select) on each unmatched card — options derived from existing product categories in the database
- New mutation `updateCategory` in the hook to set the category on a celebrity_content row

#### 4. Update `CelebritySpotlight` to also show category-matched content
- Change `useCelebrityContentForProduct` to accept both `productCode` and `productCategory`
- Query: fetch active entries where `product_code = X` **OR** (`product_code IS NULL` AND `category` matches the product's category)
- Update `ProductPage.tsx` to pass the product's category to `CelebritySpotlight`

### Files to modify
- **Migration**: Add unique constraint on `(celebrity_name, image_url)`, add `category` column
- `src/hooks/useCelebrityContent.ts` — upsert logic, `updateCategory` mutation, updated product query accepting category
- `src/pages/CelebrityContentPage.tsx` — "Remove Duplicates" button, category dropdown on unmatched cards
- `src/components/product/CelebritySpotlight.tsx` — accept + pass category prop
- `src/pages/ProductPage.tsx` — pass product category to CelebritySpotlight

