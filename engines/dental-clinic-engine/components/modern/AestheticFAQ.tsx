'use client';

import SharedFaq from "@/components/shared/SharedFaq";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function AestheticFAQ({ siteConfig }: { siteConfig: ModernViewModel }) {
  return <SharedFaq siteConfig={siteConfig} theme="modern" />;
}
