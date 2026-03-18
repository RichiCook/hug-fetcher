-- Add collection column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS collection text;

-- Add collections array to activations table for collection-based targeting
ALTER TABLE public.activations ADD COLUMN IF NOT EXISTS collections text[] DEFAULT '{}'::text[];