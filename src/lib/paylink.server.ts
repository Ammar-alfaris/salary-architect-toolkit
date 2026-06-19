/**
 * Paylink service layer (server-only).
 *
 * Two-environment aware: every public function accepts a `mode`
 * ("test" | "live") and reads the matching credential set from
 * environment variables. The mode is controlled platform-wide from
 * Admin → Settings → Payments (stored in admin_settings.payment_mode).
 *
 * Credentials:
 *   test  → PAYLINK_TEST_BASE_URL / PAYLINK_TEST_API_ID / PAYLINK_TEST_SECRET_KEY
 *           (falls back to legacy PAYLINK_BASE_URL / PAYLINK_API_ID / PAYLINK_SECRET_KEY)
 *   live  → PAYLINK_LIVE_BASE_URL / PAYLINK_LIVE_API_ID / PAYLINK_LIVE_SECRET_KEY
 *
 * SECURITY: Never trust the user's return-from-Paylink redirect for payment
 * confirmation. ALWAYS call `getInvoice()` from the server and base the
 * order's `paid` status only on the response from Paylink.
 */

export type PaylinkMode = "test" | "live";

export type PaylinkAuthResponse = { id_token: string };

export type PaylinkProduct = {
  title: string;
  price: number;
  qty: number;
  description?: string;
};

export type PaylinkAddInvoiceRequest = {
  amount: number;
  callBackUrl: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  orderNumber: string;
  products: PaylinkProduct[];
  currency?: string;
  supportedCardBrands?: string[];
  displayPending?: boolean;
};

export type PaylinkAddInvoiceResponse = {
  transactionNo: string;
  url: string;
  invoiceId?: string | number;
  orderStatus?: string;
  amount?: number;
  [key: string]: any;
};

export type PaylinkGetInvoiceResponse = {
  transactionNo: string;
  orderStatus: string;
  amount: number;
  paymentReceipt?: string;
  invoiceId?: string | number;
  [key: string]: any;
};

export type PaylinkVerifyResult = {
  paymentStatus: "paid" | "failed" | "pending" | "cancelled";
  paidAmount: number | null;
  invoice: PaylinkGetInvoiceResponse;
};

function pick(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

function getConfig(mode: PaylinkMode) {
  const baseUrl =
    mode === "live"
      ? pick("PAYLINK_LIVE_BASE_URL")
      : pick("PAYLINK_TEST_BASE_URL", "PAYLINK_BASE_URL");
  const apiId =
    mode === "live"
      ? pick("PAYLINK_LIVE_API_ID")
      : pick("PAYLINK_TEST_API_ID", "PAYLINK_API_ID");
  const secretKey =
    mode === "live"
      ? pick("PAYLINK_LIVE_SECRET_KEY")
      : pick("PAYLINK_TEST_SECRET_KEY", "PAYLINK_SECRET_KEY");

  if (!baseUrl || !apiId || !secretKey) {
    const prefix = mode === "live" ? "PAYLINK_LIVE_" : "PAYLINK_TEST_";
    throw new Error(
      `Paylink ${mode} not configured: missing ${prefix}BASE_URL / ${prefix}API_ID / ${prefix}SECRET_KEY`,
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiId, secretKey };
}

function logPaylink(
  level: "info" | "error",
  step: string,
  data: Record<string, unknown>,
) {
  const payload = JSON.stringify({ scope: "paylink", step, ...data });
  if (level === "error") console.error(payload);
  else console.log(payload);
}

async function readErr(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    return txt.slice(0, 500);
  } catch {
    return "<unreadable body>";
  }
}

/** Step 1: authenticate against Paylink and get a short-lived bearer token. */
export async function authenticate(mode: PaylinkMode): Promise<string> {
  const { baseUrl, apiId, secretKey } = getConfig(mode);
  try {
    const res = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ apiId, secretKey, persistToken: false }),
    });
    if (!res.ok) {
      const body = await readErr(res);
      logPaylink("error", "authenticate", { mode, httpStatus: res.status, body });
      throw new Error(`Paylink auth failed (${res.status})`);
    }
    const json = (await res.json()) as PaylinkAuthResponse;
    if (!json?.id_token) {
      logPaylink("error", "authenticate", { mode, reason: "missing id_token" });
      throw new Error("Paylink auth: missing id_token in response");
    }
    logPaylink("info", "authenticate", { mode, ok: true });
    return json.id_token;
  } catch (err) {
    logPaylink("error", "authenticate.exception", { mode, message: (err as Error).message });
    throw err;
  }
}

/** Step 2: create an invoice and return its transactionNo + payment URL. */
export async function addInvoice(
  mode: PaylinkMode,
  input: PaylinkAddInvoiceRequest,
  token: string,
): Promise<PaylinkAddInvoiceResponse> {
  const { baseUrl } = getConfig(mode);
  const body = {
    amount: input.amount,
    callBackUrl: input.callBackUrl,
    clientName: input.clientName,
    clientMobile: input.clientMobile,
    clientEmail: input.clientEmail,
    orderNumber: input.orderNumber,
    currency: input.currency ?? "SAR",
    supportedCardBrands: input.supportedCardBrands ?? ["mada", "visaMastercard"],
    displayPending: input.displayPending ?? true,
    products: input.products.map((p) => ({
      title: p.title,
      price: p.price,
      qty: p.qty,
      description: p.description,
    })),
  };
  try {
    const res = await fetch(`${baseUrl}/api/addInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await readErr(res);
      logPaylink("error", "addInvoice", {
        mode,
        orderNumber: input.orderNumber,
        httpStatus: res.status,
        body: errBody,
      });
      let detail = "";
      try {
        const parsed = JSON.parse(errBody) as { detail?: string; title?: string; errorCode?: string };
        detail = parsed.detail || parsed.title || "";
        if (parsed.errorCode) detail = `[${parsed.errorCode}] ${detail}`;
      } catch { /* ignore */ }
      throw new Error(
        detail ? `Paylink: ${detail}` : `Paylink addInvoice failed (${res.status})`,
      );
    }
    const json = (await res.json()) as PaylinkAddInvoiceResponse;
    if (!json?.url || !json?.transactionNo) {
      logPaylink("error", "addInvoice", {
        mode,
        orderNumber: input.orderNumber,
        reason: "missing url or transactionNo",
      });
      throw new Error("Paylink addInvoice: missing payment URL");
    }
    logPaylink("info", "addInvoice", {
      mode,
      orderNumber: input.orderNumber,
      transactionNo: json.transactionNo,
    });
    return json;
  } catch (err) {
    logPaylink("error", "addInvoice.exception", {
      mode,
      orderNumber: input.orderNumber,
      message: (err as Error).message,
    });
    throw err;
  }
}

/** Step 3: fetch invoice details to confirm true payment status. */
export async function getInvoice(
  mode: PaylinkMode,
  transactionNo: string,
  token: string,
): Promise<PaylinkGetInvoiceResponse> {
  const { baseUrl } = getConfig(mode);
  try {
    const res = await fetch(
      `${baseUrl}/api/getInvoice/${encodeURIComponent(transactionNo)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) {
      const errBody = await readErr(res);
      logPaylink("error", "getInvoice", { mode, transactionNo, httpStatus: res.status, body: errBody });
      throw new Error(`Paylink getInvoice failed (${res.status})`);
    }
    const json = (await res.json()) as PaylinkGetInvoiceResponse;
    logPaylink("info", "getInvoice", { mode, transactionNo, orderStatus: json?.orderStatus });
    return json;
  } catch (err) {
    logPaylink("error", "getInvoice.exception", { mode, transactionNo, message: (err as Error).message });
    throw err;
  }
}

/** Normalize Paylink's orderStatus string to our internal status. */
export function mapPaylinkStatus(
  orderStatus: string | undefined,
): PaylinkVerifyResult["paymentStatus"] {
  const s = (orderStatus ?? "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "canceled" || s === "cancelled") return "cancelled";
  if (s === "failed" || s === "declined" || s === "expired") return "failed";
  return "pending";
}

/** Read the current platform-wide Paylink mode from admin_settings. */
export async function getCurrentPaylinkMode(): Promise<PaylinkMode> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_payment_mode");
  if (error) {
    console.error(JSON.stringify({ scope: "paylink", step: "getMode.failed", message: error.message }));
    return "test";
  }
  return (data as unknown as string) === "live" ? "live" : "test";
}
