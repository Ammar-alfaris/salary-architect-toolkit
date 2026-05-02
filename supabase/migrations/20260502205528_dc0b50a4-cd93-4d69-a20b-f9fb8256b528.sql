
-- Platform role enum
CREATE TYPE public.platform_role AS ENUM ('super_admin','platform_admin','content_manager','support_manager','billing_manager','viewer');

-- platform_admins
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role platform_role NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_platform_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id=_uid AND status='active');
$$;

CREATE OR REPLACE FUNCTION public.has_platform_role(_uid uuid, _role platform_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id=_uid AND status='active' AND (role=_role OR role='super_admin'));
$$;

CREATE OR REPLACE FUNCTION public.get_platform_role(_uid uuid)
RETURNS platform_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT role FROM public.platform_admins WHERE user_id=_uid AND status='active' LIMIT 1;
$$;

-- platform_admins policies
CREATE POLICY "Self view platform admin" ON public.platform_admins FOR SELECT USING (auth.uid()=user_id OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Super admins manage platform admins" ON public.platform_admins FOR ALL USING (public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'super_admin'));

-- plans
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  annual_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  trial_days int NOT NULL DEFAULT 14,
  max_users int NOT NULL DEFAULT 5,
  max_employees int NOT NULL DEFAULT 50,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_recommended boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  cta_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view visible plans" ON public.plans FOR SELECT USING (is_visible=true OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Billing/super manage plans" ON public.plans FOR ALL USING (public.has_platform_role(auth.uid(),'billing_manager') OR public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'billing_manager') OR public.has_platform_role(auth.uid(),'super_admin'));

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'trial',
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  renewal_at timestamptz,
  amount numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  auto_renew boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own subscription" ON public.subscriptions FOR SELECT USING (public.is_org_member(auth.uid(),organization_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Billing/super manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_platform_role(auth.uid(),'billing_manager') OR public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'billing_manager') OR public.has_platform_role(auth.uid(),'super_admin'));

-- blog_categories
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Content/super manage categories" ON public.blog_categories FOR ALL USING (public.has_platform_role(auth.uid(),'content_manager') OR public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'content_manager') OR public.has_platform_role(auth.uid(),'super_admin'));

-- blog_posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id uuid,
  tags text[] NOT NULL DEFAULT '{}',
  seo_title text,
  seo_description text,
  canonical_url text,
  featured_image_url text,
  featured_image_alt text,
  status text NOT NULL DEFAULT 'draft',
  publish_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view published posts" ON public.blog_posts FOR SELECT USING (status='published' OR public.has_platform_role(auth.uid(),'content_manager') OR public.has_platform_role(auth.uid(),'super_admin'));
CREATE POLICY "Content/super manage posts" ON public.blog_posts FOR ALL USING (public.has_platform_role(auth.uid(),'content_manager') OR public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'content_manager') OR public.has_platform_role(auth.uid(),'super_admin'));

-- contact_messages
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  source_form text,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  assigned_to uuid,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public submit message" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Support/super view messages" ON public.contact_messages FOR SELECT USING (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin'));
CREATE POLICY "Support/super update messages" ON public.contact_messages FOR UPDATE USING (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin'));
CREATE POLICY "Super delete messages" ON public.contact_messages FOR DELETE USING (public.has_platform_role(auth.uid(),'super_admin'));

-- support_tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  subject text NOT NULL,
  description text,
  category text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support/super view tickets" ON public.support_tickets FOR SELECT USING (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin'));
CREATE POLICY "Support/super manage tickets" ON public.support_tickets FOR ALL USING (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin'));

-- ticket_messages
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'agent',
  sender_id uuid,
  sender_name text,
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support/super view ticket messages" ON public.ticket_messages FOR SELECT USING (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin'));
CREATE POLICY "Support/super manage ticket messages" ON public.ticket_messages FOR ALL USING (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'support_manager') OR public.has_platform_role(auth.uid(),'super_admin'));

-- announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  audience text NOT NULL DEFAULT 'all',
  target_org_ids uuid[] NOT NULL DEFAULT '{}',
  start_at timestamptz,
  end_at timestamptz,
  cta_label text,
  cta_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed view active announcements" ON public.announcements FOR SELECT USING (is_active=true OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Super manage announcements" ON public.announcements FOR ALL USING (public.has_platform_role(auth.uid(),'super_admin') OR public.has_platform_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'super_admin') OR public.has_platform_role(auth.uid(),'platform_admin'));

-- admin_settings (singleton)
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'Total Reward',
  admin_contact_email text,
  support_email text,
  default_sender_email text,
  default_trial_days int NOT NULL DEFAULT 14,
  default_plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  blog_permalink_pattern text NOT NULL DEFAULT '/blog/:slug',
  maintenance_mode boolean NOT NULL DEFAULT false,
  contact_form_routing text,
  timezone text NOT NULL DEFAULT 'UTC',
  default_locale text NOT NULL DEFAULT 'en',
  default_currency text NOT NULL DEFAULT 'USD',
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  security jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins view settings" ON public.admin_settings FOR SELECT USING (public.is_platform_admin(auth.uid()));
CREATE POLICY "Super manage settings" ON public.admin_settings FOR ALL USING (public.has_platform_role(auth.uid(),'super_admin')) WITH CHECK (public.has_platform_role(auth.uid(),'super_admin'));

-- Seed singleton row
INSERT INTO public.admin_settings (platform_name) VALUES ('Total Reward');

-- Seed default plans
INSERT INTO public.plans (name, slug, description, monthly_price, annual_price, currency, trial_days, max_users, max_employees, features, is_recommended, sort_order) VALUES
  ('Starter','starter','For small teams getting started',49,490,'USD',14,3,25,'{"salary_structures":true,"merit":false,"bonus":false,"allowances":true,"reports":true}'::jsonb,false,1),
  ('Professional','professional','Full Total Rewards toolkit',149,1490,'USD',14,10,200,'{"salary_structures":true,"merit":true,"bonus":true,"allowances":true,"reports":true,"matrix":true}'::jsonb,true,2),
  ('Enterprise','enterprise','Unlimited scale & support',499,4990,'USD',30,100,5000,'{"salary_structures":true,"merit":true,"bonus":true,"allowances":true,"reports":true,"matrix":true,"api":true,"priority_support":true,"multi_admin":true}'::jsonb,false,3);

-- updated_at trigger fn (reusable)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_subs_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_posts_touch BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tickets_touch BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
