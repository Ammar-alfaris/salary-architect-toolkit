import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function KpiCard({ label, value, icon: Icon, hint, accent = "primary" }: {
  label: string; value: string | number; icon: LucideIcon; hint?: string;
  accent?: "primary" | "success" | "warning" | "info";
}) {
  const tone: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${tone[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold tabular-nums">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
