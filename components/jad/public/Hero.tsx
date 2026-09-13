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
    <section id="hero" className="relative pt-28 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[380px] bg-gradient-to-tr from-blue-200/40 via-blue-100/50 to-orange-100/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute -top-24 right-0 w-[450px] h-[450px] bg-blue-300/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Centered Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1E3A8A] leading-[1.1] sm:leading-[1.1]">
            We Plan.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500">
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
              size="pill-lg"
              onClick={onExploreServices}
              className="w-full sm:w-auto font-bold shadow-[0_4px_20px_rgba(30,58,138,0.25)] hover:shadow-[0_6px_25px_rgba(30,58,138,0.4)]"
            >
              <span>Explore Services</span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              id="hero-inquiry-btn"
              variant="brand"
              size="pill-lg"
              onClick={onSubmitInquiry}
              className="w-full sm:w-auto font-bold shadow-[0_4px_20px_rgba(249,115,22,0.35)] hover:shadow-[0_6px_25px_rgba(249,115,22,0.5)]"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Submit an Inquiry</span>
            </Button>

            <Button
              id="hero-availability-btn"
              variant="outline"
              size="pill-lg"
              onClick={onCheckAvailability}
              className="w-full sm:w-auto font-semibold text-[#1E3A8A]"
            >
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>Check Dates</span>
            </Button>
          </div>
        </div>

        {/* Hero Visual Showcase */}
        <div className="mt-12 sm:mt-16 relative max-w-5xl mx-auto">
          {/* Main Visual Frame */}
          <div className="relative rounded-3xl sm:rounded-[36px] overflow-hidden border border-slate-200 bg-white shadow-[0_20px_50px_rgba(30,58,138,0.1)] p-2 sm:p-3">
            <div className="relative h-[280px] sm:h-[400px] lg:h-[480px] w-full rounded-2xl sm:rounded-[28px] overflow-hidden bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
                alt="JAD Events Stage and Lighting Production"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

