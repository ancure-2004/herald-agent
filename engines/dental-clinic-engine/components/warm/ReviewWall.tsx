import React from "react";
import { Star, Check, ExternalLink } from "lucide-react";
import { WarmViewModel } from "@/lib/adapters/warm";

export default function ReviewWall({ siteConfig }: { siteConfig: WarmViewModel }) {
  if (!siteConfig.rating && !siteConfig.reviewCount && !siteConfig.trustPillars?.length) return null;

  const reviewCountDisplay = siteConfig.reviewCount
    ? String(siteConfig.reviewCount).endsWith('+') ? siteConfig.reviewCount : `${siteConfig.reviewCount}+`
    : '';

  return (
    <section id="reviews" className="py-16 sm:py-24 bg-gradient-to-b from-rose-50/50 via-white to-cream-50 border-t border-b border-rose-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-900 text-xs sm:text-sm font-bold border border-amber-200">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{siteConfig.rating || '5.0'} / 5.0 Google Verified Ratings</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-plum-950 tracking-tight">
            Verified Trust Pillars &amp; <span className="italic text-rose-600">Patient Standards</span>
          </h2>
          <p className="text-base text-slate-600">
            Backed by {reviewCountDisplay ? `${reviewCountDisplay} authentic Google reviews, ` : ''}transparent consultation pricing, and modern sterilization protocols in {siteConfig.area || ''}.
          </p>

          {/* Aggregate Rating Badge */}
          <div className="inline-flex items-center gap-3 p-3 bg-white rounded-2xl border border-rose-200 shadow-md mt-2">
            <div className="flex text-amber-400 gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-bold text-plum-950">{siteConfig.rating || '5.0'} / 5.0 Rating</span>
            <span className="text-xs text-slate-400">•</span>
            <a
              href={siteConfig.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-rose-700 hover:underline inline-flex items-center gap-1"
            >
              <span>View Google Maps reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 6 Trust Pillar Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(siteConfig.trustPillars || []).map((pillar, idx: number) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-rose-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 relative"
            >
              {/* Top Row: Metric, Tag & Category */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-base sm:text-lg text-plum-950">
                    {pillar.title}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {pillar.tag}
                  </span>
                </div>

                <p className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg inline-block">
                  {pillar.highlight}
                </p>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              {/* Bottom Row: Verification Badge */}
              <div className="pt-4 border-t border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-emerald-700" />
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Verified Standard</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-plum-900 bg-plum-50 px-2.5 py-1 rounded-lg border border-plum-100">
                    {pillar.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

