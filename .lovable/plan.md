

## Plan: 3D Product Viewer with 360° Background

### Summary
Add a 3D product viewer feature with two parts: (1) a backend settings section where admins upload `.glb`/`.gltf` models and 360° panoramic images per product, and (2) a viewer on the product landing page that renders the model inside a spherical panoramic environment using Three.js.

---

### 1. Install Dependencies
- `three@>=0.133`
- `@react-three/fiber@^8.18`
- `@react-three/drei@^9.122.0`

### 2. Database Migration
Add two nullable columns to the `products` table:
- `model_3d_url` (text) — URL of uploaded .glb/.gltf file
- `panorama_url` (text) — URL of uploaded 360° image

### 3. Storage Bucket
Create a `product-3d-assets` storage bucket for .glb, .gltf, .jpg, .png uploads. Public read access, authenticated write.

### 4. Backend — Product Edit Page Upload UI
In `ProductEditPage.tsx`, add a new "3D Viewer" section with:
- Drag-and-drop upload for 3D model file (.glb/.gltf), with progress indicator
- Drag-and-drop upload for 360° panoramic image (.jpg/.png), with progress indicator
- Preview thumbnails / file names once uploaded
- Remove buttons to clear uploads
- Saves URLs to `model_3d_url` and `panorama_url` columns on the product

### 5. Frontend — 3D Viewer Component
Create `src/components/product/ProductViewer3D.tsx`:
- Full-width container with 3:4 aspect ratio (mobile-first)
- `<Canvas>` from @react-three/fiber
- Load .glb model via `useGLTF`, center at origin, auto-scale to fit
- Render 360° image on inside of a large sphere (`BackSide` material)
- `<OrbitControls>` for drag/swipe rotation, pinch-to-zoom on mobile
- Auto-rotate model when idle (stop on interaction, resume after 3s)
- `<Suspense>` with a loading spinner fallback
- Floating controls overlay (glassmorphism): reset view, toggle auto-rotate, fullscreen
- Dark-themed container background

### 6. Integration on Product Page
In `ProductPage.tsx`:
- If `product.model_3d_url` exists, render `<ProductViewer3D>` above or replacing the image carousel
- If no 3D model, show the existing image carousel (no change)
- Pass `model_3d_url` and `panorama_url` as props

### 7. Update Product Type
Add `model_3d_url` and `panorama_url` to the `Product` interface in `useProducts.ts` and include them in the select query.

---

### Technical Details

```text
Product Page Layout (when 3D model exists):
┌─────────────────────────┐
│   3D Viewer (3:4)       │  ← Canvas with model + 360° bg
│   [🔄] [📐] [⛶]        │  ← floating controls
├─────────────────────────┤
│   Product Info           │
│   Repair button          │
│   CTA                    │
└─────────────────────────┘
```

- The 360° image is mapped to a sphere of radius 500 with `THREE.BackSide`
- The model is auto-scaled: compute bounding box, normalize to fit within ~2 units
- OrbitControls: `enableDamping`, `dampingFactor: 0.05`, `enablePan: false`, `minDistance: 1`, `maxDistance: 10`
- Auto-rotate via `autoRotate` prop on OrbitControls, toggled by user and idle timer

### Files to Create/Edit
- **Create**: `src/components/product/ProductViewer3D.tsx`
- **Edit**: `src/pages/ProductEditPage.tsx` (add upload section)
- **Edit**: `src/pages/ProductPage.tsx` (conditionally render viewer)
- **Edit**: `src/hooks/useProducts.ts` (add new fields to interface + query)
- **Migration**: Add `model_3d_url` and `panorama_url` columns + storage bucket

