import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/dpa")({
  component: DPAPage,
  head: () => ({
    meta: [
      { title: "Data Processing Agreement (DPA) — Total Reward" },
      { name: "description", content: "Total Reward's Data Processing Agreement: roles, sub-processors, data location, security measures, and customer rights under PDPL and GDPR." },
      { property: "og:title", content: "Data Processing Agreement — Total Reward" },
      { property: "og:description", content: "How Total Reward processes customer personal data on behalf of HR teams under PDPL and GDPR." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://totalreward.app/dpa" }],
  }),
});

function DPAPage() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";
  return (
    <LegalLayout
      eyebrow={t("legal")}
      title={isAr ? "اتفاقية معالجة البيانات (DPA)" : "Data Processing Agreement (DPA)"}
      lastUpdated={isAr ? "23 يونيو 2026" : "23 June 2026"}
    >
      {isAr ? <ContentAr /> : <ContentEn />}
    </LegalLayout>
  );
}

function ContentEn() {
  return (
    <>
      <p>This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the agreement between Total Reward (the &ldquo;Processor&rdquo;) and the customer organization (the &ldquo;Controller&rdquo;) using the Total Reward platform. It governs the processing of personal data carried out by Total Reward on behalf of the Controller and is designed to comply with the Saudi Personal Data Protection Law (PDPL) and the EU General Data Protection Regulation (GDPR), as applicable.</p>

      <h2>1. Roles of the parties</h2>
      <p>The Controller determines the purposes and means of processing employee and HR personal data uploaded to the platform. Total Reward acts as a Processor and processes personal data only on documented instructions from the Controller, except where required by applicable law.</p>

      <h2>2. Subject matter and duration</h2>
      <p>Subject matter: provision of the Total Reward compensation management service. Duration: for the term of the subscription plus any retention periods set out in Section 8.</p>

      <h2>3. Nature and purpose of processing</h2>
      <p>Storing, displaying, computing, exporting, and otherwise processing compensation, role, and identity data necessary to deliver the Service: salary structures, allowances, merit cycles, bonuses, equity, analytics, approvals, audit, billing, and customer support.</p>

      <h2>4. Categories of data subjects and personal data</h2>
      <ul>
        <li><strong>Data subjects</strong>: Controller's employees, contractors, candidates, and authorized users of the Service.</li>
        <li><strong>Personal data</strong>: identification (name, employee ID, work email), employment data (job title, grade, department, manager), compensation data (base pay, allowances, bonus, equity, currency), authentication metadata, audit logs.</li>
        <li><strong>Special categories</strong>: not requested by Total Reward. Customers must not upload health, religious, biometric, or other special-category data.</li>
      </ul>

      <h2>5. Sub-processors</h2>
      <p>The Controller authorizes Total Reward to engage the following sub-processors, each bound by data-protection obligations no less protective than this DPA:</p>
      <ul>
        <li><strong>Supabase (hosting, database, authentication, storage)</strong> — region selected by Total Reward (EU/AWS).</li>
        <li><strong>Cloudflare (CDN, edge runtime, DDoS protection)</strong> — global edge with EU-region routing where possible.</li>
        <li><strong>Mailgun (transactional email delivery)</strong> — for receipts, password resets, and lifecycle notices.</li>
        <li><strong>Paylink (payment processing — Saudi Arabia)</strong> — limited to billing data required for subscription payments. PAN data is tokenized; Total Reward never stores raw card numbers.</li>
        <li><strong>Google / OpenAI model providers (via Lovable AI Gateway)</strong> — only when the Controller invokes AI features; data sent on a per-request basis and not used to train models.</li>
      </ul>
      <p>Total Reward will provide at least 30 days' prior notice via email to admin users before adding or replacing a sub-processor that handles personal data. The Controller may object on reasonable grounds and terminate the affected service.</p>

      <h2>6. Data location and international transfers</h2>
      <p>Primary storage is in the EU region (Frankfurt). Disaster-recovery backups remain within the EU. Where transfers outside the EU/KSA occur (e.g., AI inference, email delivery), Total Reward relies on Standard Contractual Clauses or equivalent safeguards.</p>

      <h2>7. Security measures</h2>
      <ul>
        <li>TLS 1.2+ for all data in transit; AES-256 for data at rest.</li>
        <li>Row-Level Security (RLS) isolates each organization's data at the database layer.</li>
        <li>Role-based access control with least-privilege defaults; production access restricted to authorized engineers and audit-logged.</li>
        <li>Authentication: bcrypt-hashed passwords, leaked-password check (HIBP), optional MFA, JWT session tokens with rotation.</li>
        <li>Daily encrypted backups; quarterly restore testing.</li>
        <li>Security scanning of code and dependencies on every release.</li>
      </ul>

      <h2>8. Data retention and deletion</h2>
      <ul>
        <li><strong>Active data</strong>: retained for the duration of the subscription.</li>
        <li><strong>Billing records and invoices</strong>: retained for 7 years (Saudi tax law requirement).</li>
        <li><strong>Audit logs</strong>: 24 months.</li>
        <li><strong>Suppressed-email records</strong>: indefinite (deliverability protection).</li>
        <li><strong>Account deletion</strong>: on written request or self-service from <Link to="/app/settings" className="text-primary hover:underline">Settings</Link>, all employee and compensation records are permanently deleted within 30 days, except where law requires longer retention (billing).</li>
      </ul>

      <h2>9. Data-subject rights</h2>
      <p>Total Reward will assist the Controller in responding to data-subject requests for access, rectification, erasure, restriction, portability, and objection — typically through self-service tooling, or by manual action within 7 business days of receiving a verified Controller request.</p>

      <h2>10. Breach notification</h2>
      <p>Total Reward will notify the Controller without undue delay (and in any event within 72 hours) of becoming aware of a personal-data breach affecting the Controller's data, providing the information needed to meet the Controller's own notification obligations to regulators and data subjects.</p>

      <h2>11. Audits</h2>
      <p>Total Reward will make available all information necessary to demonstrate compliance and will allow for and contribute to audits, including inspections, conducted by the Controller or an auditor mandated by the Controller, subject to reasonable confidentiality and frequency limits.</p>

      <h2>12. Return and deletion at end of services</h2>
      <p>On termination, the Controller may export all data via CSV from the platform for 30 days. After that period, Total Reward will delete the Controller's personal data from production systems, with backup deletion completing within 90 days.</p>

      <h2>13. Contact</h2>
      <p>Data Protection contact: <a href="mailto:privacy@totalreward.app" className="text-primary hover:underline">privacy@totalreward.app</a>.</p>
    </>
  );
}

function ContentAr() {
  return (
    <>
      <p>تشكّل اتفاقية معالجة البيانات هذه (&laquo;DPA&raquo;) جزءاً من الاتفاقية المبرمة بين شركة Total Reward (&laquo;المُعالج&raquo;) والمنظمة العميلة (&laquo;المتحكّم&raquo;) التي تستخدم منصة Total Reward. تحكم هذه الوثيقة معالجة البيانات الشخصية التي تتم بواسطة Total Reward نيابةً عن المتحكّم، وقد صيغت بما يتوافق مع نظام حماية البيانات الشخصية السعودي (PDPL) واللائحة الأوروبية العامة لحماية البيانات (GDPR) عند الانطباق.</p>

      <h2>1. أدوار الأطراف</h2>
      <p>يحدد المتحكّم أغراض ووسائل معالجة بيانات الموظفين والموارد البشرية التي يرفعها إلى المنصة. وتعمل Total Reward بصفتها مُعالجاً ولا تعالج البيانات إلا وفق تعليمات موثّقة من المتحكّم، إلا إذا تطلّب نظام مُطبَّق غير ذلك.</p>

      <h2>2. الموضوع والمدة</h2>
      <p>الموضوع: تقديم خدمة Total Reward لإدارة التعويضات. المدة: طوال فترة الاشتراك بالإضافة إلى مدد الاحتفاظ الواردة في البند 8.</p>

      <h2>3. طبيعة المعالجة والغرض منها</h2>
      <p>تخزين وعرض وحساب وتصدير ومعالجة بيانات التعويضات والوظائف والهوية اللازمة لتقديم الخدمة: هياكل الرواتب، البدلات، دورات الجدارة، المكافآت، الأسهم، التحليلات، الموافقات، التدقيق، الفوترة، ودعم العملاء.</p>

      <h2>4. فئات أصحاب البيانات والبيانات الشخصية</h2>
      <ul>
        <li><strong>أصحاب البيانات</strong>: موظفو المتحكّم ومتعاقدوه والمتقدمون للوظائف والمستخدمون المصرّح لهم.</li>
        <li><strong>البيانات الشخصية</strong>: التعريف (الاسم، الرقم الوظيفي، البريد المهني)، البيانات الوظيفية (المسمّى، الدرجة، الإدارة، المدير)، بيانات التعويضات (الراتب الأساسي، البدلات، المكافأة، الأسهم، العملة)، بيانات المصادقة، وسجلات التدقيق.</li>
        <li><strong>الفئات الخاصة</strong>: لا تطلبها Total Reward. ويجب على العملاء عدم رفع بيانات صحية أو دينية أو حيوية أو غيرها من الفئات الخاصة.</li>
      </ul>

      <h2>5. المعالجون من الباطن</h2>
      <p>يُفوّض المتحكّم Total Reward بإشراك المعالجين التاليين، وكلٌّ منهم ملزم بحماية بيانات لا تقل عن المنصوص عليه في هذه الاتفاقية:</p>
      <ul>
        <li><strong>Supabase</strong> (الاستضافة، قاعدة البيانات، المصادقة، التخزين) — المنطقة المختارة هي الاتحاد الأوروبي (AWS).</li>
        <li><strong>Cloudflare</strong> (شبكة التوصيل، حافة التشغيل، الحماية من DDoS).</li>
        <li><strong>Mailgun</strong> (إرسال البريد المعاملي) — للفواتير وإعادة تعيين كلمة المرور وإشعارات دورة الحياة.</li>
        <li><strong>Paylink</strong> (معالجة المدفوعات — السعودية) — يقتصر على بيانات الفوترة المطلوبة. يتم ترميز رقم البطاقة (PAN) ولا تخزن Total Reward أرقام البطاقات الأصلية أبداً.</li>
        <li><strong>مزودو نماذج الذكاء الاصطناعي (Google / OpenAI عبر بوابة Lovable AI)</strong> — فقط عند استخدام ميزات الذكاء الاصطناعي، وتُرسل البيانات لكل طلب على حدة ولا تُستخدم لتدريب النماذج.</li>
      </ul>
      <p>ستُشعر Total Reward المتحكّم قبل 30 يوماً على الأقل بإضافة أو استبدال أي معالج من الباطن يعالج بيانات شخصية. ويحق للمتحكّم الاعتراض لأسباب معقولة وإنهاء الخدمة المتأثرة.</p>

      <h2>6. موقع البيانات والتحويل الدولي</h2>
      <p>التخزين الأساسي في منطقة الاتحاد الأوروبي (فرانكفورت). تبقى نسخ التعافي من الكوارث داخل الاتحاد الأوروبي. وعند حدوث تحويلات خارج الاتحاد الأوروبي/السعودية (مثل استدلال الذكاء الاصطناعي أو إرسال البريد)، تعتمد Total Reward على البنود التعاقدية القياسية أو ضمانات معادلة.</p>

      <h2>7. التدابير الأمنية</h2>
      <ul>
        <li>TLS 1.2+ لجميع البيانات أثناء النقل؛ AES-256 للبيانات أثناء التخزين.</li>
        <li>Row-Level Security يعزل بيانات كل منظمة على مستوى قاعدة البيانات.</li>
        <li>التحكم في الوصول بالأدوار مع مبدأ أدنى الصلاحيات؛ والوصول للإنتاج مقيّد على مهندسين مصرّح لهم ومُسجَّل بالكامل.</li>
        <li>المصادقة: تجزئة كلمات المرور بـ bcrypt، فحص كلمات المرور المسرّبة (HIBP)، MFA اختياري، رموز جلسة JWT مع تدوير.</li>
        <li>نسخ احتياطي يومي مشفّر؛ اختبار استعادة فصلي.</li>
        <li>فحص أمني للكود والاعتماديات في كل إصدار.</li>
      </ul>

      <h2>8. الاحتفاظ بالبيانات وحذفها</h2>
      <ul>
        <li><strong>البيانات النشطة</strong>: تُحفظ طوال مدة الاشتراك.</li>
        <li><strong>سجلات الفوترة والفواتير</strong>: تُحفظ 7 سنوات (متطلب نظامي ضريبي سعودي).</li>
        <li><strong>سجلات التدقيق</strong>: 24 شهراً.</li>
        <li><strong>سجلات الحظر البريدي</strong>: غير محدودة (لحماية قابلية التسليم).</li>
        <li><strong>حذف الحساب</strong>: عند الطلب الكتابي أو بالخدمة الذاتية من <Link to="/app/settings" className="text-primary hover:underline">الإعدادات</Link>، تُحذف جميع بيانات الموظفين والتعويضات نهائياً خلال 30 يوماً، عدا ما يستلزم النظام الاحتفاظ به مدة أطول (الفوترة).</li>
      </ul>

      <h2>9. حقوق أصحاب البيانات</h2>
      <p>ستساعد Total Reward المتحكّم على الاستجابة لطلبات أصحاب البيانات (الوصول، التصحيح، الحذف، التقييد، النقل، الاعتراض) — عادةً عبر أدوات الخدمة الذاتية، أو بإجراء يدوي خلال 7 أيام عمل من استلام طلب موثّق من المتحكّم.</p>

      <h2>10. الإشعار بالاختراق</h2>
      <p>ستُشعر Total Reward المتحكّم دون تأخير لا مبرر له (وبأي حال خلال 72 ساعة) عند علمها بأي اختراق للبيانات الشخصية يؤثر على بيانات المتحكّم، مع توفير المعلومات اللازمة لتمكينه من الإبلاغ للجهات التنظيمية وأصحاب البيانات.</p>

      <h2>11. التدقيق</h2>
      <p>ستوفّر Total Reward جميع المعلومات اللازمة لإثبات الامتثال وستسمح وتساهم في عمليات التدقيق، بما في ذلك التفتيش، الذي يجريه المتحكّم أو مدقق يفوّضه، مع مراعاة قيود سرية ومعدّل تكرار معقولة.</p>

      <h2>12. الإرجاع والحذف عند انتهاء الخدمة</h2>
      <p>عند الإنهاء، يجوز للمتحكّم تصدير كافة البيانات بصيغة CSV من المنصة خلال 30 يوماً. بعد هذه المدة، تحذف Total Reward بياناته الشخصية من أنظمة الإنتاج، ويكتمل حذف النسخ الاحتياطية خلال 90 يوماً.</p>

      <h2>13. التواصل</h2>
      <p>جهة الاتصال لحماية البيانات: <a href="mailto:privacy@totalreward.app" className="text-primary hover:underline">privacy@totalreward.app</a>.</p>
    </>
  );
}
