import React from 'react';
import { 
  Calendar, 
  FileText, 
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeroProps {
  onExploreServices: () => void;
  onSubmitInquiry: () => void;
  onCheckAvailability: () => void;
}

const FaHandPointerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <i className={`fa-solid fa-hand-pointer ${className || ''}`} aria-hidden="true"></i>
);

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Select Event & Services',
    desc: 'Choose your event type, a bundled package, individual services, or both.',
    icon: FaHandPointerIcon,
  },
  {
    step: '02',
    title: 'Receive Official Quotation',
    desc: 'Review your tailored, itemized quotation prepared by our admin team.',
    icon: FileText,
  },
  {
    step: '03',
    title: 'Accept Quotation & Pay 50% Downpayment',
    desc: 'Accept your quotation and submit 50% downpayment proof for verification.',
    icon: ShieldCheck,
  },
  {
    step: '04',
    title: 'Booking Confirmation & Event Preparation',
    desc: 'Receive official booking confirmation after verification and begin event preparation.',
    icon: CheckCircle2,
  },
];

export const Hero: React.FC<HeroProps> = ({
  onExploreServices,
  onSubmitInquiry,
  onCheckAvailability
}) => {
  return (
    <section
      id="hero"
      className="scroll-mt-24 relative pt-24 sm:pt-32 lg:pt-36 pb-14 sm:pb-20 lg:pb-24 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Centered Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center justify-center">
            <Badge
              variant="secondary"
              className="bg-blue-50 text-[#1E3A8A] border border-blue-200/80 px-3.5 py-1 text-xs font-bold tracking-wide shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" aria-hidden="true"></span>
              JAD Events • Full-Service Event Production & Management
            </Badge>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl 2xsm:text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.12] sm:leading-[1.08]">
            We Plan.{' '}
            <span className="text-[#1E3A8A]">
              You Celebrate.
            </span>
          </h1>

          {/* Subtitle / Description */}
          <p className="text-sm sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Plan and manage your celebration through one convenient web-based platform. Customize packages or individual services, receive an official quotation, submit your 50% downpayment for verification, and track your confirmed booking online.
          </p>

          {/* Call to Action Buttons — Clear Primary, Secondary, Tertiary Hierarchy */}
          <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-3.5">
            {/* Primary Action: Submit an Inquiry */}
            <Button
              id="hero-inquiry-btn"
              variant="brand"
              size="lg"
              onClick={onSubmitInquiry}
              className="w-full sm:w-auto min-h-11 px-6 font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white shadow-md group"
            >
              <FileText className="w-4 h-4 text-orange-400" />
              <span>Submit an Inquiry</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 motion-reduce:transform-none transition-transform" />
            </Button>

            {/* Secondary Action: Explore Services */}
            <Button
              id="hero-explore-btn"
              variant="secondary"
              size="lg"
              onClick={onExploreServices}
              className="w-full sm:w-auto min-h-11 px-5 font-bold bg-blue-50 text-[#1E3A8A] border border-blue-200 hover:bg-blue-100"
            >
              <Layers className="w-4 h-4 text-[#1E3A8A]" />
              <span>Explore Services</span>
            </Button>

            {/* Tertiary Action: Check Availability */}
            <Button
              id="hero-availability-btn"
              variant="outline"
              size="lg"
              onClick={onCheckAvailability}
              className="w-full sm:w-auto min-h-11 px-5 font-semibold border-slate-200 bg-white text-slate-700 hover:text-[#1E3A8A] hover:border-blue-200 hover:bg-slate-50"
            >
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>Check Availability</span>
            </Button>
          </div>
        </div>

        {/* Hero Visual Showcase + Transaction Workflow Strip */}
        <div className="mt-10 sm:mt-14 relative max-w-6xl mx-auto space-y-4 sm:space-y-5">
          {/* Main Visual Frame */}
          <div className="relative rounded-xl overflow-hidden bg-white shadow-md border border-slate-200/90 p-2 sm:p-3">
            <div className="relative h-[230px] 2xsm:h-[260px] sm:h-[380px] lg:h-[460px] w-full rounded-lg overflow-hidden bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80"
                alt="JAD Events Stage and Lighting Production"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent"></div>

              {/* Bottom Caption Bar inside Hero Showcase */}
              <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-6 right-3 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-white">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-300 block">
                    Weddings • Debuts • Milestones • Corporate Galas
                  </span>
                  <p className="text-sm sm:text-lg font-extrabold text-white leading-snug">
                    Tailored Event Production & End-to-End Online Coordination
                  </p>
                </div>
                <Badge className="self-start sm:self-auto bg-white/95 text-[#1E3A8A] font-bold text-[11px] px-3 py-1 shadow-sm border-none">
                  Custom Quotation Workflow
                </Badge>
              </div>
            </div>
          </div>

          {/* 4-Step Transaction Workflow Strip */}
          <div
            aria-label="JAD Events Booking Workflow"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {WORKFLOW_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-blue-100 text-[#1E3A8A] flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon className="w-4 h-4 text-[#1E3A8A]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
                        Step {item.step}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-snug mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
