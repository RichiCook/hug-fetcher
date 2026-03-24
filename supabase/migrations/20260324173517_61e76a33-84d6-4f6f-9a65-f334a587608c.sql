
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model_3d_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS panorama_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-3d-assets', 'product-3d-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read 3d assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-3d-assets');

CREATE POLICY "Authenticated users can upload 3d assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-3d-assets');

CREATE POLICY "Authenticated users can delete 3d assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-3d-assets');
