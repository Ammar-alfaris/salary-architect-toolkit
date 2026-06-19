import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPaymentMode, type PaymentMode } from "@/lib/payment-mode.functions";

/** Client-side reader for the current Paylink environment. Default: "test". */
export function usePaymentMode(): { mode: PaymentMode; isLoading: boolean; refetch: () => void } {
  const fn = useServerFn(getPaymentMode);
  const q = useQuery({
    queryKey: ["payment-mode"],
    queryFn: async () => (await fn()).mode,
    staleTime: 5 * 60 * 1000,
  });
  return { mode: (q.data as PaymentMode | undefined) ?? "test", isLoading: q.isLoading, refetch: q.refetch };
}

/** Map UI mode → subscriptions.environment column value. */
export function modeToEnvironment(mode: PaymentMode): "sandbox" | "live" {
  return mode === "live" ? "live" : "sandbox";
}
