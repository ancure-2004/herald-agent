'use client';

import SharedScheduler from "@/components/shared/SharedScheduler";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function InteractiveScheduler({ siteConfig }: { siteConfig: WarmViewModel }) {
  return <SharedScheduler siteConfig={siteConfig} theme="warm" />;
}
