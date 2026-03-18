
-- 1. Create scan_events table
CREATE TABLE public.scan_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL,
  product_code text NOT NULL,
  target_product_code text,
  look_product_codes text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- 3. Anon INSERT (public shoppers, no auth)
CREATE POLICY "Anyone can insert scan events"
  ON public.scan_events FOR INSERT
  WITH CHECK (true);

-- 4. Admin SELECT only
CREATE POLICY "Admins can view scan events"
  ON public.scan_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Indexes for fast aggregation
CREATE INDEX idx_scan_events_product_type ON public.scan_events (product_code, event_type);
CREATE INDEX idx_scan_events_created ON public.scan_events (created_at);

-- 6. Create product_pair_scores table
CREATE TABLE public.product_pair_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code_a text NOT NULL,
  product_code_b text NOT NULL,
  score double precision NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  conversion_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pair_ordering CHECK (product_code_a < product_code_b),
  CONSTRAINT unique_pair UNIQUE (product_code_a, product_code_b)
);

-- 7. Enable RLS
ALTER TABLE public.product_pair_scores ENABLE ROW LEVEL SECURITY;

-- 8. Admin-only policies
CREATE POLICY "Admins can view pair scores"
  ON public.product_pair_scores FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pair scores"
  ON public.product_pair_scores FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pair scores"
  ON public.product_pair_scores FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pair scores"
  ON public.product_pair_scores FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Index for fast lookup
CREATE INDEX idx_pair_scores_a ON public.product_pair_scores (product_code_a);
CREATE INDEX idx_pair_scores_b ON public.product_pair_scores (product_code_b);

-- 10. Allow service role to read pair scores (for edge functions)
CREATE POLICY "Service role can read pair scores"
  ON public.product_pair_scores FOR SELECT
  USING (auth.role() = 'service_role');

-- 11. Allow service role full access to pair scores (for aggregation)
CREATE POLICY "Service role can manage pair scores"
  ON public.product_pair_scores FOR ALL
  USING (auth.role() = 'service_role');

-- 12. Service role can read scan events for aggregation
CREATE POLICY "Service role can read scan events"
  ON public.scan_events FOR SELECT
  USING (auth.role() = 'service_role');
