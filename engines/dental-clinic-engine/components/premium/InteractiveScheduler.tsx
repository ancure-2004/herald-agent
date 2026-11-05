'use client';

import SharedScheduler from "@/components/shared/SharedScheduler";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function InteractiveScheduler({ siteConfig }: { siteConfig: PremiumViewModel }) {
  return <SharedScheduler siteConfig={siteConfig} theme="premium" />;
}
