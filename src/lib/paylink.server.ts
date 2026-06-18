/**
 * Paylink service layer (server-only).
 *
 * SECURITY: Never trust the user's return-from-Paylink redirect for payment
 * confirmation. ALWAYS call `getInvoice()` (Flow A) from the server and base
 * the order's `paid` status only on the response from Paylink.
 *
 * Currently implements Flow A from the official getting-started guide:
 *   1) POST /api/auth        -> id_token
 *   2) POST /api/addInvoice  -> { transactionNo, url }
 *   3) GET  /api/getInvoice/{transactionNo} -> invoice with orderStatus
 *
 * Flow B (REST with X-API-KEY, POST /api/merchants/{merchantId}/invoices)
 * is intentionally NOT implemented yet. To add it, introduce a
 * PAYLINK_FLOW env flag and branch inside each public function below
 * without changing their signatures.
 */

export type PaylinkAuthResponse = {
  id_token: string;
};

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
  orderStatus: string; // "Paid" | "Pending" | "Failed" | "Canceled" | ...
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

function getConfig() {
  const baseUrl = process.env.PAYLINK_BASE_URL;
  const apiId = process.env.PAYLINK_API_ID;
  const secretKey = process.env.PAYLINK_SECRET_KEY;
  if (!baseUrl || !apiId || !secretKey) {
    throw new Error(
      "Paylink not configured: missing PAYLINK_BASE_URL / PAYLINK_API_ID / PAYLINK_SECRET_KEY",
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiId, secretKey };
}

function logPaylink(
  level: "info" | "error",
  step: string,
  data: Record<string, unknown>,
) {
  // Never log secretKey / id_token / Authorization headers.
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
export async function authenticate(): Promise<string> {
  const { baseUrl, apiId, secretKey } = getConfig();
  try {
    const res = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ apiId, secretKey, persistToken: false }),
    });
    if (!res.ok) {
      const body = await readErr(res);
      logPaylink("error", "authenticate", { httpStatus: res.status, body });
      throw new Error(`Paylink auth failed (${res.status})`);
    }
    const json = (await res.json()) as PaylinkAuthResponse;
    if (!json?.id_token) {
      logPaylink("error", "authenticate", { reason: "missing id_token" });
      throw new Error("Paylink auth: missing id_token in response");
    }
    logPaylink("info", "authenticate", { ok: true });
    return json.id_token;
  } catch (err) {
    logPaylink("error", "authenticate.exception", {
      message: (err as Error).message,
    });
    throw err;
  }
}

/** Step 2: create an invoice and return its transactionNo + payment URL. */
export async function addInvoice(
  input: PaylinkAddInvoiceRequest,
  token: string,
): Promise<PaylinkAddInvoiceResponse> {
  const { baseUrl } = getConfig();
  const body = {
    amount: input.amount,
    callBackUrl: input.callBackUrl,
    clientName: input.clientName,
    clientMobile: input.clientMobile,
    clientEmail: input.clientEmail,
    orderNumber: input.orderNumber,
    currency: input.currency ?? "SAR",
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
        orderNumber: input.orderNumber,
        httpStatus: res.status,
        body: errBody,
      });
      throw new Error(`Paylink addInvoice failed (${res.status})`);
    }
    const json = (await res.json()) as PaylinkAddInvoiceResponse;
    if (!json?.url || !json?.transactionNo) {
      logPaylink("error", "addInvoice", {
        orderNumber: input.orderNumber,
        reason: "missing url or transactionNo",
      });
      throw new Error("Paylink addInvoice: missing payment URL");
    }
    logPaylink("info", "addInvoice", {
      orderNumber: input.orderNumber,
      transactionNo: json.transactionNo,
    });
    return json;
  } catch (err) {
    logPaylink("error", "addInvoice.exception", {
      orderNumber: input.orderNumber,
      message: (err as Error).message,
    });
    throw err;
  }
}

/** Step 3: fetch invoice details to confirm true payment status. */
export async function getInvoice(
  transactionNo: string,
  token: string,
): Promise<PaylinkGetInvoiceResponse> {
  const { baseUrl } = getConfig();
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
      logPaylink("error", "getInvoice", {
        transactionNo,
        httpStatus: res.status,
        body: errBody,
      });
      throw new Error(`Paylink getInvoice failed (${res.status})`);
    }
    const json = (await res.json()) as PaylinkGetInvoiceResponse;
    logPaylink("info", "getInvoice", {
      transactionNo,
      orderStatus: json?.orderStatus,
    });
    return json;
  } catch (err) {
    logPaylink("error", "getInvoice.exception", {
      transactionNo,
      message: (err as Error).message,
    });
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
