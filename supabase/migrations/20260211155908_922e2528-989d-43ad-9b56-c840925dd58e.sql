
-- Create storage bucket for cached look images
INSERT INTO storage.buckets (id, name, public) VALUES ('look-images', 'look-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read look images (they're public product content)
CREATE POLICY "Look images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'look-images');

-- Allow authenticated users to upload look images
CREATE POLICY "Authenticated users can upload look images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'look-images' AND auth.role() = 'authenticated');

-- Allow anon to upload look images (for scan page visitors)
CREATE POLICY "Anon can upload look images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'look-images' AND auth.role() = 'anon');

-- Allow updates (for overwriting cached images)
CREATE POLICY "Anyone can update look images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'look-images');
