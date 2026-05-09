import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Mail, MessageSquare, Phone, MapPin, Moon, Sun, Languages, CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Us — TotalReward" },
      { name: "description", content: "Get in touch with our team. We'll respond as quickly as possible." },
    ],
  }),
});

const schema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }),
  message: z.string().min(20, { message: "Message must be at least 20 characters." }),
});

type FormValues = z.infer<typeof schema>;

function ContactPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: values.name,
      email: values.email,
      subject: values.subject,
      message: values.message,
      source_form: "contact_page",
      status: "new",
      priority: "medium",
    });
    setLoading(false);
    if (error) {
      toast.error(t("contact_send_error"));
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/">
            <Logo size={28} textClassName="text-sm" />
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocale(locale === "en" ? "ar" : "en")} aria-label={t("language")}>
              <Languages className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} aria-label={t("theme")}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">{t("sign_in")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-5">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("contact_title")}</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t("contact_subtitle")}</p>
        </div>
      </section>

      {/* Main content */}
      <div className="flex-1 container mx-auto px-4 py-10 md:py-14 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Info cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">{t("contact_info_heading")}</h2>

            {[
              { icon: Mail, label: t("contact_info_email"), value: "support@totalreward.app" },
              { icon: Phone, label: t("contact_info_phone"), value: "055555555" },
              { icon: MapPin, label: t("contact_info_location"), value: t("contact_info_location_value") },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 p-4 rounded-xl border bg-card">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-medium mt-0.5">{value}</div>
                </div>
              </div>
            ))}

            <div className="p-4 rounded-xl border bg-card">
              <div className="text-xs text-muted-foreground mb-1">{t("contact_response_time_label")}</div>
              <div className="text-sm font-medium">{t("contact_response_time_value")}</div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border bg-card p-6 md:p-8">
              {submitted ? (
                /* Success state */
                <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold">{t("contact_success_title")}</h3>
                  <p className="text-muted-foreground max-w-xs">{t("contact_success_body")}</p>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    <Button variant="outline" onClick={() => { setSubmitted(false); form.reset(); }}>
                      {t("contact_send_another")}
                    </Button>
                    <Button asChild>
                      <Link to="/">
                        <ArrowLeft className="w-4 h-4 me-2" />
                        {t("back_home")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contact_field_name")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("contact_field_name_placeholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("contact_field_email")}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder={t("contact_field_email_placeholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contact_field_subject")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("contact_field_subject_placeholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contact_field_message")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("contact_field_message_placeholder")}
                            rows={6}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t("contact_sending") : t("contact_send")}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} {t("app_name")}</div>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground">{t("back_home")}</Link>
            <a href="#" className="hover:text-foreground">{t("privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("terms")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
