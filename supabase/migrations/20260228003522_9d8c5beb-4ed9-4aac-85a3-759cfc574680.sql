-- Backfill short_codes for all products that don't have one
-- Generate a random 6-char alphanumeric code for each
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill existing products
UPDATE public.products
SET short_code = generate_short_code()
WHERE short_code IS NULL;

-- Set a default so new inserts automatically get a short_code
ALTER TABLE public.products ALTER COLUMN short_code SET DEFAULT generate_short_code();