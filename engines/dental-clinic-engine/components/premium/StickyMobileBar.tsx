'use client';

import SharedStickyBar from "@/components/shared/SharedStickyBar";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function StickyMobileBar({ siteConfig }: { siteConfig: PremiumViewModel }) {
  return <SharedStickyBar siteConfig={siteConfig} theme="premium" />;
}
