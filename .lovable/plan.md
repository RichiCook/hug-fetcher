

## Plan: Make the 3D Shoe Look More Realistic

The current viewer uses 9 directional lights + a hemisphere light all at high intensity. This flattens materials, washes out shadows, and kills the PBR (physically-based) response that makes leather/rubber look real. Result: "plastic toy" look.

The fix is to replace the brute-force lighting rig with **image-based lighting (IBL)** — the industry-standard technique for realistic PBR rendering — plus proper tone mapping and color management.

### Changes — `src/components/product/ProductViewer3D.tsx`

**1. Replace the 9-light rig with an HDRI environment**

Use `<Environment>` from `@react-three/drei` with a studio preset. This provides 360° image-based lighting that gives materials real reflections, soft shadows, and natural highlights — exactly what makes product renders on sites like Hoka/Nike look photographic.

```tsx
import { Environment, ContactShadows } from '@react-three/drei';

<Environment preset="studio" background={false} />
```

Drei ships several presets: `studio`, `city`, `apartment`, `warehouse`, `sunset`, `dawn`, `lobby`. For product shots, **`studio`** is the right call — it mimics a softbox photography setup.

**2. Keep one subtle key light for definition**

Strip the 9 directional lights down to just:
- 1 ambient light at low intensity (`0.3`) for shadow fill.
- 1 directional light from above-front (`[2, 4, 3]`, intensity `0.8`) to add a defined highlight on top of the IBL.

**3. Add ground contact shadow**

Add `<ContactShadows>` beneath the model. This grounds the shoe visually instead of letting it float — a subtle but huge realism boost.

```tsx
<ContactShadows
  position={[0, -1, 0]}
  opacity={0.4}
  scale={5}
  blur={2.5}
  far={2}
/>
```

**4. Enable proper tone mapping & color space on the renderer**

Currently the canvas uses default linear output, which makes PBR materials look flat. Switch to ACES Filmic tone mapping + sRGB output:

```tsx
<Canvas
  gl={{
    antialias: true,
    alpha: false,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
    outputColorSpace: THREE.SRGBColorSpace,
  }}
  ...
>
```

**5. Keep the panorama logic intact**

If a `panoramaUrl` is provided, it still renders as the visible background sphere. The `<Environment>` preset only affects lighting/reflections, not the visible background (`background={false}`).

### Technical notes

- `@react-three/drei`'s `Environment` preset auto-loads HDRIs from a CDN — no extra assets needed.
- ACES Filmic is the same tone mapping used by Unreal Engine, Blender Cycles, and most modern 3D product viewers — it gives the "filmic" rolloff that prevents blown-out whites on leather/glossy surfaces.
- Net light count drops from 10 → 2 (+ IBL), which also slightly improves performance.

### Files touched

- `src/components/product/ProductViewer3D.tsx` — swap lighting rig, add `Environment` + `ContactShadows`, configure tone mapping.

### Result

Materials respond properly: leather shows soft sheen, rubber soles read matte, metal eyelets get real reflections. The shoe will look like a product render rather than a flat 3D model.

