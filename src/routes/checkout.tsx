import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { createPaylinkInvoice } from "@/lib/paylink.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const SearchSchema = z.object({
  product: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  title: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => SearchSchema.parse(s),
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: "Checkout — Total Reward" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CheckoutPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const createInvoice = useServerFn(createPaylinkInvoice);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        const next = encodeURIComponent(`/checkout?${new URLSearchParams(search as Record<string, string>).toString()}`);
        window.location.href = `/auth?next=${next}`;
        return;
      }
      setCheckingAuth(false);
    });
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const productKey = search.product ?? "custom";
  const amount = search.amount ?? 0;
  const itemTitle = search.title ?? productKey;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (!name.trim() || phone.trim().length < 6) {
      toast.error("Please fill name and phone");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createInvoice({
        data: {
          productKey,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
          amount,
          items: [{ title: itemTitle, price: amount, qty: 1 }],
        },
      });
      if (!result?.paymentUrl) throw new Error("No payment URL returned");
      window.location.href = result.paymentUrl;
    } catch (err) {
      const msg = (err as Error).message || "Payment failed";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-md border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="font-medium">{itemTitle}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{amount.toFixed(2)} SAR</span></div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={20} placeholder="05xxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !amount}>
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting…</>) : "Pay now"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate({ to: "/pricing" })}>
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
