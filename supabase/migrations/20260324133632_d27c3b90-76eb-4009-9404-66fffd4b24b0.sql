
-- Create repair_requests table
CREATE TABLE public.repair_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  user_email text,
  user_name text,
  damage_type text NOT NULL,
  photos text[] DEFAULT '{}',
  country text,
  city text,
  warranty_status text DEFAULT 'unknown',
  estimated_cost_min numeric,
  estimated_cost_max numeric,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public-facing form)
CREATE POLICY "Anyone can insert repair requests" ON public.repair_requests
  FOR INSERT TO public WITH CHECK (true);

-- Anyone can view their own (by email match or public for now)
CREATE POLICY "Anyone can view repair requests" ON public.repair_requests
  FOR SELECT TO public USING (true);

-- Admins can update
CREATE POLICY "Admins can update repair requests" ON public.repair_requests
  FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete repair requests" ON public.repair_requests
  FOR DELETE TO public USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for repair photos
INSERT INTO storage.buckets (id, name, public) VALUES ('repair-photos', 'repair-photos', true);

-- Allow anyone to upload repair photos
CREATE POLICY "Anyone can upload repair photos" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'repair-photos');

-- Allow anyone to view repair photos
CREATE POLICY "Anyone can view repair photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'repair-photos');
