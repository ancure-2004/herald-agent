'use client';

import { Star, ExternalLink, CheckCircle2, ShieldCheck } from "lucide-react";
import { ModernViewModel } from "@/lib/adapters/modern";

export default function ReviewWall({ siteConfig }: { siteConfig: ModernViewModel }) {
  if (!siteConfig.rating && !siteConfig.reviewCount && (!siteConfig.trustMetrics || siteConfig.trustMetrics.length === 0)) {
    return null;
  }

  const reviewCountDisplay = siteConfig.reviewCount
    ? (String(siteConfig.reviewCount).endsWith('+') ? siteConfig.reviewCount : siteConfig.reviewCount + '+')
    : '';

  return (
    <section id="reviews" className="py-16 sm:py-24 bg-slateIce-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header with Google Badge */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-charcoal-900">
              Verified Google Reviews • {siteConfig.rating} / 5.0 Rating
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal-900">
            Trusted by {reviewCountDisplay ? `${reviewCountDisplay} ` : ''}Verified Patients
          </h2>
          <p className="text-sm sm:text-base text-charcoal-600 font-light leading-relaxed">
            Verified patient satisfaction and clinical excellence standards at {siteConfig.clinicName} under {siteConfig.doctorName} in {siteConfig.area || ''}.
          </p>
        </div>

        {/* Rating Scorecard Banner */}
        <div className="bg-charcoal-900 text-white rounded-3xl p-6 sm:p-8 border border-gold-500/30 shadow-luxury flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="text-4xl sm:text-5xl font-serif font-bold text-gold-400">
              {siteConfig.rating || "5.0"}
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1 text-gold-400 text-lg">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-gold-400 text-gold-400" />
                ))}
              </div>
              <div className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                Flawless {siteConfig.rating || "5.0"} Rating across {reviewCountDisplay} verified Google patient reviews
              </div>
            </div>
          </div>
          <a
            href={siteConfig.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-sm sm:text-base font-bold text-charcoal-950 bg-gold-400 hover:bg-gold-300 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-normal sm:whitespace-nowrap text-center"
          >
            <span>View All Google Reviews</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Aggregate Trust Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {(siteConfig.trustMetrics || []).map((tm, idx: number) => {
            const isRating = (tm.metric || tm.value || '').includes('★') || (tm.category || '').toLowerCase().includes('satisfaction') || (tm.label || '').toLowerCase().includes('rating');
            return (
              <div
                key={tm.id || idx}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-card-soft hover:shadow-luxury hover:border-gold-400 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3.5">
                  {/* Header with Metric, Stars, & Category Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-serif text-2xl sm:text-3xl font-bold text-gold-600">
                        {tm.metric || tm.value}
                      </div>
                      {isRating && (
                        <div className="flex text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    {(tm.category || tm.label) && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slateIce-100 text-charcoal-800 border border-slate-200">
                        {tm.category || tm.label}
                      </span>
                    )}
                  </div>

                  {/* Highlight Title */}
                  <div className="text-base font-serif font-bold text-charcoal-900 leading-snug">
                    {tm.highlight || tm.label || tm.sub}
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-charcoal-700 font-normal leading-relaxed">
                    {tm.description || tm.sub}
                  </p>
                </div>

                {/* Trust Badge Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <span>Clinical Standard</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{tm.badge || tm.tag || "Verified Patient Feedback"}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

