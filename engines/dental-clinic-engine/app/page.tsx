import Link from 'next/link';
import { getAllClinicSlugs } from '@/lib/get-clinic';

export default async function Home() {
  const slugs = await getAllClinicSlugs();
  const slug = slugs[0] || '';

  if (!slug) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-900">
        <div className="max-w-2xl text-center space-y-4">
          <h1 className="text-4xl font-bold">Dental Clinic Engine</h1>
          <p className="text-lg text-slate-600">No clinics found in data/clinics/. Run tsx scripts/add-clinic.ts &lt;slug&gt; to create one.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-900">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold">Dental Clinic Engine</h1>
        <p className="text-xl text-slate-600">Select a template to preview the {slug} clinic.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <Link href={`/modern/${slug}`} className="p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-teal-600">Modern</h2>
            <p className="text-sm text-slate-500">Clinical & Tech-Forward</p>
          </Link>
          
          <Link href={`/premium/${slug}`} className="p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-[#B89768]">Premium</h2>
            <p className="text-sm text-slate-500">Boutique & Restorative</p>
          </Link>

          <Link href={`/warm/${slug}`} className="p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-[#B56576]">Warm</h2>
            <p className="text-sm text-slate-500">Approachable & Family</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
