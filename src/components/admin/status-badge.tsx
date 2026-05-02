import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  error: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

const MAP: Record<string, keyof typeof TONES> = {
  active: "success", published: "success", paid: "success", resolved: "success", closed: "neutral",
  trial: "info", new: "info", scheduled: "info", in_progress: "info", open: "info", read: "info",
  pending: "warning", pending_customer: "warning", high: "warning", warning: "warning",
  suspended: "error", cancelled: "error", expired: "error", spam: "error", urgent: "error",
  draft: "neutral", inactive: "neutral", archived: "neutral", low: "neutral", medium: "info",
  replied: "success",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <Badge variant="outline">—</Badge>;
  const tone = MAP[value] ?? "neutral";
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", TONES[tone])}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}
