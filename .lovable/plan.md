

## Fix: Celebrity Content Images Not Loading

### Root Causes

1. **Truncated asset IDs** — Many image URLs imported from the Excel have `xxx` replacing part of the Contentful asset path (e.g., `.../4iloGhRVxxx/...`). These are invalid and will 404.
2. **Potential CORS/hotlink blocking** — Contentful CDN may reject requests from the app's origin, causing even valid URLs to fail silently.

### Plan

#### 1. Proxy celebrity images through the existing edge function
The project already has an `export-image-proxy` edge function. Route celebrity images through it to bypass CORS/hotlink issues.

- In `CelebritySpotlight.tsx`, build the image `src` as:
  ```
  ${SUPABASE_URL}/functions/v1/export-image-proxy?url=${encodeURIComponent(celeb.image_url)}
  ```
- Do the same in `CelebrityContentPage.tsx` for the admin preview thumbnails.

#### 2. Add fallback error handling on `<img>` tags
- Add an `onError` handler that hides the broken image or shows a placeholder, so broken URLs (the `xxx` ones) don't render as broken icons.

#### 3. Surface broken images in the admin panel
- In the Celebrity Content admin page, add a visual indicator (e.g., a warning badge or red border) when an image fails to load, so the user knows which entries have bad URLs and can fix or remove them.

### Files to modify
- `src/components/product/CelebritySpotlight.tsx` — proxy URLs + error fallback
- `src/pages/CelebrityContentPage.tsx` — proxy URLs + broken-image indicator

