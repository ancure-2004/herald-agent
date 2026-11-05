'use client';

import SharedStickyBar from "@/components/shared/SharedStickyBar";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function StickyMobileBar({ siteConfig }: { siteConfig: WarmViewModel }) {
  return <SharedStickyBar siteConfig={siteConfig} theme="warm" />;
}
