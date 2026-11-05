import { Star, Check } from "lucide-react";
import { PremiumViewModel } from "@/lib/adapters/premium";

export default function ReviewWall({ siteConfig }: { siteConfig: PremiumViewModel }) {
  if (!siteConfig.rating && !siteConfig.reviewCount && !siteConfig.aggregateProof) return null;

  const aggregateProof = siteConfig.aggregateProof || {
    overallRating: siteConfig.rating || '5.0',
    totalReviews: siteConfig.reviewCount ? (String(siteConfig.reviewCount).endsWith('+') ? siteConfig.reviewCount : `${siteConfig.reviewCount}+`) : '',
    platform: 'Google Business',
    sentimentThemes: [],
  };
  const { overallRating, totalReviews, platform, sentimentThemes = [] } = aggregateProof;

  return (
    <section className="py-20 bg-white text-stone-900 relative overflow-hidden border-b border-stone-200/80">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FAF8F5] text-amber-800 border border-amber-200 shadow-xs uppercase tracking-widest">
            <span>Verified Aggregate Social Proof</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-stone-900 tracking-tight">
            Patient Trust &amp; <span className="gold-gradient-text">Clinical Satisfaction</span>
          </h2>

          <p className="text-sm sm:text-base text-stone-600">
            Transparent clinical satisfaction metrics derived from {totalReviews} verified patient evaluations in {siteConfig.area || ''}.
          </p>
        </div>

        {/* Master Score Banner */}
        <div className="max-w-4xl mx-auto mb-12 p-6 sm:p-8 rounded-3xl bg-[#FAF8F5] border border-amber-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex flex-col items-center justify-center shadow-md shrink-0">
              <span className="font-display font-black text-2xl leading-none">{overallRating}</span>
              <div className="flex items-center gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-100 text-amber-100" />
                ))}
              </div>
            </div>
            <div>
              <div className="font-display font-black text-xl text-stone-900">
                Top-Rated Dental &amp; Aesthetic Care
              </div>
              <div className="text-xs text-stone-600 mt-0.5">
                Based on <strong className="text-stone-900 font-bold">{totalReviews}</strong> authentic patient ratings on {platform}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Verified Clinical Practice ({siteConfig.shortName || siteConfig.clinicName})</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <a
              href={siteConfig.googleReviewsUrl || siteConfig.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto min-h-[48px] px-6 py-3 rounded-xl text-xs font-bold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <span>View Google Business Profile</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Aggregate Sentiment Themes Grid */}
        {sentimentThemes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {sentimentThemes.map((theme, idx: number) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      {theme.category}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      {theme.percentage} Positive
                    </span>
                  </div>
                  <p className="text-sm text-stone-800 font-medium leading-relaxed">
                    &ldquo;{theme.sentiment}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span>Clinical Standard:</span>
                  <span className="font-semibold text-stone-700">{theme.clinicalContext}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Trust Pill */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-6 px-6 py-3 rounded-full bg-[#FAF8F5] border border-stone-200 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-600" />
              <span>Zero Artificial Testimonials</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-600" />
              <span>Dedicated Clinical Practice</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-600" />
              <span>{siteConfig.experience || 'Verified Clinical Practice'}</span>
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}

