import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/refund")({
  component: RefundPage,
  head: () => ({
    meta: [
      { title: "Refund Policy — Total Reward" },
      { name: "description", content: "Refund and cancellation policy for Total Reward subscriptions. Clear rules on eligibility, time windows, and how to request a refund." },
      { property: "og:title", content: "Refund Policy — Total Reward" },
      { property: "og:description", content: "Refund and cancellation rules for Total Reward subscriptions." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://totalreward.app/refund" }],
  }),
});

function RefundPage() {
  const { locale, t } = useI18n();
  const isAr = locale === "ar";
  return (
    <LegalLayout
      eyebrow={t("legal")}
      title={isAr ? "سياسة الاسترداد" : "Refund Policy"}
      lastUpdated={isAr ? "20 يونيو 2026" : "20 June 2026"}
    >
      {isAr ? <ContentAr /> : <ContentEn />}
    </LegalLayout>
  );
}

function ContentEn() {
  return (
    <>
      <h2>1. Try before you buy</h2>
      <p>Every new organization gets a free trial so you can evaluate Total Reward before any payment is taken. We strongly encourage you to fully test the Service during the trial.</p>
      <h2>2. 14-day refund window for new subscriptions</h2>
      <p>If this is your organization&rsquo;s <strong>first paid subscription</strong>, you may request a full refund within <strong>14 calendar days</strong> of the initial payment, provided the account has not been used to run a bonus cycle, merit cycle, or export more than 50 employee records.</p>
      <h2>3. Monthly subscriptions</h2>
      <p>Monthly subscriptions are billed in advance and are non-refundable for the current period after the 14-day window. You may cancel at any time from <em>App → Billing</em>; access continues until the end of the paid period and you will not be charged again.</p>
      <h2>4. Annual subscriptions</h2>
      <p>Annual subscriptions are billed in advance. After the 14-day window, partial refunds may be granted on a pro-rata basis for unused full months, minus any applicable transaction fees, at our discretion.</p>
      <h2>5. Renewals</h2>
      <p>We send a renewal reminder before each renewal. If you do not wish to renew, cancel at least 24 hours before the renewal date. Refunds for charges processed after a missed cancellation are reviewed case-by-case.</p>
      <h2>6. Service failures</h2>
      <p>If a billing error, duplicate charge, or sustained service outage materially affects you, contact us and we will refund the affected period in full.</p>
      <h2>7. How to request a refund</h2>
      <p>Email <a href="mailto:billing@totalreward.app" className="text-primary hover:underline">billing@totalreward.app</a> from the email registered on your account with the invoice number and a brief reason. We respond within 3 business days. Approved refunds are returned to the original payment method via Paylink within 7–14 business days.</p>
      <h2>8. Non-refundable items</h2>
      <ul>
        <li>Add-on services already consumed (e.g. completed bonus cycles).</li>
        <li>Charges older than 60 days, unless caused by a billing error.</li>
        <li>Accounts terminated for violation of the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.</li>
      </ul>
      <h2>9. Contact</h2>
      <p>For any billing or refund question, email <a href="mailto:billing@totalreward.app" className="text-primary hover:underline">billing@totalreward.app</a> or use the <Link to="/contact" className="text-primary hover:underline">contact page</Link>.</p>
    </>
  );
}

function ContentAr() {
  return (
    <>
      <h2>1. جرّب قبل الشراء</h2>
      <p>تحصل كل مؤسسة جديدة على فترة تجريبية مجانية لتقييم Total Reward قبل أي دفع. ننصحك بشدة باختبار الخدمة بشكل كامل خلال الفترة التجريبية.</p>
      <h2>2. نافذة استرداد 14 يوماً للاشتراكات الجديدة</h2>
      <p>إذا كان هذا <strong>أول اشتراك مدفوع</strong> لمؤسستك، يمكنك طلب استرداد كامل خلال <strong>14 يوماً تقويمياً</strong> من تاريخ الدفع الأول، شريطة ألّا يكون الحساب قد استُخدم في تشغيل دورة مكافآت أو دورة استحقاق أو تصدير أكثر من 50 سجل موظف.</p>
      <h2>3. الاشتراكات الشهرية</h2>
      <p>تُحتسب الاشتراكات الشهرية مقدماً وغير قابلة للاسترداد عن الفترة الحالية بعد انقضاء نافذة الـ14 يوماً. يمكنك الإلغاء في أي وقت من <em>التطبيق ← الفوترة</em>؛ ويستمر الوصول حتى نهاية الفترة المدفوعة دون أي خصم إضافي.</p>
      <h2>4. الاشتراكات السنوية</h2>
      <p>تُحتسب الاشتراكات السنوية مقدماً. بعد انقضاء نافذة الـ14 يوماً، يمكن منح استرداد جزئي تناسبياً عن الأشهر الكاملة غير المستخدمة، مخصوماً منها أي رسوم معالجة، وفق تقديرنا.</p>
      <h2>5. التجديدات</h2>
      <p>نرسل إشعاراً قبل كل تجديد. إذا لم ترغب في التجديد، يُرجى الإلغاء قبل 24 ساعة على الأقل من تاريخ التجديد. وتُدرس طلبات استرداد المبالغ المخصومة بعد عدم الإلغاء في حينه حالة بحالة.</p>
      <h2>6. أعطال الخدمة</h2>
      <p>إذا تأثرت جوهرياً نتيجة خطأ في الفوترة أو خصم مكرر أو انقطاع مستمر للخدمة، فتواصل معنا وسنقوم باسترداد قيمة الفترة المتأثرة كاملةً.</p>
      <h2>7. كيفية طلب الاسترداد</h2>
      <p>راسلنا على <a href="mailto:billing@totalreward.app" className="text-primary hover:underline">billing@totalreward.app</a> من البريد المسجَّل في حسابك مع ذكر رقم الفاتورة وسبب مختصر. نرد خلال 3 أيام عمل. وتُعاد المبالغ المعتمدة إلى وسيلة الدفع الأصلية عبر Paylink خلال 7–14 يوم عمل.</p>
      <h2>8. البنود غير القابلة للاسترداد</h2>
      <ul>
        <li>الخدمات الإضافية التي تم استهلاكها (مثل دورات مكافآت مكتملة).</li>
        <li>الرسوم الأقدم من 60 يوماً، ما لم تكن نتيجة خطأ في الفوترة.</li>
        <li>الحسابات المُنهاة بسبب مخالفة <Link to="/terms" className="text-primary hover:underline">شروط الخدمة</Link>.</li>
      </ul>
      <h2>9. التواصل</h2>
      <p>لأي استفسار يخص الفوترة أو الاسترداد، راسلنا على <a href="mailto:billing@totalreward.app" className="text-primary hover:underline">billing@totalreward.app</a> أو عبر <Link to="/contact" className="text-primary hover:underline">صفحة التواصل</Link>.</p>
    </>
  );
}
