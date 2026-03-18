
-- Create admin-only function to clear scan events
CREATE OR REPLACE FUNCTION public.clear_scan_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  DELETE FROM public.scan_events;
END;
$$;
