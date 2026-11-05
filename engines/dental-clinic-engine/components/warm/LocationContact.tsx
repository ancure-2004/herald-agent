'use client';

import SharedLocation from "@/components/shared/SharedLocation";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function LocationContact({ siteConfig }: { siteConfig: WarmViewModel }) {
  return <SharedLocation siteConfig={siteConfig} theme="warm" />;
}
