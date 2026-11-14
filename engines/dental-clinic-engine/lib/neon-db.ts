// Neon is no longer used. All data now comes from the local FastAPI backend.
// neonQuery is kept as a safe no-op so any legacy caller returns [] instead of
// hitting an expired Neon account (402 Quota Exceeded).

const BACKEND_API_URL = process.env.PERSONAL_OS_API_URL || "http://localhost:8000";

export async function neonQuery<T = Record<string, unknown>>(
  _query: string,
  _params: unknown[] = []
): Promise<T[]> {
  return [];
}

export interface NeonClinicPackageRow {
  lead_id: number;
  slug: string;
  name: string;
  doctor_name: string;
  primary_phone: string | null;
  package_id: number;
  clinic_payload: {
    clinic?: Record<string, unknown>;
    claims?: Record<string, unknown>;
    services?: Record<string, unknown>;
    faqs?: Record<string, unknown>;
    templates?: {
      modern?: Record<string, unknown>;
      premium?: Record<string, unknown>;
      warm?: Record<string, unknown>;
    };
  };
  status: string;
  expires_at: string | null;
}

/**
 * Fetches the raw clinic package from the local FastAPI backend with timeout and error handling.
 */
export async function fetchClinicPackageFromNeon(
  slug: string,
  timeoutMs: number = 4000
): Promise<NeonClinicPackageRow | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${BACKEND_API_URL}/api/v1/public/clinic/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const row = (await res.json()) as NeonClinicPackageRow;
    if (typeof row.clinic_payload === "string") {
      try {
        row.clinic_payload = JSON.parse(row.clinic_payload);
      } catch {
        return null;
      }
    }
    return row;
  } catch (err) {
    // Timeout or connection refused (backend offline) gracefully handled so caller falls back
    return null;
  }
}
