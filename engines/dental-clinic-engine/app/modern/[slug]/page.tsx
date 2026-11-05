import { getClinic, getAllClinicSlugs } from '@/lib/get-clinic';
import ViewTracker from '@/components/ViewTracker';
export const dynamicParams = true;
export async function generateStaticParams() {
  const slugs = await getAllClinicSlugs();
  return slugs.map((slug) => ({ slug }));
}
import Navbar from "@/components/modern/Navbar";
import StudioEditorialHero from "@/components/modern/StudioEditorialHero";
import AestheticSpectrumGrid from "@/components/modern/AestheticSpectrumGrid";
import ModernWorkflow from "@/components/modern/ModernWorkflow";
import DoctorProfile from "@/components/modern/DoctorProfile";
import InteractiveScheduler from "@/components/modern/InteractiveScheduler";
import AestheticFAQ from "@/components/modern/AestheticFAQ";
import ReviewWall from "@/components/modern/ReviewWall";
import LocationContact from "@/components/modern/LocationContact";
import Footer from "@/components/modern/Footer";
import StickyMobileBar from "@/components/modern/StickyMobileBar";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const siteConfig = await getClinic(slug, 'modern');

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <ViewTracker slug={slug} design="modern" />
      <Navbar siteConfig={siteConfig} />
      <StudioEditorialHero siteConfig={siteConfig} />
      <div id="services">
        <AestheticSpectrumGrid siteConfig={siteConfig} />
      </div>
      <ModernWorkflow siteConfig={siteConfig} />
      <DoctorProfile siteConfig={siteConfig} />
      <InteractiveScheduler siteConfig={siteConfig} />
      <AestheticFAQ siteConfig={siteConfig} />
      <ReviewWall siteConfig={siteConfig} />
      <LocationContact siteConfig={siteConfig} />
      <Footer siteConfig={siteConfig} />
      <StickyMobileBar siteConfig={siteConfig} />
    </main>
  );
}
