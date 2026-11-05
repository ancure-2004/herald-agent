import { getClinic, getAllClinicSlugs } from '@/lib/get-clinic';
import ViewTracker from '@/components/ViewTracker';
export const dynamicParams = true;
export async function generateStaticParams() {
  const slugs = await getAllClinicSlugs();
  return slugs.map((slug) => ({ slug }));
}
import Navbar from "@/components/premium/Navbar";
import EditorialAestheticHero from "@/components/premium/EditorialAestheticHero";
import ReviewWall from "@/components/premium/ReviewWall";
import Services from "@/components/premium/Services";
import DoctorProfile from "@/components/premium/DoctorProfile";
import ParkViewSanctuary from "@/components/premium/ParkViewSanctuary";
import InteractiveScheduler from "@/components/premium/InteractiveScheduler";
import AestheticFAQ from "@/components/premium/AestheticFAQ";
import LocationContact from "@/components/premium/LocationContact";
import Footer from "@/components/premium/Footer";
import StickyMobileBar from "@/components/premium/StickyMobileBar";


export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const siteConfig = await getClinic(slug, 'premium');

  return (
    <main className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-amber-600 selection:text-white">
      <ViewTracker slug={slug} design="premium" />
      <Navbar siteConfig={siteConfig} />
      <EditorialAestheticHero siteConfig={siteConfig} />
      <ReviewWall siteConfig={siteConfig} />
      <Services siteConfig={siteConfig} />
      <DoctorProfile siteConfig={siteConfig} />
      <ParkViewSanctuary siteConfig={siteConfig} />
      <InteractiveScheduler siteConfig={siteConfig} />
      <AestheticFAQ siteConfig={siteConfig} />
      <LocationContact siteConfig={siteConfig} />
      <Footer siteConfig={siteConfig} />
      <StickyMobileBar siteConfig={siteConfig} />
    </main>
  );
}
