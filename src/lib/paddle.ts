import { resolvePaddlePrice } from "@/lib/payments.functions";

const liveToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const sandboxToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN_SANDBOX as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host.endsWith(".lovableproject.com") ||
    host.includes("id-preview--") ||
    host.endsWith("-dev.lovable.app") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  if (isPreviewHost() && sandboxToken) return "sandbox";
  return liveToken?.startsWith("test_") ? "sandbox" : "live";
}

function getClientToken(): string | undefined {
  if (isPreviewHost() && sandboxToken) return sandboxToken;
  return liveToken;
}

let paddleInitialized = false;

export async function initializePaddle() {
  if (paddleInitialized) return;
  const token = getClientToken();
  if (!token) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      const paddleJsEnvironment = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(paddleJsEnvironment);
      window.Paddle.Initialize({ token });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  return resolvePaddlePrice({ data: { priceId, environment } });
}

export async function openCheckout(options: {
  priceId: string;
  customerEmail?: string;
  customData?: Record<string, string>;
  successUrl?: string;
}) {
  await initializePaddle();
  const paddlePriceId = await getPaddlePriceId(options.priceId);
  window.Paddle.Checkout.open({
    items: [{ priceId: paddlePriceId, quantity: 1 }],
    customer: options.customerEmail ? { email: options.customerEmail } : undefined,
    customData: options.customData,
    settings: {
      displayMode: "overlay",
      successUrl: options.successUrl || `${window.location.origin}/app/billing?checkout=success`,
      allowLogout: false,
      variant: "one-page",
    },
  });
}
