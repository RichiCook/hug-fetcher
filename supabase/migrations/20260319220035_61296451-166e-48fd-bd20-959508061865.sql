
ALTER TABLE public.celebrity_content ADD CONSTRAINT celebrity_content_name_image_unique UNIQUE (celebrity_name, image_url);
