"use client";
import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Users, 
  Receipt, 
  Clock,
  ShieldCheck,
  CreditCard,
  Printer,
  Edit3,
  RefreshCw,
  Ban,
  Wrench,
  Package,
  HardHat,
  Boxes,
  FileText,
  DollarSign,
  Trash2,
  Star,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Booking, PaymentTransaction, Quotation, InquiryFormData } from '../types';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  payments?: PaymentTransaction[];
  quotations?: Quotation[];
  inquiries?: InquiryFormData[];
  onEditBooking?: (booking: Booking) => void;
  onRescheduleBooking?: (booking: Booking) => void;
  onCancelBooking?: (booking: Booking) => void;
  onRecordPayment?: (bookingId: string) => void;
  onDeleteBooking?: (bookingId: string) => void;
  onUpdateBookingStatus?: (bookingId: string, status: Booking['status']) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  onClose,
  booking,
  payments = [],
  quotations = [],
  inquiries = [],
  onEditBooking,
  onRescheduleBooking,
  onCancelBooking,
  onRecordPayment,
  onDeleteBooking,
  onUpdateBookingStatus,
}) => {
  if (!booking) return null;

  // Find linked quotation
  const linkedQuotation = quotations.find(q => 
    q.id === booking.quotationId || 
    (booking.quotationId && q.dbId && q.dbId.toString() === booking.quotationId)
  );

  // Find linked inquiry
  const linkedInquiry = inquiries.find(i => 
    i.id === booking.inquiryId || 
    (booking.inquiryId && i.dbId && i.dbId.toString() === booking.inquiryId)
  );

  // Find payments for this booking
  const bookingPayments = payments.filter(p => 
    p.bookingId === booking.id || 
    (booking.dbId && p.bookingId === booking.dbId.toString()) ||
    (booking.quotationId && p.quotationId === booking.quotationId) ||
    (p.clientEmail && booking.clientEmail && p.clientEmail.toLowerCase() === booking.clientEmail.toLowerCase())
  );

  const verifiedPayments = bookingPayments.filter(p => p.verified);
  const totalVerifiedPaid = verifiedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = Math.max(0, Number(booking.totalAmount) - totalVerifiedPaid);
  const paymentProgress = booking.totalAmount > 0 
    ? Math.min(100, Math.round((totalVerifiedPaid / Number(booking.totalAmount)) * 100))
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto bg-white rounded-md shadow-2xl border border-slate-200">
        {/* Header */}
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-extrabold text-[#1E3A8A]">
                    Booking Details
                  </DialogTitle>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    #{booking.id}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  {booking.eventTitle} • Created {booking.createdAt || 'Recent'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Badge 
                variant={
                  booking.status === 'Confirmed' ? 'success' : 
                  booking.status === 'Completed' ? 'success' : 
                  booking.status === 'Cancelled' ? 'destructive' : 'blue'
                } 
                className="text-xs px-3 py-1 font-bold"
              >
                {booking.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section 1: Client Information */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Client Name</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {booking.clientName}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Email Address</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {booking.clientEmail}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Phone / Contact</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {booking.clientPhone || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Event Schedule & Venue Logistics */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Event Logistics & Schedule</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Event Type</span>
                <span className="font-bold text-slate-900 block mt-0.5">{booking.eventType}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Event Date</span>
                <span className="font-bold text-[#1E3A8A] flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  {booking.eventDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Program Time</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {booking.startTime || '17:00'} - {booking.endTime || '23:00'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Expected Guests</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {booking.guestCount} Attendees
                </span>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 pt-1 border-t border-slate-200/60">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Venue & Location</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  {booking.venue}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Payment Status */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Financial Ledger & Escrow Status</span>
            </h4>
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Contract Total</span>
                  <span className="text-sm font-extrabold text-[#1E3A8A]">
                    ₱{Number(booking.totalAmount).toLocaleString()} PHP
                  </span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-[10px] font-semibold uppercase text-emerald-700 block">Verified Paid</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    ₱{totalVerifiedPaid.toLocaleString()} PHP
                  </span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-200">
                  <span className="text-[10px] font-semibold uppercase text-orange-600 block">Outstanding Balance</span>
                  <span className="text-sm font-extrabold text-orange-600">
                    ₱{remainingBalance.toLocaleString()} PHP
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>Settlement Progress: {paymentProgress}%</span>
                  <span>{remainingBalance === 0 ? 'Fully Settle' : '50% Downpayment Covered'}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
              </div>

              {/* Linked Records References */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  {booking.quotationId && (
                    <span className="flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-blue-600" />
                      <span>Quote: <strong>#{booking.quotationId}</strong></span>
                    </span>
                  )}
                  {booking.inquiryId && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-orange-500" />
                      <span>Inquiry: <strong>#{booking.inquiryId}</strong></span>
                    </span>
                  )}
                </div>
                {onRecordPayment && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onRecordPayment(booking.id);
                    }}
                    className="text-xs h-7 px-2 font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <CreditCard className="w-3 h-3 mr-1" />
                    <span>Record Payment</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Operational Staff & Production Assignments */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-indigo-600" />
              <span>Assigned Event Crew & Staff ({booking.assignedStaff.length})</span>
            </h4>
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs">
              {booking.assignedStaff.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {booking.assignedStaff.map((staff, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-white border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-100 text-[#1E3A8A] font-bold text-xs flex items-center justify-center">
                          {staff.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">{staff.name}</span>
                          <span className="text-[10px] text-[#1E3A8A] font-medium">{staff.role}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Assigned
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 italic text-center py-2">
                  No staff members currently assigned.
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Notes & Special Instructions */}
          {booking.notes && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Client Notes & Special Instructions</span>
              </h4>
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {booking.notes}
              </div>
            </div>
          )}

          {/* Section 6: Customer Evaluation & Feedback */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Customer Event Feedback & Evaluation</span>
              </h4>
              {booking.feedback && (
                <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">
                  Submitted
                </Badge>
              )}
            </div>

            {booking.feedback ? (
              <div className="p-4 rounded-md bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-950">Overall Experience Rating:</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= booking.feedback!.overallRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs font-extrabold text-amber-900 ml-1">
                      {booking.feedback.overallRating} / 5
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Submitted on: {booking.feedback.createdAt ? new Date(booking.feedback.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-md bg-white border border-amber-100/90">
                    <span className="text-[10px] font-semibold text-slate-500 block">Service Quality</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-xs text-slate-800">{booking.feedback.serviceRating} / 5</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-white border border-amber-100/90">
                    <span className="text-[10px] font-semibold text-slate-500 block">Staff Performance</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-xs text-slate-800">{booking.feedback.staffRating} / 5</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-white border border-amber-100/90">
                    <span className="text-[10px] font-semibold text-slate-500 block">Event Execution</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-xs text-slate-800">{booking.feedback.executionRating} / 5</span>
                    </div>
                  </div>
                </div>

                {booking.feedback.comments && (
                  <div className="p-3 rounded-md bg-white border border-amber-100/90 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Customer Impressions</span>
                    <p className="text-slate-800 italic">"{booking.feedback.comments}"</p>
                  </div>
                )}

                {booking.feedback.suggestions && (
                  <div className="p-3 rounded-md bg-white border border-amber-100/90 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Suggestions for Improvement</span>
                    <p className="text-slate-800 italic">"{booking.feedback.suggestions}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  {booking.status === 'Completed'
                    ? 'Event completed. Awaiting customer submission of evaluation.'
                    : 'Customer evaluation becomes available after this booking is marked as Completed.'}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  No Feedback Yet
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 mt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-bold text-slate-600 gap-1.5 rounded-md self-start sm:self-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Voucher</span>
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
            {onUpdateBookingStatus && booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  if (confirm(`Mark booking #${booking.id} (${booking.eventTitle}) as COMPLETED? This will conclude the event and unlock customer evaluation.`)) {
                    onUpdateBookingStatus(booking.id, 'Completed');
                    onClose();
                  }
                }}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md gap-1 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Completed</span>
              </Button>
            )}

            {onRescheduleBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onRescheduleBooking(booking);
                }}
                className="text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-md"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>Reschedule</span>
              </Button>
            )}

            {onEditBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditBooking(booking);
                }}
                className="text-xs font-bold text-[#1E3A8A] border-slate-200 rounded-md"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                <span>Edit</span>
              </Button>
            )}

            {onCancelBooking && booking.status !== 'Cancelled' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onCancelBooking(booking);
                }}
                className="text-xs font-bold text-red-600 hover:bg-red-50 rounded-md"
              >
                <Ban className="w-3.5 h-3.5 mr-1" />
                <span>Cancel</span>
              </Button>
            )}

            {onDeleteBooking && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Permanently delete booking #${booking.id} (${booking.clientName} - ${booking.eventTitle})? This will release the schedule date and allocated resources.`)) {
                    onClose();
                    onDeleteBooking(booking.id);
                  }
                }}
                className="text-xs font-bold text-red-600 hover:bg-red-50 rounded-md"
                title="Permanently delete booking from system"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete</span>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold bg-[#1E3A8A] text-white rounded-md px-4"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
