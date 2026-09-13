import React from 'react';
import { 
  Check, 
  ArrowRight, 
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PackageItem } from '../types';

interface PackagesSectionProps {
  packages?: PackageItem[];
  onSelectPackage: (pkg: PackageItem) => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({ 
  packages = [],
  onSelectPackage 
}) => {
  const activePackages = packages.filter(p => p.isActive !== false);

  return (
    <section id="packages" className="py-20 sm:py-28 bg-slate-50/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1E3A8A]">
            Choose the Right Package
          </h2>

          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Complete bundled solutions with guaranteed technical coordination, catering, and production crews.
          </p>
        </div>

        {/* Packages Cards Grid - Clean White Cards without border highlighting */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
          {activePackages.map((pkg) => {
            return (
              <Card
                key={pkg.id}
                className="relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 bg-white border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.09)] hover:border-slate-300"
              >
                <div className="space-y-4">
                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{pkg.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">{pkg.tagline || 'All-inclusive event production'}</p>
                  </div>

                  {/* Guest Capacity Pill */}
                  <div>
                    <Badge variant="secondary" className="gap-1.5 py-1 px-3 text-xs font-semibold bg-slate-100 text-slate-700 border-slate-200">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                      <span>Capacity: {pkg.capacity || '50 - 200 Guests'}</span>
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-[#1E3A8A]">
                        ₱{(Number(pkg.price) || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">PHP</span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5 font-medium">
                      All-Inclusive Package Rate
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Included Highlights:
                    </span>
                    {(pkg.inclusions && pkg.inclusions.length > 0 ? pkg.inclusions : pkg.features || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                        <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-[#1E3A8A] shrink-0 mt-0.5 border border-blue-100">
                          <Check className="w-3 h-3 text-[#1E3A8A]" />
                        </div>
                        <span className="leading-snug text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  <Button
                    id={`select-package-${pkg.id}`}
                    variant="default"
                    size="pill"
                    onClick={() => onSelectPackage(pkg)}
                    className="w-full font-bold group bg-[#1E3A8A] hover:bg-blue-900 text-white"
                  >
                    <span>Select Package</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-white" />
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
