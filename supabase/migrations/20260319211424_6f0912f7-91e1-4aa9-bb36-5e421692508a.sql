
CREATE TABLE public.celebrity_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_name text NOT NULL,
  image_url text NOT NULL,
  product_code text,
  shop_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.celebrity_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active celebrity content" ON public.celebrity_content FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert celebrity content" ON public.celebrity_content FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update celebrity content" ON public.celebrity_content FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete celebrity content" ON public.celebrity_content FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_celebrity_content_product_code ON public.celebrity_content(product_code);
