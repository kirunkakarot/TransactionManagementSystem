"use client";
import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Users, 
  FileText, 
  Layers,
  Check, 
  Package, 
  Clock,
  Receipt,
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
import { Card, CardContent } from '@/components/ui/card';
import { InquiryFormData } from '../types';

interface CustomerInquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: InquiryFormData | null;
  onReviewQuotation?: (quotationId?: string) => void;
  onCancelInquiry?: (id: string, reason: string) => Promise<void>;
}

export const CustomerInquiryDetailModal: React.FC<CustomerInquiryDetailModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onReviewQuotation,
  onCancelInquiry
}) => {
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setIsCancelling(false);
      setCancelReason('');
      setIsSubmittingCancel(false);
    }
  }, [isOpen]);

  if (!inquiry) return null;

  const handleConfirmCancel = async () => {
    if (!inquiry.id || !onCancelInquiry) return;
    setIsSubmittingCancel(true);
    try {
      await onCancelInquiry(inquiry.id, cancelReason);
      setIsCancelling(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-extrabold text-[#1E3A8A]">
                    My Submitted Event Inquiry
                  </DialogTitle>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    #{inquiry.id || 'INQ-NEW'}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Your submitted specifications for quotation review & production planning
                </DialogDescription>
              </div>
            </div>
            <Badge variant="blue" className="self-start sm:self-center text-xs px-3 py-1 font-bold">
              {inquiry.status || 'Pending Review'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section 1: Customer Contact Information */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Contact Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Full Name</span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {inquiry.fullName}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Email Address</span>
                <span className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{inquiry.email}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Contact Phone</span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {inquiry.phone || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Event Details */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Event Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-3.5 rounded-2xl bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Event Type</span>
                  <span className="text-xs font-extrabold text-[#1E3A8A] block">{inquiry.eventType}</span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-2xl bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target Date</span>
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1 block">
                    <Calendar className="w-3.5 h-3.5 text-orange-500 inline" />
                    {inquiry.eventDate}
                  </span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-2xl bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Venue Location</span>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1 block truncate" title={inquiry.venue}>
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 inline" />
                    <span className="truncate">{inquiry.venue}</span>
                  </span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-2xl bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Guest Count</span>
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1 block">
                    <Users className="w-3.5 h-3.5 text-blue-600 inline" />
                    {inquiry.guestCount} Pax
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 3: Selected Services & Packages */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Requested Inclusions</span>
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              {inquiry.packageId && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-900">Selected Package Bundle</div>
                      <div className="text-[10px] text-purple-700">Code: {inquiry.packageId}</div>
                    </div>
                  </div>
                  <Badge variant="blue" className="text-[10px]">Package Inclusions</Badge>
                </div>
              )}

              {inquiry.selectedServices && inquiry.selectedServices.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 block">Selected Services:</span>
                  <div className="flex flex-wrap gap-2">
                    {inquiry.selectedServices.map(srvId => (
                      <Badge key={srvId} variant="secondary" className="px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-800 font-semibold gap-1.5 shadow-2xs">
                        <Check className="w-3 h-3 text-blue-600" />
                        <span>{srvId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : !inquiry.packageId ? (
                <div className="text-xs text-slate-500 italic">Custom event requirements requested.</div>
              ) : null}

              {inquiry.budgetRange && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimated Budget:</span>
                  <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                    {inquiry.budgetRange.startsWith('₱') ? inquiry.budgetRange : `₱${inquiry.budgetRange}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Special Requirements & Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Event Requirements & Notes</span>
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap min-h-[70px]">
              {inquiry.notes || 'No special requirements noted.'}
            </div>
          </div>

          {/* Cancellation Details Section (if cancelled) */}
          {inquiry.status === 'CANCELLED' && inquiry.cancellationReason && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>Cancellation Reason</span>
              </h4>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 text-xs text-red-800 whitespace-pre-wrap min-h-[50px]">
                {inquiry.cancellationReason}
              </div>
            </div>
          )}

          {/* Cancellation Input Section (if cancelling) */}
          {isCancelling && inquiry.status === 'Pending Review' && (
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">
                Cancel this Inquiry?
              </h4>
              <p className="text-[11px] text-slate-500">Please provide a reason for cancellation. This action cannot be undone.</p>
              <textarea
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsCancelling(false)} className="text-xs h-7">Keep Inquiry</Button>
                <Button variant="destructive" size="sm" onClick={handleConfirmCancel} disabled={isSubmittingCancel} className="text-xs h-7">
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </div>
          )}

          {/* Section 5: Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Submitted on: {inquiry.submittedAt || 'Recent'}
            </span>
            {inquiry.status === 'CANCELLED' && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                Cancelled on: {inquiry.cancelledAt ? new Date(inquiry.cancelledAt).toLocaleDateString() : 'N/A'}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {!isCancelling && inquiry.status === 'Pending Review' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelling(true)}
              className="rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              Cancel Inquiry
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-semibold"
          >
            Close
          </Button>

          {onReviewQuotation && (inquiry.status === 'Quotation Sent' || inquiry.status === 'Accepted' || inquiry.status === 'Deposit Paid') && (
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                onClose();
                onReviewQuotation();
              }}
              className="rounded-xl text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
            >
              <Receipt className="w-4 h-4" />
              <span>Review Quotation</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
