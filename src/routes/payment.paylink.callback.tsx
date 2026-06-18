import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { verifyPaylinkPayment } from "@/lib/paylink.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

const SearchSchema = z.object({
  orderId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/payment/paylink/callback")({
  validateSearch: (s: Record<string, unknown>) => SearchSchema.parse(s),
  component: CallbackPage,
  head: () => ({
    meta: [
      { title: "Payment result — Total Reward" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Result =
  | { state: "loading" }
  | { state: "need_auth" }
  | { state: "error"; message: string }
  | {
      state: "done";
      paymentStatus: "paid" | "failed" | "pending" | "cancelled";
      paidAmount: number | null;
      orderId: string;
    };

function CallbackPage() {
  const { orderId } = Route.useSearch();
  const verify = useServerFn(verifyPaylinkPayment);
  const [result, setResult] = useState<Result>({ state: "loading" });

  async function run() {
    if (!orderId) {
      setResult({ state: "error", message: "Missing orderId" });
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setResult({ state: "need_auth" });
      return;
    }
    setResult({ state: "loading" });
    try {
      const res = await verify({ data: { orderId } });
      setResult({
        state: "done",
        paymentStatus: res.paymentStatus,
        paidAmount: res.paidAmount,
        orderId: res.orderId,
      });
    } catch (err) {
      setResult({ state: "error", message: (err as Error).message || "Verification failed" });
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {result.state === "loading" && (
            <div className="py-6 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Verifying your payment with Paylink…</p>
            </div>
          )}

          {result.state === "need_auth" && (
            <>
              <p>Please sign in to view your payment status.</p>
              <Button asChild className="w-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}

          {result.state === "error" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-sm">{result.message}</p>
              <Button onClick={run} className="w-full">Retry</Button>
            </>
          )}

          {result.state === "done" && result.paymentStatus === "paid" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="text-lg font-semibold">Payment successful</h2>
              <p className="text-sm text-muted-foreground">
                Order <span className="font-mono">{result.orderId.slice(0, 8)}</span>
                {result.paidAmount != null && (<> — {result.paidAmount.toFixed(2)} SAR</>)}
              </p>
              <Button asChild className="w-full">
                <Link to="/app">Go to your dashboard</Link>
              </Button>
            </>
          )}

          {result.state === "done" && (result.paymentStatus === "failed" || result.paymentStatus === "cancelled") && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="text-lg font-semibold">
                Payment {result.paymentStatus === "cancelled" ? "cancelled" : "failed"}
              </h2>
              <p className="text-sm text-muted-foreground">Your card was not charged. You can try again.</p>
              <Button asChild className="w-full">
                <Link to="/pricing">Back to pricing</Link>
              </Button>
            </>
          )}

          {result.state === "done" && result.paymentStatus === "pending" && (
            <>
              <Clock className="mx-auto h-12 w-12 text-amber-500" />
              <h2 className="text-lg font-semibold">Payment pending</h2>
              <p className="text-sm text-muted-foreground">
                Paylink hasn't confirmed the payment yet. This can take a moment.
              </p>
              <Button onClick={run} className="w-full">Check again</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
