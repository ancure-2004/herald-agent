'use client';

import SharedFooter from "@/components/shared/SharedFooter";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function Footer({ siteConfig }: { siteConfig: WarmViewModel }) {
  return <SharedFooter siteConfig={siteConfig} theme="warm" />;
}
