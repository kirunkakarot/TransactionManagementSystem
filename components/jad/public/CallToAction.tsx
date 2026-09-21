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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-md p-8 sm:p-14 lg:p-16 bg-[#1E3A8A] border border-[#1e3a8a] shadow-sm text-center flex flex-col items-center overflow-hidden">

          {/* Badge */}
          <Badge className="bg-white/10 text-white border-white/20 mb-6 py-1.5 px-4 text-xs font-bold tracking-wider backdrop-blur-md hover:bg-white/15">
            START YOUR 2026 EVENT PLANNING
          </Badge>

          {/* Heading */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6 max-w-2xl">
            Ready to Plan{' '}
            <span className="text-blue-200">
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
              size="lg"
              onClick={onSubmitInquiry}
              className="w-full sm:w-auto font-bold group shadow-sm bg-orange-600 hover:bg-orange-700"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Submit an Inquiry</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
            </Button>

            <Button
              id="cta-create-account-btn"
              variant="outline"
              size="lg"
              onClick={onOpenSignUp}
              className="w-full sm:w-auto font-semibold text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/30 backdrop-blur-xl"
            >
              <UserPlus className="w-4 h-4 text-blue-200" />
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

