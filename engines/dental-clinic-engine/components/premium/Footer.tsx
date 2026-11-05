'use client';

import SharedFooter from "@/components/shared/SharedFooter";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function Footer({ siteConfig }: { siteConfig: PremiumViewModel }) {
  return <SharedFooter siteConfig={siteConfig} theme="premium" />;
}
