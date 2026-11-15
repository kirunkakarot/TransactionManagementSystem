import React from 'react';
import {
  ArrowRight,
  UserPlus,
  FileText,
  ShieldCheck,
  User,
  Building2,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CallToActionProps {
  currentUser?: { role: 'client' | 'admin'; email: string } | null;
  onSubmitInquiry: () => void;
  onOpenSignUp: () => void;
  onOpenDashboard?: () => void;
  onCheckAvailability?: () => void;
}

export const CallToAction: React.FC<CallToActionProps> = ({
  currentUser,
  onSubmitInquiry,
  onOpenSignUp,
  onOpenDashboard,
  onCheckAvailability,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isCustomer = currentUser?.role === 'client';

  return (
    <section className="relative py-16 sm:py-24 lg:py-28 overflow-hidden bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl p-7 sm:p-12 lg:p-16 bg-[#1E3A8A] border border-[#1e3a8a] shadow-md text-center flex flex-col items-center overflow-hidden">
          {/* Role-Aware Eyebrow Badge */}
          <Badge className="bg-white/15 text-white border-white/25 mb-5 py-1.5 px-4 text-xs font-bold tracking-wider backdrop-blur-md hover:bg-white/20">
            {isAdmin
              ? 'ADMINISTRATOR OPERATIONS SESSION'
              : isCustomer
              ? 'CUSTOMER PORTAL SESSION ACTIVE'
              : 'START YOUR EVENT PLANNING'}
          </Badge>

          {/* Role-Aware Heading */}
          <h2 className="text-2xl 2xsm:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5 max-w-2xl">
            {isAdmin ? (
              <>
                Manage Inquiries,{' '}
                <span className="text-blue-200">Quotations & Bookings</span>
              </>
            ) : isCustomer ? (
              <>
                Plan Another Event or{' '}
                <span className="text-blue-200">Track Your Booking</span>
              </>
            ) : (
              <>
                Ready to Plan{' '}
                <span className="text-blue-200">Your Event?</span>
              </>
            )}
          </h2>

          {/* Role-Aware Description */}
          <p className="text-sm sm:text-lg text-blue-100 leading-relaxed mb-8 sm:mb-10 max-w-xl font-normal">
            {isAdmin
              ? 'Return to the JAD Events Admin Dashboard to review pending customer inquiries, prepare itemized quotations, verify 50% downpayments, and manage production schedules.'
              : isCustomer
              ? `Signed in as ${currentUser.email}. Submit a new customized event inquiry or open your Customer Portal to review official quotations and payment status.`
              : 'Start your event inquiry and manage your transaction with JAD Events online. Receive an official quotation, submit your 50% downpayment for verification, and confirm your booking.'}
          </p>

          {/* Role-Aware CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none relative z-10">
            {isAdmin ? (
              <>
                <Button
                  id="cta-admin-dashboard-btn"
                  variant="brand"
                  size="lg"
                  onClick={onOpenDashboard}
                  className="w-full sm:w-auto min-h-11 px-6 font-bold group shadow-sm bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Building2 className="w-4 h-4 text-white" />
                  <span>Open Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 motion-reduce:transform-none transition-transform text-white" />
                </Button>

                {onCheckAvailability && (
                  <Button
                    id="cta-admin-availability-btn"
                    variant="outline"
                    size="lg"
                    onClick={onCheckAvailability}
                    className="w-full sm:w-auto min-h-11 px-5 font-semibold text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/30 backdrop-blur-xl"
                  >
                    <Calendar className="w-4 h-4 text-blue-200" />
                    <span>View Availability Matrix</span>
                  </Button>
                )}
              </>
            ) : isCustomer ? (
              <>
                <Button
                  id="cta-submit-inquiry-btn"
                  variant="brand"
                  size="lg"
                  onClick={onSubmitInquiry}
                  className="w-full sm:w-auto min-h-11 px-6 font-bold group shadow-sm bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Submit New Inquiry</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 motion-reduce:transform-none transition-transform text-white" />
                </Button>

                <Button
                  id="cta-customer-portal-btn"
                  variant="outline"
                  size="lg"
                  onClick={onOpenDashboard}
                  className="w-full sm:w-auto min-h-11 px-5 font-semibold text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/30 backdrop-blur-xl"
                >
                  <User className="w-4 h-4 text-blue-200" />
                  <span>Open Customer Portal</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  id="cta-submit-inquiry-btn"
                  variant="brand"
                  size="lg"
                  onClick={onSubmitInquiry}
                  className="w-full sm:w-auto min-h-11 px-6 font-bold group shadow-sm bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Submit an Inquiry</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 motion-reduce:transform-none transition-transform text-white" />
                </Button>

                <Button
                  id="cta-create-account-btn"
                  variant="outline"
                  size="lg"
                  onClick={onOpenSignUp}
                  className="w-full sm:w-auto min-h-11 px-5 font-semibold text-white hover:text-white bg-white/10 hover:bg-white/20 border-white/30 backdrop-blur-xl"
                >
                  <UserPlus className="w-4 h-4 text-blue-200" />
                  <span>Create an Account</span>
                </Button>
              </>
            )}
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-blue-100">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              {isAdmin
                ? 'Centralized inquiry review, quotation builder, and payment verification'
                : 'Official quotation review & verified 50% downpayment booking workflow'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
