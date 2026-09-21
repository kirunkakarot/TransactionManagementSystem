import React from 'react';
import { 
  Calendar, 
  FileText, 
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onExploreServices: () => void;
  onSubmitInquiry: () => void;
  onCheckAvailability: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreServices,
  onSubmitInquiry,
  onCheckAvailability
}) => {
  return (
    <section id="hero" className="relative pt-28 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 overflow-hidden bg-white">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Centered Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] sm:leading-[1.1]">
            We Plan.{' '}
            <span className="text-[#1E3A8A]">
              You Celebrate.
            </span>
          </h1>

          {/* Subtitle / Description */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Plan and manage your event through one convenient web-based platform. Transparent quotations, fast downpayment verification, real-time availability, and verified crew dispatch.
          </p>

          {/* Call to Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              id="hero-explore-btn"
              variant="default"
              size="lg"
              onClick={onExploreServices}
              className="w-full sm:w-auto font-bold"
            >
              <span>Explore Services</span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              id="hero-inquiry-btn"
              variant="brand"
              size="lg"
              onClick={onSubmitInquiry}
              className="w-full sm:w-auto font-bold"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Submit an Inquiry</span>
            </Button>

            <Button
              id="hero-availability-btn"
              variant="outline"
              size="lg"
              onClick={onCheckAvailability}
              className="w-full sm:w-auto font-semibold"
            >
              <Calendar className="w-4 h-4 text-[#1E3A8A]" />
              <span>Check Dates</span>
            </Button>
          </div>
        </div>

        {/* Hero Visual Showcase */}
        <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
          {/* Main Visual Frame */}
          <div className="relative rounded-md overflow-hidden bg-white shadow-sm border border-slate-200 p-2 sm:p-3">
            <div className="relative h-[280px] sm:h-[400px] lg:h-[480px] w-full rounded-sm overflow-hidden bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
                alt="JAD Events Stage and Lighting Production"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-slate-900/10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

