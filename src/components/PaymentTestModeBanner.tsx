import { usePaymentMode } from "@/hooks/use-payment-mode";

/**
 * Shows a test-mode banner whenever Paylink is running against the
 * sandbox/test credentials. Reads the platform-wide payment_mode flag
 * from admin_settings (set via Admin → Settings → Payments).
 */
export function PaymentTestModeBanner() {
  const { mode } = usePaymentMode();
  if (mode !== "test") return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      Payments are running in <strong>test mode</strong> — no real money is charged. Use Paylink test cards to try checkout.
    </div>
  );
}
