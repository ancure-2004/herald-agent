import React from "react";
import { fetchClinicPackageFromNeon } from "@/lib/neon-db";
import { getClinic } from "@/lib/get-clinic";
import DemoSwitcherClient from "@/components/DemoSwitcherClient";
import ViewTracker from "@/components/ViewTracker";

export const dynamic = "force-dynamic";

export default async function DemoChoicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const neonRow = await fetchClinicPackageFromNeon(slug);

  let clinicName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let doctorName = "Doctor";
  let isExpired = false;

  if (neonRow) {
    clinicName = neonRow.name || clinicName;
    doctorName = neonRow.doctor_name || doctorName;
    if (neonRow.expires_at) {
      const exp = new Date(neonRow.expires_at).getTime();
      if (Date.now() > exp) {
        isExpired = true;
      }
    }
  } else {
    try {
      const fallbackCfg = await getClinic(slug, "modern");
      clinicName = fallbackCfg.clinicName || clinicName;
      doctorName = fallbackCfg.doctor?.name || doctorName;
    } catch {
      // fallback to formatted slug
    }
  }

  return (
    <>
      <ViewTracker slug={slug} design="switcher" />
      <DemoSwitcherClient
        slug={slug}
        clinicName={clinicName}
        doctorName={doctorName}
        isExpired={isExpired}
      />
    </>
  );
}
