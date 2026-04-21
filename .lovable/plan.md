

## Plan: Diagnose Why the 3D Viewer Shoe Shrinks During Orbit

The "shoe shrinks while orbiting" symptom is almost certainly **not** a zoom/distance problem — it's a **camera target / model centering** problem. When the model's pivot is offset from world origin `[0,0,0]` (which `OrbitControls.target` is locked to), orbiting swings the model around an off-center pivot. From a fixed FOV camera, that swing reads as the shoe drifting closer/farther → **appears to shrink and grow**.

To confirm this (vs. a zoom bug, a GLB problem, or a load failure), we need to instrument the viewer and read the actual numbers.

### Diagnostic steps

**1. Add diagnostic logging to `src/components/product/ProductViewer3D.tsx`**

In the `Model` component, after computing the bounding box:
- Log `modelUrl`, raw `size`, raw `center`, computed `scale`, and the **post-recenter** bounding box center (should be ~`[0,0,0]`).
- Catch GLB load errors via a `useGLTF` error path and log them.

In the main component:
- Log when `modelReady` flips to true.
- Add a temporary on-screen debug overlay (top-left, `text-xs bg-black/60 text-white p-2`) showing: model URL (truncated), `modelReady`, and live camera distance from `[0,0,0]` (read from `OrbitControls` ref each frame via `useFrame`).

**2. Add a visible reference axis helper**

Drop `<axesHelper args={[1]} />` and `<gridHelper args={[4, 8]} />` into the scene (behind a `?debug=1` URL flag so it's not in production). If the shoe sits visibly off-center relative to the axes, that confirms the centering math is wrong for this specific GLB.

**3. Verify with the browser console + screenshot**

Once instrumented, you reload the product page and we read:
- Console output → confirms model loaded, shows actual size/center/scale numbers.
- Debug overlay → confirms whether camera distance is **actually changing** during orbit (zoom bug) or **staying constant** while the shoe still appears to shrink (centering bug — the real culprit).

### What we expect to find

Most likely outcome: camera distance stays at ~3.0 throughout orbit, **but** the recentered bounding-box center is not `[0,0,0]` (e.g. `[0.4, -0.2, 0.1]`). The Hoka GLB likely has a clean pivot; the Pantofola GLB does not. Fix will be to wrap the loaded scene in a `<group>` and offset the **inner** scene by `-center * scale` while keeping the outer group at origin — which is more robust than mutating `scene.position` directly (which can be overridden by animations or nested transforms inside the GLB).

### Files touched (diagnostic only — no behavior change yet)

- `src/components/product/ProductViewer3D.tsx` — add logging, error handler, debug overlay (gated on `?debug=1`), axes/grid helpers (gated).

### After diagnosis

Based on the console output + overlay readings you share back, I'll propose the **actual fix** in a follow-up plan — likely one of:
- (a) Group-wrap recentering for off-pivot GLBs (most likely).
- (b) Dynamically set `OrbitControls.target` to the model's true center instead of forcing `[0,0,0]`.
- (c) If the GLB itself is broken (e.g. enormous bounding box from a stray mesh), flag it for re-export.

