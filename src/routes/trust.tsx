import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Database, Mail, UserCheck, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title: "Trust & Security — Total Reward" },
      {
        name: "description",
        content:
          "How Total Reward protects your compensation data: access controls, data handling, subprocessors, retention, and how to contact us about security and privacy.",
      },
      { property: "og:title", content: "Trust & Security — Total Reward" },
      {
        property: "og:description",
        content:
          "Security, privacy, and data-handling practices for the Total Reward platform.",
      },
    ],
  }),
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="not-prose rounded-2xl border border-border bg-card p-6 md:p-8 mb-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
        {children}
      </div>
    </section>
  );
}

function TrustPage() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";
  return (
    <LegalLayout
      eyebrow={isAr ? "مركز الثقة" : "Trust Center"}
      title={isAr ? "الأمان والخصوصية في Total Reward" : "Security & privacy at Total Reward"}
      lastUpdated={isAr ? "20 يونيو 2026" : "20 June 2026"}
    >
      <p className="lead">
        {isAr
          ? "تتولى فرقنا في Total Reward صيانة هذه الصفحة للإجابة عن الأسئلة الشائعة حول الأمان والخصوصية في منصة إدارة التعويضات. تصف الممارسات المطبّقة حالياً، وهي محتوى معلوماتي قابل للتحديث — وليس شهادة اعتماد مستقلة أو تدقيق."
          : "This page is maintained by the Total Reward team to answer common security and privacy questions about our compensation platform. It describes practices we have in place today and is intended as editable, informational content — not an independent certification or audit."}
      </p>

      <div className="not-prose mt-8">
        <Section icon={UserCheck} title={isAr ? "الوصول والمصادقة" : "Access & authentication"}>
          {isAr ? (
            <>
              <p>تستخدم الحسابات تسجيل الدخول بالبريد وكلمة المرور وتسجيل الدخول عبر Google. ينتمي كل مستخدم إلى مؤسسة واحدة أو أكثر، ويتحكم نظام الأدوار (مدير، مشرف، محلل، عارض) في ما يمكنه رؤيته وتعديله داخل مؤسسته.</p>
              <p>تُعزل بيانات كل مؤسسة على مستوى قاعدة البيانات عبر سياسات أمن الصف (RLS)، بحيث لا يستطيع أعضاء مؤسسة قراءة أو تعديل سجلات مؤسسة أخرى.</p>
            </>
          ) : (
            <>
              <p>Accounts use email + password sign-in and Google sign-in. Each user belongs to one or more organizations, and role-based access (admin, manager, analyst, viewer) controls what they can see and do inside their organization.</p>
              <p>Data is isolated per organization at the database level using row-level security policies, so members of one organization cannot read or modify another organization&rsquo;s records.</p>
            </>
          )}
        </Section>

        <Section icon={Shield} title={isAr ? "المنصة والاستضافة" : "Platform & hosting"}>
          {isAr ? (
            <>
              <p>تعمل Total Reward على Lovable Cloud وبنية تحتية سحابية مُدارة وموثوقة. تُقدَّم جميع الاتصالات عبر HTTPS، وتُشفَّر البيانات أثناء النقل باستخدام TLS القياسي.</p>
              <p>تعمل خوادم التطبيق كعُمّال عديمي الحالة — وتُخزَّن البيانات الحساسة في طبقة قاعدة البيانات والتخزين المُدارة، وليس على خوادم فردية.</p>
            </>
          ) : (
            <>
              <p>Total Reward is built on Lovable Cloud and runs on managed, reputable cloud infrastructure. Connections to the application are served over HTTPS, and data in transit is encrypted using standard TLS.</p>
              <p>Application servers run as stateless workers — sensitive state lives in the managed database and storage layer, not on individual server instances.</p>
            </>
          )}
        </Section>

        <Section icon={Database} title={isAr ? "البيانات التي نجمعها واستخدامها" : "Data we collect & how it's used"}>
          {isAr ? (
            <>
              <p>نعالج المعلومات التي ترفعها أو تدخلها مؤسستك — الموظفين، الرواتب، البدلات، الهياكل، دورات المكافآت والاستحقاق، وبيانات التعويضات المشابهة — حصراً لتقديم الخدمة لمؤسستك. لا نبيع البيانات الشخصية.</p>
              <p>تُجمَع بيانات الحساب (الاسم، البريد، المؤسسة، الدور، سجلات تدقيق الإجراءات) لتشغيل الخدمة وتأمينها.</p>
            </>
          ) : (
            <>
              <p>We process the information your organization uploads or enters — employees, salaries, allowances, structures, bonus and merit cycles, and similar compensation data — strictly to provide the service to your organization. We do not sell personal data.</p>
              <p>Account-level data (name, email, organization, role, audit logs of actions you take) is collected to operate and secure the service.</p>
            </>
          )}
        </Section>

        <Section icon={Lock} title={isAr ? "المعالجون الفرعيون والتكاملات" : "Subprocessors & integrations"}>
          {isAr ? (
            <>
              <p>نعتمد على مجموعة محدودة من المزوّدين لتشغيل الخدمة:</p>
              <ul className="list-disc ms-5 space-y-1">
                <li>Lovable Cloud — استضافة التطبيق، قاعدة البيانات، المصادقة، التخزين.</li>
                <li>Paylink — معالجة مدفوعات الاشتراك (فقط عند الاشتراك).</li>
                <li>مزوّد البريد التشغيلي — لإرسال الرسائل النظامية (المصادقة، الدعوات، الإشعارات).</li>
              </ul>
              <p>يتلقى كل مزوّد فقط البيانات اللازمة لأداء وظيفته المحددة.</p>
            </>
          ) : (
            <>
              <p>We rely on a small set of providers to operate the service:</p>
              <ul className="list-disc ms-5 space-y-1">
                <li>Lovable Cloud — application hosting, database, authentication, storage.</li>
                <li>Paylink — payment processing for subscriptions (only when you subscribe).</li>
                <li>Transactional email provider — for system emails (auth, invitations, notifications).</li>
              </ul>
              <p>Each provider only receives the data it needs to perform its specific function.</p>
            </>
          )}
        </Section>

        <Section icon={FileText} title={isAr ? "الاحتفاظ والحذف" : "Retention & deletion"}>
          {isAr ? (
            <p>تُحفظ بيانات العميل ما دام حساب المؤسسة نشطاً. يمكن للمشرفين حذف السجلات التي يملكونها من داخل التطبيق. لطلب حذف مؤسسة أو حساب كامل، يُرجى التواصل معنا عبر العنوان أدناه.</p>
          ) : (
            <p>Customer data is retained while your organization&rsquo;s account is active. Admins can delete records they own from inside the application. To request deletion of an entire organization or account, contact us using the address below.</p>
          )}
        </Section>

        <Section icon={Mail} title={isAr ? "التواصل والإبلاغ عن مشكلة أمنية" : "Contact & reporting a security issue"}>
          {isAr ? (
            <p>
              إذا كنت تعتقد أنك اكتشفت ثغرة أمنية، أو لديك استفسار يخص الخصوصية، يُرجى التواصل عبر{" "}
              <Link to="/contact" className="text-primary hover:underline">صفحة التواصل</Link>. نُقدّر الإفصاح المسؤول وسنرد بأسرع وقت ممكن.
            </p>
          ) : (
            <p>
              If you believe you have found a security vulnerability, or have a privacy question, please reach out through our{" "}
              <Link to="/contact" className="text-primary hover:underline">contact page</Link>. We appreciate responsible disclosure and will respond as quickly as we can.
            </p>
          )}
        </Section>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        {isAr
          ? "تصف هذه الصفحة الممارسات المطبّقة حالياً وقد يتم تحديثها مع تطوّر المنتج. لا تُشكّل اتفاقية قانونية ولا ضماناً لأي شهادة أو نتيجة امتثال محددة."
          : "This page describes practices currently in place and may be updated as the product evolves. It does not constitute a legal agreement or a guarantee of any specific certification or compliance outcome."}
      </p>
    </LegalLayout>
  );
}
