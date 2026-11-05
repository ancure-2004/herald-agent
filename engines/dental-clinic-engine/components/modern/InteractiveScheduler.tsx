'use client';

import SharedScheduler from "@/components/shared/SharedScheduler";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function InteractiveScheduler({ siteConfig }: { siteConfig: ModernViewModel }) {
  return <SharedScheduler siteConfig={siteConfig} theme="modern" />;
}
