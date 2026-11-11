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

export async function fetchClinicPackageFromNeon(
  slug: string
): Promise<NeonClinicPackageRow | null> {
  try {
    const res = await fetch(
      `${BACKEND_API_URL}/api/v1/public/clinic/${encodeURIComponent(slug)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const row = (await res.json()) as NeonClinicPackageRow;
    if (typeof row.clinic_payload === "string") {
      row.clinic_payload = JSON.parse(row.clinic_payload);
    }
    return row;
  } catch (err) {
    console.error("Failed to fetch clinic package from backend:", err);
    return null;
  }
}
