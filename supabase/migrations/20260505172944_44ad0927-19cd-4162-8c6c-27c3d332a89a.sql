
-- 1. Email templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'system',
  subject_ar text NOT NULL DEFAULT '',
  subject_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super manage email templates" ON public.email_templates
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'::platform_role))
  WITH CHECK (has_platform_role(auth.uid(), 'super_admin'::platform_role));
CREATE POLICY "Platform admins view email templates" ON public.email_templates
  FOR SELECT USING (is_platform_admin(auth.uid()));
CREATE TRIGGER trg_email_templates_touch BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Email campaigns
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text,
  subject_ar text NOT NULL DEFAULT '',
  subject_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  audience_type text NOT NULL DEFAULT 'all',
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super manage campaigns" ON public.email_campaigns
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'::platform_role))
  WITH CHECK (has_platform_role(auth.uid(), 'super_admin'::platform_role));
CREATE POLICY "Platform admins view campaigns" ON public.email_campaigns
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  status text NOT NULL DEFAULT 'queued',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super manage campaign recipients" ON public.email_campaign_recipients
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'::platform_role))
  WITH CHECK (has_platform_role(auth.uid(), 'super_admin'::platform_role));

-- 3. Extend support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Ticket number generator: TKT-YYYY-NNNNN
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  next_n int;
BEGIN
  IF NEW.ticket_number IS NULL THEN
    SELECT COALESCE(MAX((regexp_replace(ticket_number, '^TKT-\d{4}-', ''))::int), 0) + 1
      INTO next_n
      FROM public.support_tickets
      WHERE ticket_number LIKE 'TKT-' || yr || '-%';
    NEW.ticket_number := 'TKT-' || yr || '-' || lpad(next_n::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_ticket_number BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

-- End-user RLS for tickets
CREATE POLICY "Users insert own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid()
      OR lower(requester_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );
CREATE POLICY "Users view own tickets" ON public.support_tickets
  FOR SELECT USING (
    created_by = auth.uid()
    OR lower(requester_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- End-user RLS for ticket messages
CREATE POLICY "Users view own ticket messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND (t.created_by = auth.uid()
          OR lower(t.requester_email) = lower(coalesce((auth.jwt() ->> 'email'), '')))
    )
  );
CREATE POLICY "Users reply to own tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    sender_type = 'user' AND
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND (t.created_by = auth.uid()
          OR lower(t.requester_email) = lower(coalesce((auth.jwt() ->> 'email'), '')))
    )
  );

-- 4. Seed system templates (Arabic + English)
INSERT INTO public.email_templates (key, display_name, description, category, subject_ar, subject_en, body_ar, body_en, variables, is_system) VALUES
('auth_signup', 'Signup confirmation', 'Sent when a new user signs up — contains the verification link.', 'auth',
  'تأكيد إنشاء الحساب — Total Reward', 'Confirm your Total Reward account',
  '<p>مرحباً {{userName}}،</p><p>شكراً لتسجيلك في Total Reward. الرجاء تأكيد بريدك الإلكتروني بالضغط على الزر التالي:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">تأكيد البريد الإلكتروني</a></p><p>إذا لم تطلب هذا الحساب يمكنك تجاهل هذه الرسالة.</p>',
  '<p>Hi {{userName}},</p><p>Thanks for signing up to Total Reward. Please confirm your email address:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Confirm email</a></p><p>If you did not request this account, you can ignore this message.</p>',
  '["userName","userEmail","verifyUrl","appName"]'::jsonb, true),
('auth_recovery', 'Password reset', 'Sent when a user requests a password reset.', 'auth',
  'إعادة تعيين كلمة المرور', 'Reset your password',
  '<p>مرحباً {{userName}}،</p><p>اضغط على الزر أدناه لإعادة تعيين كلمة المرور:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">إعادة تعيين كلمة المرور</a></p><p>إذا لم تطلب هذا، تجاهل الرسالة.</p>',
  '<p>Hi {{userName}},</p><p>Click below to reset your password:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Reset password</a></p><p>If you did not request this, ignore this email.</p>',
  '["userName","userEmail","verifyUrl"]'::jsonb, true),
('auth_magic_link', 'Magic link sign-in', 'Sent when a user requests a magic link.', 'auth',
  'رابط الدخول إلى Total Reward', 'Your Total Reward sign-in link',
  '<p>اضغط الزر للدخول إلى حسابك:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">دخول</a></p>',
  '<p>Click the button to sign in:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Sign in</a></p>',
  '["userName","verifyUrl"]'::jsonb, true),
('auth_email_change', 'Email change confirmation', 'Sent to confirm an email address change.', 'auth',
  'تأكيد تغيير البريد الإلكتروني', 'Confirm your new email address',
  '<p>اضغط لتأكيد بريدك الجديد:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">تأكيد البريد الجديد</a></p>',
  '<p>Click to confirm your new email:</p><p style="text-align:center"><a href="{{verifyUrl}}" style="background:#0ea5a4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Confirm new email</a></p>',
  '["verifyUrl"]'::jsonb, true),
('ticket_received', 'Ticket received (user)', 'Sent to the user when their support ticket is opened.', 'tickets',
  'تم استلام تذكرتك {{ticketNumber}}', 'We received your ticket {{ticketNumber}}',
  '<p>مرحباً {{userName}}،</p><p>تم فتح تذكرة دعم برقم <strong>{{ticketNumber}}</strong> بعنوان: <em>{{subject}}</em>.</p><p>سنقوم بالرد عليك في أقرب وقت ممكن.</p>',
  '<p>Hi {{userName}},</p><p>Your support ticket <strong>{{ticketNumber}}</strong> — <em>{{subject}}</em> — has been received.</p><p>Our team will get back to you shortly.</p>',
  '["userName","ticketNumber","subject","status"]'::jsonb, true),
('ticket_admin_alert', 'Ticket alert (admin)', 'Sent to the configured notification email when a new ticket is opened.', 'tickets',
  'تذكرة دعم جديدة {{ticketNumber}}', 'New support ticket {{ticketNumber}}',
  '<p>تم فتح تذكرة جديدة:</p><p><strong>{{ticketNumber}}</strong> — {{subject}}</p><p>من: {{userName}} ({{userEmail}})</p><p>الأولوية: {{priority}}</p>',
  '<p>A new support ticket was opened:</p><p><strong>{{ticketNumber}}</strong> — {{subject}}</p><p>From: {{userName}} ({{userEmail}})</p><p>Priority: {{priority}}</p>',
  '["ticketNumber","subject","userName","userEmail","priority","category"]'::jsonb, true),
('ticket_reply', 'Ticket reply (user)', 'Sent to the user when support replies to their ticket.', 'tickets',
  'رد جديد على تذكرتك {{ticketNumber}}', 'New reply on your ticket {{ticketNumber}}',
  '<p>مرحباً {{userName}}،</p><p>تم الرد على تذكرتك <strong>{{ticketNumber}}</strong>.</p><blockquote>{{message}}</blockquote>',
  '<p>Hi {{userName}},</p><p>Your ticket <strong>{{ticketNumber}}</strong> has a new reply.</p><blockquote>{{message}}</blockquote>',
  '["userName","ticketNumber","subject","message"]'::jsonb, true),
('ticket_status_in_progress', 'Ticket in progress', 'Sent when a ticket moves to in-progress.', 'tickets',
  'تذكرتك {{ticketNumber}} قيد المعالجة', 'Your ticket {{ticketNumber}} is in progress',
  '<p>تذكرتك <strong>{{ticketNumber}}</strong> أصبحت قيد المعالجة.</p>',
  '<p>Your ticket <strong>{{ticketNumber}}</strong> is now being worked on.</p>',
  '["userName","ticketNumber"]'::jsonb, true),
('ticket_status_resolved', 'Ticket resolved', 'Sent when a ticket is marked resolved.', 'tickets',
  'تم حل تذكرتك {{ticketNumber}}', 'Your ticket {{ticketNumber}} has been resolved',
  '<p>تم حل تذكرتك <strong>{{ticketNumber}}</strong>. يرجى إعلامنا إذا احتجت لمزيد من المساعدة.</p>',
  '<p>Your ticket <strong>{{ticketNumber}}</strong> has been resolved. Let us know if you need anything else.</p>',
  '["userName","ticketNumber"]'::jsonb, true),
('ticket_status_closed', 'Ticket closed', 'Sent when a ticket is closed.', 'tickets',
  'تم إغلاق تذكرتك {{ticketNumber}}', 'Your ticket {{ticketNumber}} was closed',
  '<p>تم إغلاق تذكرتك <strong>{{ticketNumber}}</strong>.</p>',
  '<p>Your ticket <strong>{{ticketNumber}}</strong> has been closed.</p>',
  '["userName","ticketNumber"]'::jsonb, true),
('renewal_reminder', 'Renewal reminder', 'Reminds users their subscription is renewing.', 'lifecycle',
  'تذكير بتجديد اشتراكك', 'Your subscription renews soon',
  '<p>مرحباً {{userName}}،</p><p>اشتراكك في باقة <strong>{{planName}}</strong> سيتم تجديده بتاريخ {{endDate}}.</p>',
  '<p>Hi {{userName}},</p><p>Your <strong>{{planName}}</strong> subscription renews on {{endDate}}.</p>',
  '["userName","planName","endDate","amount","currency"]'::jsonb, true),
('cancellation_notice', 'Cancellation notice', 'Confirms a subscription cancellation.', 'lifecycle',
  'تأكيد إلغاء الاشتراك', 'Subscription cancellation confirmed',
  '<p>مرحباً {{userName}}،</p><p>تم إلغاء اشتراكك في باقة {{planName}}.</p>',
  '<p>Hi {{userName}},</p><p>Your {{planName}} subscription has been cancelled.</p>',
  '["userName","planName","endDate"]'::jsonb, true),
('custom_message', 'Custom message', 'Free-form message sent from the messaging center.', 'broadcast',
  '', '', '', '',
  '["userName","userEmail"]'::jsonb, true);
