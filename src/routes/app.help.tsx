import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";
import { downloadEmployeeTemplate } from "@/lib/excel";
import { useOnboarding } from "@/lib/onboarding";
import type { TourGoal } from "@/lib/tours";
import {
  FileDown, Upload, Layers, Gift, TrendingUp, Users, Search, LifeBuoy, Mail, Compass, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/app/help")({ component: HelpPage });

function HelpPage() {
  const { t } = useI18n();
  const { setGoal } = useOnboarding();
  const [q, setQ] = useState("");

  const quickStart: { goal: TourGoal; icon: any; titleKey: string; descKey: string }[] = [
    { goal: "employees_only", icon: Users, titleKey: "help_qs_import", descKey: "help_qs_import_desc" },
    { goal: "new_company", icon: Layers, titleKey: "help_qs_structure", descKey: "help_qs_structure_desc" },
    { goal: "cycles_only", icon: TrendingUp, titleKey: "help_qs_merit", descKey: "help_qs_merit_desc" },
    { goal: "cycles_only", icon: Gift, titleKey: "help_qs_bonus", descKey: "help_qs_bonus_desc" },
  ];

  const importSteps = [1, 2, 3, 4, 5, 6];
  const faqIds = [1, 2, 3, 4, 5, 6, 7];

  const matches = (key: string) => !q.trim() || t(key).toLowerCase().includes(q.trim().toLowerCase());

  return (
    <div>
      <PageHeader title={t("help_title")} subtitle={t("help_subtitle")} />
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("help_search_placeholder")} className="ps-9" />
        </div>

        {/* Quick start */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" /> {t("help_quick_start")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickStart.map((q, i) => (
              <Card key={i} className="p-4 hover:border-primary transition group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <q.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{t(q.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{t(q.descKey)}</p>
                    <Button size="sm" variant="outline" onClick={() => setGoal(q.goal)}>
                      {t("help_start_tour")} <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Detailed import guide */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> {t("help_import_guide_title")}
          </h2>
          <Card className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{t("help_import_guide_intro")}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => downloadEmployeeTemplate()}>
                <FileDown className="w-4 h-4 me-1" /> {t("download_template")}
              </Button>
              <Link to="/app/employees"><Button size="sm" variant="outline"><Upload className="w-4 h-4 me-1" /> {t("import_excel")}</Button></Link>
            </div>
            <ol className="space-y-3 mt-2">
              {importSteps.map((n) => (
                <li key={n} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 font-semibold">{n}</span>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">{t(`help_import_step_${n}_title`)}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`help_import_step_${n}_body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              💡 {t("help_import_tip")}
            </div>
          </Card>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-primary" /> {t("help_faq_title")}
          </h2>
          <Card className="p-2">
            <Accordion type="single" collapsible className="w-full">
              {faqIds.filter((n) => matches(`help_faq_${n}_q`) || matches(`help_faq_${n}_a`)).map((n) => (
                <AccordionItem key={n} value={`faq-${n}`}>
                  <AccordionTrigger className="text-sm font-medium px-3 text-start">{t(`help_faq_${n}_q`)}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed px-3">{t(`help_faq_${n}_a`)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-br from-primary/5 to-transparent">
            <div>
              <h3 className="font-semibold mb-1">{t("help_contact_title")}</h3>
              <p className="text-sm text-muted-foreground">{t("help_contact_body")}</p>
            </div>
            <div className="flex gap-2">
              <Link to="/app/onboarding"><Button variant="outline" size="sm"><Compass className="w-4 h-4 me-1" /> {t("help_restart_onboarding")}</Button></Link>
              <a href="mailto:support@totalreward.app"><Button size="sm"><Mail className="w-4 h-4 me-1" /> {t("help_email_support")}</Button></a>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
