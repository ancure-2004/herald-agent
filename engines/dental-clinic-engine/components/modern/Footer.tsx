'use client';

import SharedFooter from "@/components/shared/SharedFooter";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function Footer({ siteConfig }: { siteConfig: ModernViewModel }) {
  return <SharedFooter siteConfig={siteConfig} theme="modern" />;
}
