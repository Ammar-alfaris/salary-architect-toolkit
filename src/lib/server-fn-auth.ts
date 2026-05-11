import { supabase } from "@/integrations/supabase/client";

export async function getServerFnAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function assertServerFnResult<T>(result: T | Response): Promise<T> {
  if (!(typeof Response !== "undefined" && result instanceof Response)) {
    return result as T;
  }

  let message = result.statusText || "Request failed";

  try {
    const text = await result.text();
    if (text) message = text;
  } catch {
    // Ignore body parse errors and use the status text fallback.
  }

  throw new Error(message);
}