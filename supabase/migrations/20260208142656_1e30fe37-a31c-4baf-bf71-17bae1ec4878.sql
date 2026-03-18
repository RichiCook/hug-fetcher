-- Add availability flag to products (defaults to true so existing products remain available)
ALTER TABLE public.products ADD COLUMN is_available boolean NOT NULL DEFAULT true;