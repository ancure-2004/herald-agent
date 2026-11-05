'use client';

import SharedLocation from "@/components/shared/SharedLocation";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function LocationContact({ siteConfig }: { siteConfig: PremiumViewModel }) {
  return <SharedLocation siteConfig={siteConfig} theme="premium" />;
}
