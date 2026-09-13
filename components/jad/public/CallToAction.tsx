import React from 'react';
import { ArrowRight, UserPlus, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CallToActionProps {
  onSubmitInquiry: () => void;
  onOpenSignUp: () => void;
}

export const CallToAction: React.FC<CallToActionProps> = ({
  onSubmitInquiry,
  onOpenSignUp
}) => {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-white">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] sm:w-[950px] h-[350px] sm:h-[450px] bg-gradient-to-r from-blue-200/50 via-orange-100/40 to-blue-100/50 rounded-full blur-[140px] pointer-events-none -z-10"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[36px] p-8 sm:p-14 lg:p-16 bg-[#1E3A8A] border border-blue-800 shadow-[0_20px_50px_rgba(30,58,138,0.25)] text-center flex flex-col items-center overflow-hidden">
          {/* Subtle decorative shapes inside banner */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Badge */}
          <Badge className="bg-white/10 text-white border-white/20 mb-6 py-1.5 px-4 text-xs font-bold tracking-wider backdrop-blur-md hover:bg-white/15">
            START YOUR 2026 EVENT PLANNING
          </Badge>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6 max-w-2xl">
            Ready to Plan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-amber-300">
              Your Event?
            </span>
          </h2>

          {/* Description */}
          <p className="text-base sm:text-lg text-blue-100 leading-relaxed mb-10 max-w-xl font-normal">
            Start your event inquiry and manage your transaction with JAD Events online. Fast quotes, verified supplier crews, and zero hidden charges.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md sm:max-w-none relative z-10">
            <Button
              id="cta-submit-inquiry-btn"
              variant="brand"
              size="pill-lg"
              onClick={onSubmitInquiry}
              className="w-full sm:w-auto font-bold group shadow-[0_4px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_6px_28px_rgba(249,115,22,0.6)]"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Submit an Inquiry</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
            </Button>

            <Button
              id="cta-create-account-btn"
              variant="outline"
              size="pill-lg"
              onClick={onOpenSignUp}
              className="w-full sm:w-auto font-semibold text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/30 backdrop-blur-xl"
            >
              <UserPlus className="w-4 h-4 text-orange-400" />
              <span>Create an Account</span>
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-blue-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Instant confirmation voucher & guaranteed calendar reservation</span>
          </div>
        </div>
      </div>
    </section>
  );
};

