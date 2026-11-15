"use client";
import React, { useState, useMemo } from 'react';
import { 
  Check, 
  ArrowRight, 
  Users,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PackageItem, EventType } from '../types';
import { resolveEventTypeLabels } from './ServicesSection';

interface PackagesSectionProps {
  packages?: PackageItem[];
  eventTypes?: EventType[];
  onSelectPackage: (pkg: PackageItem) => void;
}

const INITIAL_VISIBLE_INCLUSIONS = 5;

export const PackagesSection: React.FC<PackagesSectionProps> = ({ 
  packages = [],
  eventTypes = [],
  onSelectPackage 
}) => {
  const [expandedPackageIds, setExpandedPackageIds] = useState<Record<string, boolean>>({});

  const activePackages = useMemo(
    () => packages.filter((p) => p.isActive !== false),
    [packages]
  );

  const activeEventTypes = useMemo(
    () => eventTypes.filter((et) => et.isActive !== false),
    [eventTypes]
  );

  const toggleExpandInclusions = (pkgId: string) => {
    setExpandedPackageIds((prev) => ({
      ...prev,
      [pkgId]: !prev[pkgId],
    }));
  };

  // Adapt desktop columns to package count while keeping tablets/iPads at 2 columns
  const gridColsClass =
    activePackages.length === 3
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

  return (
    <section id="packages" className="scroll-mt-24 py-16 sm:py-24 lg:py-28 bg-slate-50/90 border-t border-slate-200/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 mb-12 sm:mb-16">
          <Badge
            variant="secondary"
            className="bg-blue-50 text-[#1E3A8A] border border-blue-200/80 px-3 py-0.5 text-xs font-bold uppercase tracking-wider"
          >
            Bundled Event Packages
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1E3A8A]">
            Choose the Right Package
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-normal leading-relaxed">
            Complete bundled event solutions with coordinated staging, technical production, and dedicated on-site crews. Customize any package or add extra services during your inquiry.
          </p>
        </div>

        {/* Packages Cards Grid */}
        <div className={`grid ${gridColsClass} gap-6 lg:gap-7 items-stretch`}>
          {activePackages.map((pkg) => {
            const isPopular = pkg.isPopular === true;
            const isExpanded = Boolean(expandedPackageIds[pkg.id]);
            const compatibleLabels = resolveEventTypeLabels(
              pkg.eventTypes,
              activeEventTypes
            );

            const allItems = Array.from(
              new Set([
                ...(Array.isArray(pkg.inclusions) ? pkg.inclusions : []),
                ...(Array.isArray(pkg.features) ? pkg.features : []),
              ].filter(Boolean))
            );

            const visibleItems = isExpanded
              ? allItems
              : allItems.slice(0, INITIAL_VISIBLE_INCLUSIONS);
            const hiddenCount = Math.max(0, allItems.length - INITIAL_VISIBLE_INCLUSIONS);

            return (
              <Card
                key={pkg.id}
                className={`relative rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 bg-white ${
                  isPopular
                    ? 'border-2 border-[#1E3A8A] shadow-md ring-2 ring-[#1E3A8A]/10'
                    : 'border border-slate-200/90 shadow-xs hover:border-blue-200 hover:shadow-md'
                }`}
              >
                {/* Popular Package Top Ribbon Badge */}
                {isPopular && (
                  <div className="mb-3 flex items-center justify-between gap-2 pb-2.5 border-b border-blue-100">
                    <Badge className="bg-orange-600 hover:bg-orange-600 text-white border-none text-[11px] font-bold px-2.5 py-0.5 gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span>Most Popular Choice</span>
                    </Badge>
                    <span className="text-[11px] font-bold text-[#1E3A8A]">
                      Recommended Tier
                    </span>
                  </div>
                )}

                <div className="space-y-4 flex-1">
                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                      {pkg.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-normal mt-1 leading-relaxed">
                      {pkg.tagline || 'All-inclusive event production'}
                    </p>
                  </div>

                  {/* Guest Capacity & Ideal For Metadata */}
                  <div className="space-y-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="gap-1.5 py-1 px-2.5 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        <Users className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                        <span>{pkg.capacity || '50 - 200 Guests'}</span>
                      </Badge>
                    </div>

                    {/* Ideal For Description */}
                    {pkg.idealFor && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 leading-snug">
                        <span className="font-bold text-slate-800">Best For: </span>
                        <span>{pkg.idealFor}</span>
                      </div>
                    )}

                    {/* Compatible Event Types Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                      {compatibleLabels.length === 0 ? (
                        <span className="text-[11px] font-semibold text-[#1E3A8A]">
                          Compatible with All Event Types
                        </span>
                      ) : (
                        compatibleLabels.map((label) => (
                          <Badge
                            key={label}
                            variant="secondary"
                            className="text-[10px] bg-blue-50 text-[#1E3A8A] border border-blue-200/80 px-2 py-0"
                          >
                            {label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Confidential Quotation Notice */}
                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                    <div className="text-xs sm:text-sm font-extrabold text-[#1E3A8A]">
                      Custom Package Quotation
                    </div>
                    <span className="text-[11px] text-slate-600 block mt-0.5 font-medium">
                      Tailored all-inclusive rate prepared upon inquiry
                    </span>
                  </div>

                  {/* Inclusions & Features List with Expand Toggle */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Included Highlights ({allItems.length}):
                      </span>
                    </div>

                    <div className="space-y-2">
                      {visibleItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-700 font-medium"
                        >
                          <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-[#1E3A8A] shrink-0 mt-0.5 border border-blue-200/80">
                            <Check className="w-2.5 h-2.5 text-[#1E3A8A]" />
                          </div>
                          <span className="leading-snug text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpandInclusions(pkg.id)}
                        aria-expanded={isExpanded}
                        className="pt-1 inline-flex items-center gap-1 text-xs font-bold text-[#1E3A8A] hover:underline cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show fewer inclusions</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Show all {allItems.length} inclusions (+{hiddenCount} more)</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Package CTA */}
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <Button
                    id={`select-package-${pkg.id}`}
                    variant={isPopular ? 'brand' : 'default'}
                    size="lg"
                    onClick={() => onSelectPackage(pkg)}
                    className={`w-full min-h-11 font-bold group ${
                      isPopular
                        ? 'bg-[#1E3A8A] hover:bg-blue-900 text-white shadow-sm'
                        : 'bg-blue-50 text-[#1E3A8A] border border-blue-200 hover:bg-[#1E3A8A] hover:text-white'
                    }`}
                  >
                    <span>Select Package</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
