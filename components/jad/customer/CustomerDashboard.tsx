"use client";
import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Calendar, 
  CreditCard, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  User, 
  ArrowLeft, 
  LogOut, 
  LayoutDashboard,
  Compass, 
  MapPin, 
  Printer, 
  FileText, 
  PlusCircle,
  Settings,
  Eye,
  Check,
  ChevronRight,
  AlertTriangle,
  Upload,
  CalendarCheck,
  Users,
  ExternalLink,
  Info,
  Shield,
  Layers,
  FileCheck,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Quotation, InquiryFormData, PaymentTransaction, Booking, Feedback } from '../types';
import { CustomerInquiryDetailModal } from './CustomerInquiryDetailModal';
import { SubmitPaymentProofModal } from './SubmitPaymentProofModal';
import { CustomerFeedbackModal } from './CustomerFeedbackModal';
import { acceptQuotationApi, cancelInquiryApi } from '@/services/api';
import Cookies from 'js-cookie';

interface CustomerDashboardProps {
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  quotation: Quotation | null;
  inquiry: InquiryFormData | null;
  quotations?: Quotation[];
  inquiries?: InquiryFormData[];
  payments?: PaymentTransaction[];
  bookings?: Booking[];
  booking?: Booking | null;
  onNavigateHome: () => void;
  onLogout: () => void;
  onSwitchToAdmin: () => void;
  onPayDownpayment?: (quotationId: string) => void;
  onManageProfile?: () => void;
  onRefreshData?: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  userEmail,
  userName,
  userAvatar,
  quotation: initialQuotation,
  inquiry: initialInquiry,
  quotations = [],
  inquiries = [],
  payments = [],
  bookings = [],
  booking = null,
  onNavigateHome,
  onLogout,
  onSwitchToAdmin,
  onPayDownpayment,
  onManageProfile,
  onRefreshData,
}) => {
  const [quotation, setQuotation] = useState<Quotation | null>(initialQuotation);
  const [currentInquiry, setCurrentInquiry] = useState<InquiryFormData | null>(initialInquiry);
  const [activeTab, setActiveTab] = useState<'overview' | 'inquiries' | 'quotation' | 'payments' | 'booking'>('overview');
  const [isAccepting, setIsAccepting] = useState(false);

  // Inquiry Detail Modal state
  const [isInquiryDetailModalOpen, setIsInquiryDetailModalOpen] = useState(false);
  const [selectedInquiryForDetails, setSelectedInquiryForDetails] = useState<InquiryFormData | null>(null);

  // Submit Payment Proof Modal state
  const [isSubmitPaymentModalOpen, setIsSubmitPaymentModalOpen] = useState(false);

  // Customer Feedback Modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Sync state with incoming props
  useEffect(() => {
    setQuotation(initialQuotation);
  }, [initialQuotation]);

  useEffect(() => {
    setCurrentInquiry(initialInquiry);
  }, [initialInquiry]);

  // Multi-reservation sync: selected inquiry ID or null
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  // 1. Resolve Active Inquiry (selected or latest)
  const activeInquiry: InquiryFormData | null = 
    (selectedInquiryId ? inquiries.find(i => i.id === selectedInquiryId || i.dbId?.toString() === selectedInquiryId) : null) ||
    currentInquiry ||
    (inquiries.length > 0 ? inquiries[0] : null);

  // 2. Resolve Active Quotation linked to this specific inquiry (or initial quotation)
  const activeQuotation: Quotation | null = 
    (activeInquiry ? quotations.find(q => 
      q.inquiryId === activeInquiry.id || 
      (activeInquiry.dbId && q.inquiryId === activeInquiry.dbId.toString())
    ) : null) ||
    quotation ||
    (quotations.length > 0 && !activeInquiry ? quotations[0] : null);

  // 3. Resolve Active Booking linked to this inquiry or quotation (or initial booking)
  const activeBooking: Booking | null = 
    (activeInquiry ? bookings.find(b => 
      b.inquiryId === activeInquiry.id || 
      (activeInquiry.dbId && b.inquiryId === activeInquiry.dbId.toString())
    ) : null) ||
    (activeQuotation ? bookings.find(b => 
      b.quotationId === activeQuotation.id || 
      (activeQuotation.dbId && b.quotationId === activeQuotation.dbId.toString())
    ) : null) ||
    booking ||
    (bookings.length > 0 && !activeInquiry && !activeQuotation ? bookings[0] : null);

  // 4. Effective quotation for display
  const effectiveQuotation: Quotation | null = activeQuotation || (activeBooking ? ({
    id: activeBooking.quotationId || activeBooking.id,
    dbId: activeBooking.dbId,
    inquiryId: activeBooking.inquiryId,
    clientName: activeBooking.clientName,
    clientEmail: activeBooking.clientEmail,
    clientPhone: activeBooking.clientPhone || '',
    eventType: activeBooking.eventType,
    eventDate: activeBooking.eventDate,
    venue: activeBooking.venue,
    guestCount: activeBooking.guestCount,
    items: [],
    subtotal: activeBooking.totalAmount,
    discounts: [],
    additionalCharges: [],
    grandTotal: activeBooking.totalAmount,
    requiredDownpayment: activeBooking.totalAmount * 0.5,
    validUntil: activeBooking.eventDate,
    validityDays: 14,
    status: activeBooking.status === 'Completed' ? 'Confirmed' : (activeBooking.status as any),
    notes: activeBooking.notes || '',
    terms: ['Official Booking Agreement', 'Audio-Visual Technical Team Scheduled'],
    createdAt: activeBooking.eventDate,
  } as unknown as Quotation) : null);

  const displayName = userName || effectiveQuotation?.clientName || activeBooking?.clientName || activeInquiry?.fullName || (userEmail ? userEmail.split('@')[0] : '') || 'Client';

  const contractTotal = activeBooking 
    ? Number(activeBooking.totalAmount) 
    : effectiveQuotation 
    ? Number(effectiveQuotation.grandTotal) 
    : 0;

  // Filter payments related strictly to this active booking / quotation / inquiry
  const activePayments = payments.filter(p => {
    if (activeBooking) {
      if (p.bookingId === activeBooking.id || (activeBooking.dbId && p.bookingId === activeBooking.dbId.toString())) return true;
      if (activeBooking.id && (p.referenceNumber?.includes(activeBooking.id) || p.notes?.includes(activeBooking.id))) return true;
    }
    if (effectiveQuotation) {
      if (p.quotationId === effectiveQuotation.id || (effectiveQuotation.dbId && p.quotationId === effectiveQuotation.dbId.toString())) return true;
      if (effectiveQuotation.id && (p.referenceNumber?.includes(effectiveQuotation.id) || p.notes?.includes(effectiveQuotation.id))) return true;
    }
    if (activeInquiry && activeInquiry.email && p.clientEmail && p.clientEmail.toLowerCase() === activeInquiry.email.toLowerCase()) {
      return true;
    }
    return false;
  });

  const verifiedPayments = activePayments.filter(p => p.verified);
  const totalVerifiedPaid = verifiedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingPayment = activePayments.find(p => !p.verified && p.status === 'Pending Verification');
  const rejectedPayment = activePayments.find(p => !p.verified && p.status === 'Rejected');

  const hasFullSettlement = verifiedPayments.some(p => p.type === 'Full Settlement');
  const isFullyPaid = (totalVerifiedPaid >= contractTotal && contractTotal > 0) || hasFullSettlement;
  const isCompleted = activeBooking?.status === 'Completed' || (effectiveQuotation?.status as string) === 'Completed';
  const isInProgress = activeBooking?.status === 'In Progress';
  const isConfirmed = Boolean(activeBooking && (activeBooking.status === 'Confirmed' || isCompleted || isInProgress));
  const isDepositPaid = isFullyPaid || effectiveQuotation?.status === 'Deposit Paid' || verifiedPayments.length > 0;
  const isQuotationSent = effectiveQuotation?.status === 'Quotation Sent';
  const isAccepted = effectiveQuotation?.status === 'Accepted' || isDepositPaid || isConfirmed;

  const remainingBalanceAmount = isFullyPaid ? 0 : Math.max(0, contractTotal - totalVerifiedPaid);
  const paymentPercentage = contractTotal > 0 
    ? Math.min(100, Math.round((totalVerifiedPaid / contractTotal) * 100)) 
    : (isFullyPaid ? 100 : isDepositPaid ? 50 : 0);

  // Determine current reservation journey milestone (1 to 5) strictly for this active chain
  const currentStep = isConfirmed
    ? 5
    : (isDepositPaid || pendingPayment)
    ? 4
    : isAccepted
    ? 3
    : effectiveQuotation
    ? 2
    : activeInquiry
    ? 1
    : 0;

  const reservationSteps = [
    {
      step: 1,
      title: 'Inquiry Submitted',
      description: activeInquiry?.id 
        ? `Ref #${activeInquiry.id}` 
        : activeInquiry?.dbId 
        ? `Ref #${activeInquiry.dbId}` 
        : 'Pending',
      status: currentStep >= 1 ? (currentStep === 1 ? 'active' : 'completed') : 'pending',
      icon: FileText
    },
    {
      step: 2,
      title: 'Quotation Sent',
      description: effectiveQuotation?.id 
        ? `Ref #${effectiveQuotation.id}` 
        : 'Pending',
      status: currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : 'pending',
      icon: Receipt
    },
    {
      step: 3,
      title: 'Accepted',
      description: isAccepted 
        ? 'Accepted' 
        : currentStep === 2 
        ? 'Awaiting Acceptance' 
        : 'Pending',
      status: currentStep >= 3 ? (currentStep === 3 ? 'active' : 'completed') : 'pending',
      icon: CheckCircle2
    },
    {
      step: 4,
      title: 'Payment Verification',
      description: isDepositPaid 
        ? 'Verified' 
        : pendingPayment 
        ? 'Verification Pending' 
        : currentStep === 3 
        ? 'Awaiting Proof' 
        : 'Pending',
      status: currentStep >= 4 ? (currentStep === 4 ? 'active' : 'completed') : 'pending',
      icon: CreditCard
    },
    {
      step: 5,
      title: 'Booking Confirmed',
      description: activeBooking?.id 
        ? `Ref #${activeBooking.id}` 
        : 'Pending',
      status: currentStep >= 5 ? 'completed' : 'pending',
      icon: ShieldCheck
    }
  ];

  const handleOpenInquiryDetails = (inq?: InquiryFormData | null) => {
    const target = inq || activeInquiry || currentInquiry || (inquiries.length > 0 ? inquiries[0] : null);
    if (target) {
      setSelectedInquiryForDetails(target);
      setIsInquiryDetailModalOpen(true);
    }
  };

  const handleCancelInquiry = async (id: string, reason: string) => {
    try {
      const token = Cookies.get('jad_token');
      await cancelInquiryApi(id, reason, token);
      toast.success('Inquiry cancelled successfully');
      if (onRefreshData) onRefreshData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel inquiry');
      throw error;
    }
  };

  const handleAcceptQuotation = async () => {
    const targetQuote = effectiveQuotation || quotation;
    if (!targetQuote) return;
    setIsAccepting(true);
    try {
      const token = localStorage.getItem('jad_token') || Cookies.get('token') || Cookies.get('jad_token') || '';
      await acceptQuotationApi(targetQuote.id, token);
      setQuotation(prev => prev ? ({ ...prev, status: 'Accepted' }) : null);
      if (effectiveQuotation) effectiveQuotation.status = 'Accepted';
      toast.success('Quotation Accepted!', {
        description: 'You can now proceed to upload your 50% reservation downpayment proof to lock your event date.'
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error accepting quotation:', err);
      toast.error('Failed to accept quotation', { description: err.message });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleOpenSubmitPaymentProof = () => {
    if (!quotation && !effectiveQuotation) return;
    setIsSubmitPaymentModalOpen(true);
  };

  const handlePrintQuotation = () => {
    window.print();
  };

  const handleDownloadBookingDetails = () => {
    if (!activeBooking && !effectiveQuotation) return;
    toast.info('Preparing Official Voucher', {
      description: `Reference #${activeBooking?.id || effectiveQuotation?.id} summary document is ready for printing.`
    });
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20">
      {/* ======================================================== */}
      {/* 1. CUSTOMER DASHBOARD HEADER                             */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateHome}
              className="text-slate-600 hover:text-[#1E3A8A] gap-1.5 rounded-xl font-semibold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Website</span>
            </Button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                J
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-[#1E3A8A] tracking-wider leading-tight">
                  JAD EVENTS
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">
                  Customer Portal
                </span>
              </div>
            </div>
          </div>

          {/* User Profile and Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onManageProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManageProfile}
                className="text-xs font-semibold text-slate-700 hover:text-[#1E3A8A] border-slate-200 hover:border-[#1E3A8A] gap-1.5 rounded-xl h-8 px-3 bg-white shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline">Manage Profile</span>
              </Button>
            )}

            <div 
              onClick={onManageProfile}
              className={`flex items-center gap-2 py-1 pl-2.5 pr-1 rounded-full bg-slate-100/90 border border-slate-200/80 ${onManageProfile ? 'cursor-pointer hover:bg-slate-200/80 transition-colors' : ''}`}
              title={onManageProfile ? 'Manage Profile Settings' : undefined}
            >
              <span className="text-xs font-semibold text-slate-700 hidden md:inline truncate max-w-[130px]">
                {displayName}
              </span>
              <Avatar className="w-7 h-7 border border-slate-200">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-blue-50 text-[#1E3A8A] text-xs font-extrabold">
                  {displayName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-500 hover:text-red-600 rounded-xl h-8 w-8 p-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN DASHBOARD WORKSPACE                              */}
      {/* ======================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        
        {/* Welcome & Context Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-[#1E3A8A]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track your event reservation progress, quotation approvals, payments, and event details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant={isCompleted ? 'success' : isConfirmed ? 'success' : isDepositPaid ? 'blue' : isAccepted ? 'blue' : effectiveQuotation ? 'warning' : 'secondary'} 
              className="text-xs py-1 px-3 gap-1.5 font-bold shadow-2xs"
            >
              <span className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-blue-600'} animate-pulse`}></span>
              Status: {activeBooking ? activeBooking.status : (effectiveQuotation ? effectiveQuotation.status : currentInquiry ? currentInquiry.status : 'Active Client')}
            </Badge>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. RESERVATION PROGRESS STEPPER                          */}
        {/* ======================================================== */}
        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5 sm:p-6 overflow-hidden">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Reservation Journey Progress
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentStep === 5 
                  ? 'Your booking is confirmed! Your calendar slot and event crew are locked in.'
                  : currentStep === 4 
                  ? (pendingPayment ? 'Payment proof submitted. Awaiting administrator verification.' : 'Downpayment verified! Finalizing booking confirmation.')
                  : currentStep === 3 
                  ? 'Quotation accepted. Please submit your 50% reservation downpayment proof.'
                  : currentStep === 2 
                  ? 'Official quotation dispatched. Please review and accept to proceed.'
                  : currentStep === 1 
                  ? 'Inquiry received. Our event directors are preparing your official quotation.'
                  : 'Submit an event inquiry to begin your reservation.'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-[#1E3A8A]">
                {currentStep > 0 ? `Stage ${currentStep} of 5` : 'No Active Reservation'}
              </span>
            </div>
          </div>

          {/* Multiple Reservations Switcher */}
          {inquiries.length > 1 && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Viewing Reservation:
              </span>
              <select
                value={selectedInquiryId || activeInquiry?.id || activeInquiry?.dbId?.toString() || ''}
                onChange={(e) => setSelectedInquiryId(e.target.value)}
                className="text-xs font-bold text-[#1E3A8A] bg-blue-50/80 border border-blue-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:bg-blue-100/70 transition-colors"
              >
                {inquiries.map((inq, idx) => (
                  <option key={inq.id || inq.dbId || idx} value={inq.id || inq.dbId?.toString() || ''}>
                    {inq.eventType} ({inq.eventDate || 'Date TBD'}) — #{inq.id || inq.dbId || idx + 1} ({inq.status || 'Pending'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stepper Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
            {reservationSteps.map((s) => {
              const IconComponent = s.icon;
              const isCompletedStep = s.status === 'completed';
              const isActiveStep = s.status === 'active';

              return (
                <div 
                  key={s.step} 
                  className={`relative flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 p-3 rounded-xl border transition-all ${
                    isCompletedStep
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : isActiveStep
                      ? 'bg-blue-50/60 border-blue-200 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-slate-50/60 border-slate-200/60 opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCompletedStep 
                        ? 'bg-emerald-600 text-white' 
                        : isActiveStep 
                        ? 'bg-[#1E3A8A] text-white' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isCompletedStep ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{s.step}</span>
                      )}
                    </div>

                    <div className="hidden sm:block">
                      <IconComponent className={`w-4 h-4 ${
                        isCompletedStep ? 'text-emerald-600' : isActiveStep ? 'text-[#1E3A8A]' : 'text-slate-400'
                      }`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${
                      isCompletedStep ? 'text-emerald-950' : isActiveStep ? 'text-[#1E3A8A]' : 'text-slate-700'
                    }`}>
                      {s.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {s.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ======================================================== */}
        {/* 4. DASHBOARD NAVIGATION TABS                             */}
        {/* ======================================================== */}
        <div className="flex items-center border-b border-slate-200 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#1E3A8A]" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'inquiries'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>My Inquiries ({inquiries.length > 0 ? inquiries.length : (currentInquiry ? 1 : 0)})</span>
          </button>

          <button
            onClick={() => setActiveTab('quotation')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'quotation'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-orange-500" />
            <span>Official Quotation</span>
            {effectiveQuotation && (
              <Badge variant={isDepositPaid ? 'success' : isAccepted ? 'blue' : 'warning'} className="text-[9px] py-0 px-1.5 ml-1">
                {isDepositPaid ? 'Verified' : isAccepted ? 'Accepted' : 'Ready'}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'payments'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Payments & Ledger</span>
            {pendingPayment && (
              <Badge variant="warning" className="text-[9px] py-0 px-1.5 ml-1 animate-pulse">
                Reviewing
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab('booking')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'booking'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Confirmed Booking</span>
            {activeBooking && (
              <Badge 
                variant={activeBooking.status === 'Completed' ? 'blue' : 'success'} 
                className="text-[9px] py-0 px-1.5 ml-1"
              >
                {activeBooking.status === 'Completed' ? 'Completed' : 'Confirmed'}
              </Badge>
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW SUMMARY                                  */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Overview KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                <CardContent className="p-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Total Contract Value</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-[#1E3A8A]">
                    ₱{contractTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">PHP</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {effectiveQuotation ? `Quote Ref #${effectiveQuotation.id}` : 'Pending quotation'}
                  </span>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-emerald-200/90 shadow-xs bg-white p-5">
                <CardContent className="p-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-emerald-700">Verified Paid</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700">
                    ₱{totalVerifiedPaid.toLocaleString()} <span className="text-xs font-normal text-slate-500">PHP</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    {isFullyPaid ? '100% Cleared & Settled' : isDepositPaid ? '50% Downpayment Verified' : 'Deposit required to lock date'}
                  </span>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                <CardContent className="p-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Remaining Balance</span>
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    ₱{remainingBalanceAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">PHP</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {isFullyPaid ? 'No balance due' : 'Payable 3 days prior to event'}
                  </span>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                <CardContent className="p-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Event Date</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-extrabold text-[#1E3A8A] truncate">
                    {activeBooking?.eventDate || effectiveQuotation?.eventDate || currentInquiry?.eventDate || 'Date pending'}
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {activeBooking?.venue || effectiveQuotation?.venue || currentInquiry?.venue || 'Venue pending'}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Active Event Showcase Card */}
            {(effectiveQuotation || currentInquiry || activeBooking) && (
              <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="brand" className="text-xs font-bold">
                        {activeBooking 
                          ? 'Confirmed Booking' 
                          : effectiveQuotation 
                          ? `Official Quotation #${effectiveQuotation.id}`
                          : `Event Inquiry #${currentInquiry?.id}`}
                      </Badge>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600 font-medium">
                        Target Date: <strong>{activeBooking?.eventDate || effectiveQuotation?.eventDate || currentInquiry?.eventDate}</strong>
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E3A8A] mt-2">
                      {activeBooking?.eventTitle || effectiveQuotation?.eventType || currentInquiry?.eventType || 'Event Celebration'}
                    </h2>
                  </div>

                  {/* Primary Context Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentInquiry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInquiryDetails()}
                        className="rounded-xl text-xs font-semibold gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Inquiry</span>
                      </Button>
                    )}

                    {effectiveQuotation && isQuotationSent && (
                      <Button
                        variant="brand"
                        size="sm"
                        disabled={isAccepting}
                        onClick={handleAcceptQuotation}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isAccepting ? 'Accepting...' : 'Accept Quotation'}</span>
                      </Button>
                    )}

                    {effectiveQuotation && isAccepted && !isDepositPaid && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={handleOpenSubmitPaymentProof}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Downpayment Proof</span>
                      </Button>
                    )}

                    {effectiveQuotation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('quotation')}
                        className="rounded-xl text-xs font-semibold gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5 text-orange-500" />
                        <span>View Quotation Details</span>
                      </Button>
                    )}

                    {activeBooking && activeBooking.status === 'Completed' && (
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => {
                          if (activeBooking.feedback) {
                            setActiveTab('booking');
                          } else {
                            setIsFeedbackModalOpen(true);
                          }
                        }}
                        className={`rounded-xl text-xs font-bold gap-1.5 shadow-xs ${
                          activeBooking.feedback
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{activeBooking.feedback ? 'View Submitted Feedback' : 'Give Event Feedback'}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Event Specifications Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Event Venue</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{activeBooking?.venue || effectiveQuotation?.venue || currentInquiry?.venue || 'Not specified'}</span>
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Expected Attendance</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                      <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{activeBooking?.guestCount || effectiveQuotation?.guestCount || currentInquiry?.guestCount || 100} Guests</span>
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Required 50% Downpayment</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>₱{(effectiveQuotation?.requiredDownpayment || contractTotal * 0.5).toLocaleString()} PHP</span>
                    </span>
                  </div>
                </div>

                {/* Action Guide Notification Box */}
                {isQuotationSent && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-950 leading-relaxed">
                      <strong>Official Quotation Available for Review:</strong> JAD Events operations has issued your itemized proposal. Please review the services and pricing, then click <strong>"Accept Quotation"</strong> to proceed with locking in your reservation.
                    </div>
                  </div>
                )}

                {isAccepted && !isDepositPaid && !pendingPayment && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950 leading-relaxed">
                      <strong>Next Step: 50% Reservation Downpayment:</strong> Your quotation is accepted. To lock your calendar slot and dispatch equipment, please transfer the 50% downpayment externally via GCash or Bank Transfer, then click <strong>"Submit Downpayment Proof"</strong> below.
                    </div>
                  </div>
                )}

                {pendingPayment && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950 leading-relaxed">
                      <strong>Payment Proof Under Review:</strong> Your payment submission (Ref #{pendingPayment.referenceNumber} for ₱{Number(pendingPayment.amount).toLocaleString()} PHP) has been received. Our administration will verify the transaction within business hours.
                    </div>
                  </div>
                )}

                {isConfirmed && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 leading-relaxed">
                      <strong>Booking Fully Confirmed:</strong> Your reservation is locked on the JAD Events calendar. Our production team and coordinators are assigned.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State if completely new client */}
            {!currentInquiry && inquiries.length === 0 && !effectiveQuotation && !activeBooking && (
              <Card className="rounded-2xl border-slate-200 shadow-xs bg-white p-12 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center mb-4">
                  <Calendar className="w-7 h-7 text-[#1E3A8A]" />
                </div>
                <h3 className="text-lg font-bold text-[#1E3A8A] mb-1">
                  Welcome to JAD Events Portal
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-6">
                  You do not have any active event inquiries yet. Explore our production services and packages on the website to submit your first event inquiry.
                </p>
                <Button
                  variant="brand"
                  size="default"
                  onClick={onNavigateHome}
                  className="font-bold gap-2 rounded-xl text-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Browse Services & Inquire</span>
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MY SUBMITTED INQUIRIES                            */}
        {/* ======================================================== */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>My Submitted Event Inquiries</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review inquiries you have submitted to JAD Events for availability and quotation review.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateHome}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-orange-500" />
                  <span>New Inquiry</span>
                </Button>
              </div>

              {/* Inquiries List Table / Cards */}
              <div className="mt-4 space-y-3">
                {(inquiries.length > 0 ? inquiries : currentInquiry ? [currentInquiry] : []).length > 0 ? (
                  (inquiries.length > 0 ? inquiries : [currentInquiry!]).map((inq, idx) => (
                    <div 
                      key={inq.id || idx}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 gap-4 hover:bg-white hover:border-blue-200 transition-all shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded-md">
                            #{inq.id || `INQ-${idx + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{inq.eventType}</span>
                          <Badge variant={inq.status === 'Confirmed' ? 'success' : inq.status === 'Accepted' ? 'blue' : 'warning'} className="text-[10px]">
                            {inq.status || 'Pending Review'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-orange-500" />
                            {inq.eventDate || 'Date TBD'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate max-w-[200px]" title={inq.venue}>
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="truncate">{inq.venue || 'Venue TBD'}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            {inq.guestCount} Guests
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInquiryId(inq.id || inq.dbId?.toString() || null);
                            setActiveTab('overview');
                          }}
                          className="rounded-xl text-xs font-semibold gap-1.5 h-8 text-[#1E3A8A] border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                          title="Track reservation journey for this event"
                        >
                          <Compass className="w-3.5 h-3.5 text-[#1E3A8A]" />
                          <span>Track Journey</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenInquiryDetails(inq)}
                          className="rounded-xl text-xs font-semibold gap-1.5 h-8 bg-white"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Details</span>
                        </Button>

                        {(() => {
                          const linkedQ = quotations.find(q => q.inquiryId === inq.id || (inq.dbId && q.inquiryId === inq.dbId.toString()));
                          if (linkedQ) {
                            return (
                              <Button
                                variant="brand"
                                size="sm"
                                onClick={() => {
                                  setSelectedInquiryId(inq.id || inq.dbId?.toString() || null);
                                  setActiveTab('quotation');
                                }}
                                className="rounded-xl text-xs font-bold gap-1.5 h-8 bg-[#1E3A8A] hover:bg-blue-900 text-white"
                              >
                                <Receipt className="w-3.5 h-3.5 text-orange-400" />
                                <span>View Quote</span>
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No event inquiries submitted yet.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: OFFICIAL ITEMIZED QUOTATION                       */}
        {/* ======================================================== */}
        {activeTab === 'quotation' && effectiveQuotation && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#1E3A8A]">
                      Official Itemized Quotation
                    </h3>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      #{effectiveQuotation.id}
                    </span>
                    <Badge variant={isDepositPaid ? 'success' : isAccepted ? 'blue' : 'warning'} className="text-xs font-bold">
                      {isDepositPaid ? '✓ Deposit Verified' : isAccepted ? 'Accepted by Client' : 'Awaiting Approval'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Prepared by JAD Events Operations • Valid until {effectiveQuotation.validUntil}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintQuotation}
                    className="rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Quotation</span>
                  </Button>
                </div>
              </div>

              {/* Quotation Summary Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Event Type</span>
                  <span className="text-xs font-bold text-[#1E3A8A] block mt-0.5">{effectiveQuotation.eventType}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Event Date</span>
                  <span className="text-xs font-bold text-slate-900 block mt-0.5">{effectiveQuotation.eventDate}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Venue Location</span>
                  <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate" title={effectiveQuotation.venue}>
                    {effectiveQuotation.venue}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Quotation Validity</span>
                  <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                    Until {effectiveQuotation.validUntil}
                  </span>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Itemized Scope & Specifications
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-4">Item / Description</th>
                        <th className="py-2.5 px-4 text-center">Type</th>
                        <th className="py-2.5 px-4 text-right">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {effectiveQuotation.items && effectiveQuotation.items.length > 0 ? (
                        effectiveQuotation.items.map((item, i) => (
                          <tr key={item.id || i} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              {item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {item.type || 'service'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-[#1E3A8A]">
                              ₱{item.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 px-4 text-slate-600">
                            Complete comprehensive event setup, equipment, and directing included under Booking #{effectiveQuotation.id}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₱{effectiveQuotation.subtotal.toLocaleString()} PHP</span>
                </div>

                {effectiveQuotation.discounts?.map(d => (
                  <div key={d.id} className="flex justify-between text-xs text-emerald-700 font-semibold">
                    <span>Discount ({d.label}):</span>
                    <span>-₱{d.amount.toLocaleString()} PHP</span>
                  </div>
                ))}

                {effectiveQuotation.additionalCharges?.map(c => (
                  <div key={c.id} className="flex justify-between text-xs text-orange-700 font-semibold">
                    <span>Additional Charge ({c.label}):</span>
                    <span>+₱{Number(c.amount).toLocaleString()} PHP</span>
                  </div>
                ))}

                <div className="pt-3 border-t border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Contract Amount</span>
                    <div className="text-2xl font-extrabold text-[#1E3A8A]">
                      ₱{effectiveQuotation.grandTotal.toLocaleString()} <span className="text-xs font-normal text-slate-600">PHP</span>
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold mt-0.5 block">
                      Required 50% Downpayment: ₱{effectiveQuotation.requiredDownpayment.toLocaleString()} PHP
                    </span>
                  </div>

                  {/* Actions according to workflow */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isQuotationSent && (
                      <Button
                        variant="brand"
                        size="default"
                        disabled={isAccepting}
                        onClick={handleAcceptQuotation}
                        className="rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isAccepting ? 'Accepting...' : 'Accept Official Quotation'}</span>
                      </Button>
                    )}

                    {isAccepted && !isDepositPaid && (
                      <Button
                        variant="brand"
                        size="default"
                        onClick={handleOpenSubmitPaymentProof}
                        className="rounded-xl text-xs font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Submit Downpayment Proof</span>
                      </Button>
                    )}

                    {isDepositPaid && (
                      <Button
                        variant="outline"
                        size="default"
                        onClick={handleDownloadBookingDetails}
                        className="rounded-xl text-xs font-semibold gap-2 bg-white text-[#1E3A8A] border-blue-200"
                      >
                        <Download className="w-4 h-4 text-orange-500" />
                        <span>Download Booking Voucher</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quotation Terms */}
              {effectiveQuotation.terms && effectiveQuotation.terms.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>Quotation Terms & Policies</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500">
                    {effectiveQuotation.terms.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 3 Empty State: Quotation in Preparation */}
        {activeTab === 'quotation' && !effectiveQuotation && (
          <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Quotation in Preparation</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeInquiry 
                  ? `We have received your event inquiry (${activeInquiry.eventType} for ${activeInquiry.eventDate || 'Date TBD'}) and our event directors are currently calculating costs and preparing your official itemized proposal.`
                  : 'Submit an event inquiry to receive a customized, itemized quotation from JAD Events.'}
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('inquiries')}
                className="rounded-xl text-xs font-semibold"
              >
                View Submitted Inquiries
              </Button>
            </div>
          </Card>
        )}

        {/* ======================================================== */}
        {/* TAB 4: PAYMENTS & LEDGER                                 */}
        {/* ======================================================== */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#1E3A8A] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Payment Process & Milestone Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pay externally using GCash or Bank Transfer, then upload your proof of payment for administrator verification.
                  </p>
                </div>

                {(isAccepted || rejectedPayment) && !isDepositPaid && (
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={handleOpenSubmitPaymentProof}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Submit Payment Proof</span>
                  </Button>
                )}
              </div>

              {/* Instructional Banner for External Payment */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="font-bold text-[#1E3A8A] flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>How to Settle Your Payment (Manual Verification Process):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                    <span className="font-bold text-[#1E3A8A] block">1. Transfer Funds</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Pay via GCash QR, BDO, or BPI Bank Transfer to our official accounts.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                    <span className="font-bold text-[#1E3A8A] block">2. Save Screenshot</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Capture your transfer receipt screenshot and note the reference number.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                    <span className="font-bold text-[#1E3A8A] block">3. Upload Proof</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Click "Submit Payment Proof" to upload and submit for instant verification.</span>
                  </div>
                </div>
              </div>

              {/* Verified Progress Bar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Verified Payment Progress</span>
                  <span className="text-[#1E3A8A]">
                    {paymentPercentage}% Cleared (₱{totalVerifiedPaid.toLocaleString()} / ₱{contractTotal.toLocaleString()} PHP)
                  </span>
                </div>
                <Progress value={paymentPercentage} className="h-2.5" />
              </div>

              {/* Rejection Alert if payment was rejected */}
              {rejectedPayment && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <span className="font-bold text-red-950 block">Payment Proof Rejected by Administrator</span>
                      <span className="text-red-700 block mt-0.5">
                        Reason: {rejectedPayment.rejectionReason || 'Invalid reference number or unreadable screenshot'}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOpenSubmitPaymentProof}
                    className="rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shrink-0"
                  >
                    Resubmit Proof
                  </Button>
                </div>
              )}

              {/* Pending Verification Banner */}
              {pendingPayment && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950 block">Payment Verification Pending</span>
                      <span className="text-amber-800 block mt-0.5">
                        Method: {pendingPayment.method} • Ref #{pendingPayment.referenceNumber} • Amount: ₱{Number(pendingPayment.amount).toLocaleString()} PHP
                      </span>
                    </div>
                  </div>
                  {pendingPayment.proofUrl && (
                    <a
                      href={pendingPayment.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>View Uploaded Proof</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Milestone Ledger Records */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment Milestones & Transactions
                </h4>

                <div className="space-y-2.5">
                  {/* Milestone 1: 50% Deposit */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white border border-slate-200 gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isDepositPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isDepositPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">50% Reservation Downpayment</div>
                        <div className="text-[11px] text-slate-500">Required to lock calendar date and production crews</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-[#1E3A8A] text-sm">
                        ₱{(effectiveQuotation?.requiredDownpayment || contractTotal * 0.5).toLocaleString()} PHP
                      </div>
                      <Badge variant={isDepositPaid ? 'success' : pendingPayment ? 'warning' : 'outline'} className="text-[10px] mt-0.5">
                        {isDepositPaid ? 'Verified & Cleared' : pendingPayment ? 'Pending Verification' : 'Awaiting Payment'}
                      </Badge>
                    </div>
                  </div>

                  {/* Milestone 2: Remaining Balance */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white border border-slate-200 gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isFullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isFullyPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Final Milestone Balance</div>
                        <div className="text-[11px] text-slate-500">Payable 3 days prior to the event date</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        ₱{remainingBalanceAmount.toLocaleString()} PHP
                      </div>
                      <Badge variant={isFullyPaid ? 'success' : 'outline'} className="text-[10px] mt-0.5">
                        {isFullyPaid ? '100% Settled' : 'Pending Event Ingress'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: CONFIRMED BOOKING DETAILS                         */}
        {/* ======================================================== */}
        {activeTab === 'booking' && activeBooking && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#1E3A8A]">
                      Confirmed Event Booking Voucher
                    </h3>
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      #{activeBooking.id}
                    </span>
                    <Badge variant="success" className="text-xs font-bold">
                      {activeBooking.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Your event has been confirmed and placed on the JAD Events operational production schedule.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadBookingDetails}
                    className="rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Booking Voucher</span>
                  </Button>
                </div>
              </div>

              {/* Booking Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Event Title</span>
                  <span className="text-xs font-bold text-[#1E3A8A] block mt-1">{activeBooking.eventTitle}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Event Date</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">{activeBooking.eventDate}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Venue</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1 truncate" title={activeBooking.venue}>
                    {activeBooking.venue}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Guest Count</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">{activeBooking.guestCount} Pax</span>
                </div>
              </div>

              {/* Operational Team & Crew */}
              {activeBooking.assignedStaff && activeBooking.assignedStaff.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Assigned Event Coordination & Crew:</span>
                  <div className="flex flex-wrap gap-2">
                    {activeBooking.assignedStaff.map(st => (
                      <Badge key={st.id} variant="secondary" className="text-xs py-1 px-2.5 bg-white border border-slate-200 text-slate-800 font-semibold gap-1.5">
                        <User className="w-3 h-3 text-[#1E3A8A]" />
                        <span>{st.name} ({st.role})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* CUSTOMER FEEDBACK & EVALUATION LIFECYCLE SECTION          */}
              {/* ======================================================== */}
              <div className="pt-2 border-t border-slate-100">
                {activeBooking.status === 'Completed' ? (
                  activeBooking.feedback ? (
                    /* State: Completed & Feedback Already Submitted */
                    <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-950">Evaluation Submitted</span>
                              <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">
                                Feedback Recorded
                              </Badge>
                            </div>
                            <p className="text-[11px] text-emerald-700">
                              Thank you for evaluating your event experience with JAD Events!
                            </p>
                          </div>
                        </div>

                        {/* Overall Rating Display */}
                        <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-center">
                          <span className="text-[11px] font-bold text-slate-600 mr-1">Overall:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= (activeBooking.feedback?.overallRating || 5)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                          <span className="font-mono text-xs font-extrabold text-slate-800 ml-1">
                            {activeBooking.feedback.overallRating}/5
                          </span>
                        </div>
                      </div>

                      {/* Detailed Ratings Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-100/80">
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                          <span className="text-[10px] font-medium text-slate-500 block">Service Quality</span>
                          <span className="text-xs font-bold text-[#1E3A8A] flex items-center justify-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {activeBooking.feedback.serviceRating}/5
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                          <span className="text-[10px] font-medium text-slate-500 block">Staff Performance</span>
                          <span className="text-xs font-bold text-[#1E3A8A] flex items-center justify-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {activeBooking.feedback.staffRating}/5
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                          <span className="text-[10px] font-medium text-slate-500 block">Event Execution</span>
                          <span className="text-xs font-bold text-[#1E3A8A] flex items-center justify-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {activeBooking.feedback.executionRating}/5
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-center">
                          <span className="text-[10px] font-medium text-slate-500 block">Submitted On</span>
                          <span className="text-[11px] font-semibold text-slate-700 block mt-1">
                            {activeBooking.feedback.createdAt ? new Date(activeBooking.feedback.createdAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>

                      {activeBooking.feedback.comments && (
                        <div className="p-3 rounded-xl bg-white border border-emerald-100 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Your Comments</span>
                          <p className="text-slate-700 italic">"{activeBooking.feedback.comments}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* State: Completed & Feedback Pending Submission */
                    <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                                Event Marked as Completed!
                              </h4>
                              <Badge variant="warning" className="text-[10px] font-bold">
                                Feedback Unlocked
                              </Badge>
                            </div>
                            <p className="text-xs text-amber-800 mt-0.5 max-w-xl">
                              Your event has been successfully concluded by JAD Events. We would love to hear about your experience to ensure our production and service quality exceed your expectations.
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="brand"
                          size="sm"
                          onClick={() => setIsFeedbackModalOpen(true)}
                          className="rounded-xl text-xs font-bold gap-1.5 bg-[#1E3A8A] hover:bg-blue-900 text-white shadow-xs shrink-0 self-start sm:self-center"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Submit Evaluation / Feedback</span>
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  /* State: Event Not Yet Completed */
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Feedback will become available once your event has been marked as completed by JAD Events.
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Tab 5 Empty State: Booking Not Yet Confirmed */}
        {activeTab === 'booking' && !activeBooking && (
          <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Booking Confirmation Pending</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your official booking voucher will be generated as soon as your quotation is accepted and the 50% reservation deposit is verified by JAD Events operations.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              {effectiveQuotation && !isAccepted && (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => setActiveTab('quotation')}
                  className="rounded-xl text-xs font-bold bg-[#1E3A8A] text-white"
                >
                  Review & Accept Quotation
                </Button>
              )}
              {isAccepted && !isDepositPaid && (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={handleOpenSubmitPaymentProof}
                  className="rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Submit Downpayment Proof
                </Button>
              )}
              {isDepositPaid && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Downpayment cleared! Our team is finalizing your booking voucher.</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>

      {/* ======================================================== */}
      {/* 5. MODALS & DIALOGS                                      */}
      {/* ======================================================== */}

      {/* Customer Inquiry Details Modal */}
      <CustomerInquiryDetailModal
        isOpen={isInquiryDetailModalOpen}
        onClose={() => setIsInquiryDetailModalOpen(false)}
        inquiry={selectedInquiryForDetails}
        onCancelInquiry={handleCancelInquiry}
        onReviewQuotation={() => {
          setIsInquiryDetailModalOpen(false);
          setActiveTab('quotation');
        }}
      />

      {/* Submit Payment Proof Modal */}
      <SubmitPaymentProofModal
        isOpen={isSubmitPaymentModalOpen}
        onClose={() => setIsSubmitPaymentModalOpen(false)}
        quotation={quotation || effectiveQuotation}
        onPaymentSubmitted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Customer Experience & Evaluation Modal */}
      <CustomerFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        booking={activeBooking}
        onFeedbackSubmitted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};
