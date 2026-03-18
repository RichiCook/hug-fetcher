CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: auto_assign_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.email = 'riccardo.cook@customix.it' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    categories text[] DEFAULT '{}'::text[],
    price_min numeric,
    price_max numeric,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    CONSTRAINT activations_type_check CHECK ((type = ANY (ARRAY['text_image'::text, 'video'::text, 'banner'::text, 'custom_html'::text, 'lead_capture'::text])))
);


--
-- Name: api_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    api_key text,
    webhook_url text,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_integrations_type_check CHECK ((type = ANY (ARRAY['inbound'::text, 'outbound'::text])))
);


--
-- Name: api_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid,
    direction text NOT NULL,
    status text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_logs_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))),
    CONSTRAINT api_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'pending'::text])))
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activation_id uuid,
    product_id uuid,
    email text NOT NULL,
    name text,
    phone text,
    additional_data jsonb DEFAULT '{}'::jsonb,
    reward_type text DEFAULT 'code_screen'::text NOT NULL,
    reward_code text,
    reward_sent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: looks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.looks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    product_ids uuid[] NOT NULL,
    composition text NOT NULL,
    style text,
    color_palette text[],
    total_price text,
    ai_reasoning text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id text DEFAULT 'default'::text NOT NULL,
    brand_name text DEFAULT 'aitems'::text,
    logo_url text,
    favicon_url text,
    primary_color text DEFAULT '#000000'::text,
    secondary_color text DEFAULT '#f5f5f5'::text,
    accent_color text DEFAULT '#3b82f6'::text,
    custom_css text,
    updated_at timestamp with time zone DEFAULT now(),
    page_title text DEFAULT 'aitems'::text
);


--
-- Name: product_activations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_activations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    activation_id uuid NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    product_code text,
    price text,
    description text,
    composition text,
    care_instructions text,
    images jsonb DEFAULT '[]'::jsonb,
    wear_with jsonb DEFAULT '[]'::jsonb,
    you_may_also_like jsonb DEFAULT '[]'::jsonb,
    source_url text,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    short_code text,
    color text,
    ai_attributes jsonb DEFAULT '{}'::jsonb,
    generated_look jsonb
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activations activations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activations
    ADD CONSTRAINT activations_pkey PRIMARY KEY (id);


--
-- Name: api_integrations api_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_integrations
    ADD CONSTRAINT api_integrations_pkey PRIMARY KEY (id);


--
-- Name: api_logs api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: looks looks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.looks
    ADD CONSTRAINT looks_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: product_activations product_activations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_activations
    ADD CONSTRAINT product_activations_pkey PRIMARY KEY (id);


--
-- Name: product_activations product_activations_product_id_activation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_activations
    ADD CONSTRAINT product_activations_product_id_activation_id_key UNIQUE (product_id, activation_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_short_code_key UNIQUE (short_code);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_api_integrations_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_integrations_is_active ON public.api_integrations USING btree (is_active);


--
-- Name: idx_api_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_integrations_type ON public.api_integrations USING btree (type);


--
-- Name: idx_api_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_created_at ON public.api_logs USING btree (created_at DESC);


--
-- Name: idx_api_logs_integration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_integration_id ON public.api_logs USING btree (integration_id);


--
-- Name: idx_leads_activation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_activation_id ON public.leads USING btree (activation_id);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at DESC);


--
-- Name: idx_leads_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_product_id ON public.leads USING btree (product_id);


--
-- Name: idx_product_activations_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_activations_order ON public.product_activations USING btree (product_id, display_order);


--
-- Name: idx_products_short_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_short_code ON public.products USING btree (short_code);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: activations update_activations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_activations_updated_at BEFORE UPDATE ON public.activations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_integrations update_api_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_integrations_updated_at BEFORE UPDATE ON public.api_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: looks update_looks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_looks_updated_at BEFORE UPDATE ON public.looks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_logs api_logs_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.api_integrations(id) ON DELETE CASCADE;


--
-- Name: leads leads_activation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_activation_id_fkey FOREIGN KEY (activation_id) REFERENCES public.activations(id) ON DELETE SET NULL;


--
-- Name: leads leads_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: product_activations product_activations_activation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_activations
    ADD CONSTRAINT product_activations_activation_id_fkey FOREIGN KEY (activation_id) REFERENCES public.activations(id) ON DELETE CASCADE;


--
-- Name: product_activations product_activations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_activations
    ADD CONSTRAINT product_activations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: platform_settings Admins can insert platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert platform settings" ON public.platform_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: platform_settings Admins can update platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update platform settings" ON public.platform_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activations Anyone can delete activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete activations" ON public.activations FOR DELETE USING (true);


--
-- Name: api_integrations Anyone can delete api_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete api_integrations" ON public.api_integrations FOR DELETE USING (true);


--
-- Name: api_logs Anyone can delete api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete api_logs" ON public.api_logs FOR DELETE USING (true);


--
-- Name: leads Anyone can delete leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete leads" ON public.leads FOR DELETE USING (true);


--
-- Name: looks Anyone can delete looks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete looks" ON public.looks FOR DELETE USING (true);


--
-- Name: product_activations Anyone can delete product_activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete product_activations" ON public.product_activations FOR DELETE USING (true);


--
-- Name: products Anyone can delete products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete products" ON public.products FOR DELETE USING (true);


--
-- Name: activations Anyone can insert activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert activations" ON public.activations FOR INSERT WITH CHECK (true);


--
-- Name: api_integrations Anyone can insert api_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert api_integrations" ON public.api_integrations FOR INSERT WITH CHECK (true);


--
-- Name: api_logs Anyone can insert api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert api_logs" ON public.api_logs FOR INSERT WITH CHECK (true);


--
-- Name: leads Anyone can insert leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: looks Anyone can insert looks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert looks" ON public.looks FOR INSERT WITH CHECK (true);


--
-- Name: product_activations Anyone can insert product_activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert product_activations" ON public.product_activations FOR INSERT WITH CHECK (true);


--
-- Name: products Anyone can insert products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert products" ON public.products FOR INSERT WITH CHECK (true);


--
-- Name: activations Anyone can update activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update activations" ON public.activations FOR UPDATE USING (true);


--
-- Name: api_integrations Anyone can update api_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update api_integrations" ON public.api_integrations FOR UPDATE USING (true);


--
-- Name: leads Anyone can update leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update leads" ON public.leads FOR UPDATE USING (true);


--
-- Name: looks Anyone can update looks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update looks" ON public.looks FOR UPDATE USING (true);


--
-- Name: product_activations Anyone can update product_activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update product_activations" ON public.product_activations FOR UPDATE USING (true);


--
-- Name: products Anyone can update products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update products" ON public.products FOR UPDATE USING (true);


--
-- Name: activations Anyone can view activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view activations" ON public.activations FOR SELECT USING (true);


--
-- Name: api_integrations Anyone can view api_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view api_integrations" ON public.api_integrations FOR SELECT USING (true);


--
-- Name: api_logs Anyone can view api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view api_logs" ON public.api_logs FOR SELECT USING (true);


--
-- Name: leads Anyone can view leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view leads" ON public.leads FOR SELECT USING (true);


--
-- Name: looks Anyone can view looks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view looks" ON public.looks FOR SELECT USING (true);


--
-- Name: product_activations Anyone can view product_activations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product_activations" ON public.product_activations FOR SELECT USING (true);


--
-- Name: products Anyone can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);


--
-- Name: app_settings App settings are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "App settings are publicly readable" ON public.app_settings FOR SELECT USING (true);


--
-- Name: app_settings Authenticated users can insert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert settings" ON public.app_settings FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: app_settings Authenticated users can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update settings" ON public.app_settings FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: platform_settings Platform settings readable by all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform settings readable by all" ON public.platform_settings FOR SELECT USING (true);


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: activations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;

--
-- Name: api_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: api_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: looks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.looks ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: product_activations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_activations ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;