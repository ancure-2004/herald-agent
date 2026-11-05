'use client';

import SharedFaq from "@/components/shared/SharedFaq";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function ComfortFAQ({ siteConfig }: { siteConfig: WarmViewModel }) {
  return <SharedFaq siteConfig={siteConfig} theme="warm" />;
}
