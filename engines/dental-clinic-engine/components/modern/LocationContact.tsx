'use client';

import SharedLocation from "@/components/shared/SharedLocation";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function LocationContact({ siteConfig }: { siteConfig: ModernViewModel }) {
  return <SharedLocation siteConfig={siteConfig} theme="modern" />;
}
