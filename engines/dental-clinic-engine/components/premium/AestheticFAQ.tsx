'use client';

import SharedFaq from "@/components/shared/SharedFaq";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function AestheticFAQ({ siteConfig }: { siteConfig: PremiumViewModel }) {
  return <SharedFaq siteConfig={siteConfig} theme="premium" />;
}
