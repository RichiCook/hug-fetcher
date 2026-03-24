

## Plan: Swap the Whitelist — Apply to Collections, Revert Categories

### What happened
The 41-model whitelist (Blade, Superblade, Nexus, etc.) was applied to **categories** (`useProductCategories.ts`), but the user says categories were already fine. The whitelist should have been applied to **collections** (`useProductCollections.ts`) instead.

### Changes

**1. Revert `src/hooks/useProductCategories.ts`**
- Remove the `ALLOWED_CATEGORIES` array and `ALLOWED_SET`
- Go back to querying the `category` column from `products`
- Split category strings by ` > ` segments and count each unique category
- This restores the original behavior that was working correctly

**2. Update `src/hooks/useProductCollections.ts`**
- Add the 41-name whitelist (`ALLOWED_COLLECTIONS`)
- Instead of reading the `collection` field, fetch `name` from products
- Use word-boundary regex matching against product names to find which of the 41 model names appear
- Only return collections that have matching products

**3. Update `src/components/activations/GroupedCategoryPicker.tsx`**
- Revert the group names back to generic/original groupings (or remove the shoe-specific groupings since categories are no longer the whitelist)
- The groups should reflect the actual category data from the DB, not the 41 model names

**4. Update `src/components/activations/CollectionPicker.tsx`** (if needed)
- No structural changes needed — it already renders whatever `useProductCollections` returns

### Technical detail
- The `CATEGORY_GROUPS` in `GroupedCategoryPicker.tsx` (Blade Family, Core Lines, etc.) will be removed since those groups were based on the 41 model names which now belong to collections, not categories
- The GroupedCategoryPicker will fall back to showing all categories ungrouped, or we can create groups based on the actual category hierarchy (e.g., "Shoes > Pumps" → group "Shoes")

