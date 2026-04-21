

## Plan: Match Hoka's 3D Viewer UI & Logic

Update the current 3D viewer to mirror the Hoka demo's behavior: white background, side-camera angle, and a fallback hero image displayed until the 3D model is fully loaded.

### Differences vs. current implementation

| Aspect | Current | Hoka (target) |
|---|---|---|
| Background | Black (`bg-black`) | White (`bg-white`) with explicit `gl.setClearColor('#ffffff')` |
| Loader | Spinner overlay (`Loader` component) | Product hero image as fallback (no spinner) |
| Camera position | `[0, 0, 4]` (front view) | `[-4, 0.5, 0]` (side angle, slightly elevated) |
| Model load tracking | None | `onLoaded` callback flips `modelReady` state to hide fallback |
| Suspense wrapper | Wraps `<Canvas>` | Removed — fallback image handles loading state |

### Changes

**File: `src/components/product/ProductViewer3D.tsx`**
1. Add `fallbackImageUrl?: string` to `ProductViewer3DProps`.
2. Add `modelReady` state + `onLoaded` callback on `Model` that sets it to true once the GLB scene has been measured/positioned.
3. Render the fallback `<img>` in an absolute overlay (z-20) while `!modelReady`, using `object-contain` on white background.
4. Switch container from `bg-black` to `bg-white`.
5. Remove the `<Suspense fallback={<Loader />}>` wrapper and the `Loader` component (the fallback image replaces it).
6. Update camera position to `[-4, 0.5, 0]` for the side-angle initial view.
7. Add `onCreated={({ gl }) => gl.setClearColor('#ffffff', 1)}` to `<Canvas>`.
8. Keep all existing logic untouched: error boundary, panorama spheres (jpg/png/exr), lighting setup, scroll-through edge overlays, idle auto-rotate, OrbitControls config.

**File: `src/pages/ProductPage.tsx`**
1. Pass `fallbackImageUrl` to `<ProductViewer3D>` — use the product's main image (via existing `getMainProductImage` / first gallery image, whichever is already available near the viewer render site around line 468).

### Result
- White studio-style 3D viewer instead of black.
- Users see the product's flat-lay photo immediately, which seamlessly swaps to the interactive 3D model once it loads — no spinner flash.
- Initial camera framing matches Hoka's side profile angle.
- All other behavior (auto-rotate, panorama, scroll-through edges, no UI controls) preserved.

