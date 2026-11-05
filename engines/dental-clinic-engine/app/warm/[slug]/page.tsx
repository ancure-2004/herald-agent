import { getClinic, getAllClinicSlugs } from '@/lib/get-clinic';
import ViewTracker from '@/components/ViewTracker';
export const dynamicParams = true;
export async function generateStaticParams() {
  const slugs = await getAllClinicSlugs();
  return slugs.map((slug) => ({ slug }));
}
import React from "react";
import Navbar from "@/components/warm/Navbar";
import FearFreeHero from "@/components/warm/FearFreeHero";
import ComfortWorkflow from "@/components/warm/ComfortWorkflow";
import DentureComfortComparison from "@/components/warm/DentureComfortComparison";
import CosmeticSuiteGrid from "@/components/warm/CosmeticSuiteGrid";
import DoctorProfile from "@/components/warm/DoctorProfile";
import InteractiveScheduler from "@/components/warm/InteractiveScheduler";
import ComfortFAQ from "@/components/warm/ComfortFAQ";
import ReviewWall from "@/components/warm/ReviewWall";
import LocationContact from "@/components/warm/LocationContact";
import StickyMobileBar from "@/components/warm/StickyMobileBar";
import Footer from "@/components/warm/Footer";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const siteConfig = await getClinic(slug, 'warm');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <ViewTracker slug={slug} design="warm" />
      {/* Sticky Top Header Navigation */}
      <Navbar siteConfig={siteConfig} />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* 1. Gentle Dentistry Hero */}
        <FearFreeHero siteConfig={siteConfig} />

        {/* 2. 4-Phase Comfort Protocol */}
        <ComfortWorkflow siteConfig={siteConfig} />

        {/* 3. Conventional vs. BPS Precision Dentures Comparison */}
        <DentureComfortComparison siteConfig={siteConfig} />

        {/* 4. Cosmetic & Restorative Procedure Suite */}
        <CosmeticSuiteGrid siteConfig={siteConfig} />

        {/* 5. Doctor Spotlight: Lead Dental Surgeon */}
        <DoctorProfile siteConfig={siteConfig} />

        {/* 6. Interactive Morning/Evening Scheduler */}
        <InteractiveScheduler siteConfig={siteConfig} />

        {/* 7. Reassuring Procedure FAQs */}
        <ComfortFAQ siteConfig={siteConfig} />

        {/* 8. Google Patient Ratings & Trust Pillars */}
        <ReviewWall siteConfig={siteConfig} />

        {/* 9. Location & Map */}
        <LocationContact siteConfig={siteConfig} />
      </main>

      {/* Footer */}
      <Footer siteConfig={siteConfig} />

      {/* Mobile Sticky Quick Action Bar */}
      <StickyMobileBar siteConfig={siteConfig} />
    </div>
  );
}
