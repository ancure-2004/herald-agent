'use client';

import SharedStickyBar from "@/components/shared/SharedStickyBar";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function StickyMobileBar({ siteConfig }: { siteConfig: ModernViewModel }) {
  return <SharedStickyBar siteConfig={siteConfig} theme="modern" />;
}
