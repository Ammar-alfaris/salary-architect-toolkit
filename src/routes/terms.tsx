import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Total Reward" },
      { name: "description", content: "The terms governing your use of the Total Reward compensation platform, including subscriptions, acceptable use, and limitations of liability." },
      { property: "og:title", content: "Terms of Service — Total Reward" },
      { property: "og:description", content: "Terms of Service for the Total Reward compensation platform." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://totalreward.app/terms" }],
  }),
});

function TermsPage() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";

  return (
    <LegalLayout
      eyebrow={t("legal")}
      title={isAr ? "شروط الخدمة" : "Terms of Service"}
      lastUpdated={isAr ? "20 يونيو 2026" : "20 June 2026"}
    >
      {isAr ? <ContentAr /> : <ContentEn />}
    </LegalLayout>
  );
}

function ContentEn() {
  return (
    <>
      <h2>1. Acceptance</h2>
      <p>By creating an account or using Total Reward (the &ldquo;Service&rdquo;), you agree to these Terms. If you accept on behalf of an organization, you confirm you are authorized to bind that organization.</p>
      <h2>2. The Service</h2>
      <p>Total Reward provides web-based tools for managing compensation: salary structures, salary grades, allowances, bonus and merit cycles, and related analytics. Features may evolve over time.</p>
      <h2>3. Accounts</h2>
      <p>You are responsible for the accuracy of registration information, for all activity under your account, and for keeping your credentials secure. Notify us immediately of any unauthorized use.</p>
      <h2>4. Subscriptions, fees &amp; VAT</h2>
      <ul>
        <li>Subscriptions are billed monthly or annually as selected at checkout. Prices are displayed in Saudi Riyal (SAR) unless noted otherwise.</li>
        <li>All prices are <strong>inclusive of 15% KSA VAT</strong> where applicable.</li>
        <li>Payment is processed by Paylink. By paying, you also agree to Paylink&rsquo;s terms.</li>
        <li>We may change pricing on renewal with at least 30 days&rsquo; notice.</li>
      </ul>
      <h2>5. Free trial</h2>
      <p>New organizations may receive a free trial. Trials convert to paid subscriptions only when you actively pay; we do not auto-charge a card at the end of the trial.</p>
      <h2>6. Refunds &amp; cancellation</h2>
      <p>See our <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link>. You may cancel at any time from Billing settings; access continues until the end of the paid period.</p>
      <h2>7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Reverse engineer, copy, or resell the Service.</li>
        <li>Upload content that is unlawful, infringing, or harmful.</li>
        <li>Attempt to bypass security, rate limits, or access controls.</li>
        <li>Use the Service to violate the privacy rights of others.</li>
      </ul>
      <h2>8. Your data</h2>
      <p>You retain ownership of the data your organization uploads. You grant us a limited license to host and process it solely to provide the Service. We handle personal data as described in our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
      <h2>9. Service level &amp; availability</h2>
      <p>We aim for high availability but do not guarantee uninterrupted access. Planned maintenance will be announced where possible.</p>
      <h2>10. Suspension &amp; termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms, are materially overdue on payment, or pose a security risk. You may terminate at any time by cancelling your subscription.</p>
      <h2>11. Disclaimers</h2>
      <p>The Service is provided &ldquo;as is&rdquo;. Compensation calculations are tools to assist HR decisions; the user is responsible for verifying outcomes before acting on them.</p>
      <h2>12. Limitation of liability</h2>
      <p>To the extent permitted by law, our aggregate liability under these Terms is limited to the fees paid for the Service in the 12 months preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages.</p>
      <h2>13. Governing law</h2>
      <p>These Terms are governed by the laws of the Kingdom of Saudi Arabia. Disputes shall be submitted to the competent courts in Riyadh.</p>
      <h2>14. Changes</h2>
      <p>We may update these Terms. Material changes will be communicated by email or in-app banner; continued use after the effective date constitutes acceptance.</p>
      <h2>15. Contact</h2>
      <p>For questions about these Terms, email <a href="mailto:legal@totalreward.app" className="text-primary hover:underline">legal@totalreward.app</a>.</p>
    </>
  );
}

function ContentAr() {
  return (
    <>
      <h2>1. القبول</h2>
      <p>بإنشائك حساباً أو باستخدامك منصة Total Reward («الخدمة»)، فإنك توافق على هذه الشروط. وإذا كنت تقبل نيابةً عن مؤسسة، فأنت تؤكد أنك مفوّض بإلزامها.</p>
      <h2>2. الخدمة</h2>
      <p>توفّر Total Reward أدوات عبر الويب لإدارة التعويضات: هياكل الرواتب، درجات الأجور، البدلات، دورات المكافآت والاستحقاق، والتحليلات المرتبطة. قد تتطور الميزات بمرور الوقت.</p>
      <h2>3. الحسابات</h2>
      <p>أنت مسؤول عن دقة بيانات التسجيل وعن جميع الأنشطة التي تتم من خلال حسابك وعن الحفاظ على سرية بيانات الاعتماد. أبلغنا فوراً عن أي استخدام غير مصرّح به.</p>
      <h2>4. الاشتراكات والرسوم وضريبة القيمة المضافة</h2>
      <ul>
        <li>تُحتسب الاشتراكات شهرياً أو سنوياً بحسب اختيارك عند الدفع. الأسعار معروضة بالريال السعودي (SAR) ما لم يُذكر خلاف ذلك.</li>
        <li>جميع الأسعار <strong>شاملة ضريبة القيمة المضافة 15%</strong> أينما تنطبق.</li>
        <li>تتم معالجة المدفوعات عبر Paylink. بدفعك فإنك توافق أيضاً على شروط Paylink.</li>
        <li>يجوز لنا تعديل الأسعار عند التجديد بإشعار لا يقل عن 30 يوماً.</li>
      </ul>
      <h2>5. الفترة التجريبية المجانية</h2>
      <p>قد تحصل المؤسسات الجديدة على فترة تجريبية مجانية. لا تتحول الفترة التجريبية إلى اشتراك مدفوع إلا عند دفعك فعلياً؛ ولا نقوم بأي خصم تلقائي من البطاقة عند انتهاء الفترة التجريبية.</p>
      <h2>6. الاسترداد والإلغاء</h2>
      <p>راجع <Link to="/refund" className="text-primary hover:underline">سياسة الاسترداد</Link>. يمكنك الإلغاء في أي وقت من إعدادات الفوترة، ويستمر الوصول حتى نهاية الفترة المدفوعة.</p>
      <h2>7. الاستخدام المقبول</h2>
      <p>أنت توافق على عدم:</p>
      <ul>
        <li>إجراء هندسة عكسية للخدمة أو نسخها أو إعادة بيعها.</li>
        <li>رفع أي محتوى غير قانوني أو منتهك للحقوق أو ضار.</li>
        <li>محاولة تجاوز أنظمة الأمان أو حدود الاستخدام أو ضوابط الوصول.</li>
        <li>استخدام الخدمة لانتهاك خصوصية الآخرين.</li>
      </ul>
      <h2>8. بياناتك</h2>
      <p>تحتفظ مؤسستك بملكية البيانات التي ترفعها. وتمنحنا ترخيصاً محدوداً لاستضافتها ومعالجتها لتقديم الخدمة فقط. نتعامل مع البيانات الشخصية وفق <Link to="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>.</p>
      <h2>9. مستوى الخدمة والتوافر</h2>
      <p>نسعى لتوفّر عالٍ، لكنّنا لا نضمن وصولاً دون انقطاع. سيتم الإعلان عن الصيانة المخططة حيثما أمكن.</p>
      <h2>10. التعليق والإنهاء</h2>
      <p>يجوز لنا تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط أو تتأخر جوهرياً في السداد أو تشكّل مخاطر أمنية. ويمكنك الإنهاء في أي وقت بإلغاء اشتراكك.</p>
      <h2>11. إخلاء المسؤولية</h2>
      <p>تُقدَّم الخدمة «كما هي». إن حسابات التعويضات أدوات مساعدة لقرارات الموارد البشرية، والمستخدم مسؤول عن التحقق من النتائج قبل الاعتماد عليها.</p>
      <h2>12. حدود المسؤولية</h2>
      <p>إلى الحد الذي يسمح به النظام، تقتصر مسؤوليتنا الإجمالية بموجب هذه الشروط على الرسوم المدفوعة خلال الـ12 شهراً السابقة للمطالبة. ولا نتحمل أي أضرار غير مباشرة أو عرضية أو تبعية أو عقابية.</p>
      <h2>13. القانون الحاكم</h2>
      <p>تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتُحال أي نزاعات إلى المحاكم المختصة في الرياض.</p>
      <h2>14. التعديلات</h2>
      <p>قد نقوم بتحديث هذه الشروط. وسيتم إبلاغك بالتعديلات الجوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق؛ ويُعدّ الاستمرار في الاستخدام بعد تاريخ السريان قبولاً لها.</p>
      <h2>15. التواصل</h2>
      <p>لأي استفسار حول هذه الشروط، راسلنا على <a href="mailto:legal@totalreward.app" className="text-primary hover:underline">legal@totalreward.app</a>.</p>
    </>
  );
}
