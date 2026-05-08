import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/logo";
import { Mail, Phone, MapPin, Moon, Sun, Languages, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — RewardArchitect" },
      { name: "description", content: "Get in touch with our team. We're here to help with your compensation and rewards questions." },
    ],
  }),
});

function ContactPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const ar = locale === "ar";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error(t("contact_form_required"));
      return;
    }

    setLoading(true);
    try {
      // Send email using Lovable email service
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: "", email: "", subject: "", message: "" });
        toast.success(t("contact_form_success"));
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        toast.error(t("contact_form_error"));
      }
    } catch (error) {
      toast.error(t("contact_form_error"));
    } finally {
      setLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      label: t("contact_email_label"),
      value: "support@rewardarchitect.com",
      link: "mailto:support@rewardarchitect.com",
    },
    {
      icon: Phone,
      label: t("contact_phone_label"),
      value: "+966 (0) 123 456 7890",
      link: "tel:+9661234567890",
    },
    {
      icon: MapPin,
      label: t("contact_address_label"),
      value: t("contact_address_value"),
      link: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={ar ? "rtl" : "ltr"}>
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link to="/">
            <Logo size={32} textClassName="truncate text-sm sm:text-base" className="min-w-0" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{ar ? "الرئيسية" : "Home"}</Link>
            <a href="/#features" className="hover:text-foreground">{t("features")}</a>
            <Link to="/blog" className="hover:text-foreground">{ar ? "المدونة" : "Blog"}</Link>
            <Link to="/contact" className="text-foreground font-medium">{t("contact")}</Link>
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("language")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label={t("theme")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/auth">{t("sign_in")}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">{t("get_started")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            {t("contact_heading")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("contact_subheading")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.label} className="border rounded-lg p-6 bg-card hover:border-accent/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">{method.label}</h3>
                {method.link ? (
                  <a href={method.link} className="text-primary hover:underline break-all">
                    {method.value}
                  </a>
                ) : (
                  <p className="text-muted-foreground">{method.value}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="border rounded-lg p-8 bg-card">
          <h2 className="text-2xl font-semibold mb-6">{t("contact_form_title")}</h2>

          {submitted && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 flex items-gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className={ar ? "me-3" : "ms-3"}>
                <p className="text-green-900 dark:text-green-100 font-medium">
                  {ar ? "شكراً!" : "Thank you!"}
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {t("contact_form_response_time")}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t("contact_form_name")}</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t("contact_form_name_placeholder")}
                  required
                  dir={ar ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t("contact_form_email")}</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t("contact_form_email_placeholder")}
                  required
                  dir={ar ? "rtl" : "ltr"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("contact_form_subject")}</label>
              <Input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder={t("contact_form_subject_placeholder")}
                required
                dir={ar ? "rtl" : "ltr"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("contact_form_message")}</label>
              <Textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder={t("contact_form_message_placeholder")}
                required
                rows={6}
                dir={ar ? "rtl" : "ltr"}
              />
            </div>

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? t("contact_form_sending") : t("contact_form_send")}
              {!loading && <ArrowRight className={`w-4 h-4 ${ar ? "me-2" : "ms-2"}`} />}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t("contact_form_response_time")}
          </p>
        </div>
      </section>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {t("app_name")}</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">{t("privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("terms")}</a>
            <Link to="/contact" className="hover:text-foreground">{t("contact")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
