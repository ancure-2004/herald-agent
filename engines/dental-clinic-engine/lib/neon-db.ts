const DEFAULT_NEON_URL =
  "postgresql://neondb_owner:npg_5HjJUYDR3bMx@ep-still-shape-azt0qlm8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

function getNeonConfig() {
  const connStr = process.env.DATABASE_URL || DEFAULT_NEON_URL;
  const hostMatch = connStr.match(/@([^/]+)\//);
  const host = hostMatch ? hostMatch[1] : "ep-still-shape-azt0qlm8-pooler.c-3.ap-southeast-1.aws.neon.tech";
  return {
    connStr,
    endpoint: `https://${host}/sql`,
  };
}

export async function neonQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const { connStr, endpoint } = getNeonConfig();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connStr,
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Neon SQL error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { rows?: T[] };
  return data.rows || [];
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
    const rows = await neonQuery<NeonClinicPackageRow>(
      `SELECT l.id AS lead_id, l.slug, l.name, l.doctor_name, l.primary_phone,
              p.id AS package_id, p.clinic_payload, p.status, p.expires_at
       FROM leads l
       JOIN packages p ON p.lead_id = l.id
       WHERE l.slug = $1
       ORDER BY p.id DESC
       LIMIT 1`,
      [slug]
    );
    if (!rows.length) return null;
    const row = rows[0];
    if (typeof row.clinic_payload === "string") {
      row.clinic_payload = JSON.parse(row.clinic_payload);
    }
    return row;
  } catch (err) {
    console.error("Failed to fetch clinic package from Neon:", err);
    return null;
  }
}
