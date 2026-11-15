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
  Utensils,
  Music,
  Palette
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
import {
  InquiryFormData,
  parseInquirySelectionDetails,
  extractPlainInquiryNotes,
  formatSelectionModeLabel,
  formatEventTimeRange,
  resolveEventTimes,
} from '../types';

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
  onCancelInquiry,
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

  const selectionDetails =
    inquiry.selectionDetails ||
    parseInquirySelectionDetails(
      inquiry.requirements,
      inquiry.selectedServices,
      inquiry.packageId
    );
  const plainNotes = extractPlainInquiryNotes(inquiry.notes, inquiry.requirements);
  const packageCustom = selectionDetails?.packageSelection || null;
  const resolvedTimes = resolveEventTimes({
    startTime: inquiry.startTime,
    endTime: inquiry.endTime,
    requestedStartTime: inquiry.requestedStartTime,
    requestedEndTime: inquiry.requestedEndTime,
    approvedStartTime: inquiry.approvedStartTime,
    approvedEndTime: inquiry.approvedEndTime,
    requirements: inquiry.requirements,
    selectionDetails,
  });
  const requestedTimeLabel = formatEventTimeRange(
    resolvedTimes.requestedStartTime || resolvedTimes.startTime,
    resolvedTimes.requestedEndTime || resolvedTimes.endTime,
    { includeDuration: true, fallback: 'Not recorded' }
  );
  const approvedTimeLabel =
    resolvedTimes.approvedStartTime && resolvedTimes.approvedEndTime
      ? formatEventTimeRange(resolvedTimes.approvedStartTime, resolvedTimes.approvedEndTime, {
          includeDuration: true,
        })
      : '';
  const hasAdjustedApprovedTime =
    Boolean(approvedTimeLabel) &&
    (resolvedTimes.approvedStartTime !== resolvedTimes.requestedStartTime ||
      resolvedTimes.approvedEndTime !== resolvedTimes.requestedEndTime);

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
              <div className="w-10 h-10 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
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
                  Your submitted specifications for quotation review &amp; production planning
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-md bg-slate-50 border border-slate-200/80">
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
              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Event Type</span>
                  <span className="text-xs font-extrabold text-[#1E3A8A] block">{inquiry.eventType}</span>
                  {inquiry.customEventDescription &&
                    inquiry.customEventDescription !== inquiry.eventType && (
                      <span className="text-[10px] text-slate-500 block">
                        {inquiry.customEventDescription}
                      </span>
                    )}
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target Date</span>
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1 block">
                    <Calendar className="w-3.5 h-3.5 text-orange-500 inline" />
                    {inquiry.eventDate}
                  </span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-2xs sm:col-span-2">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                    Event Time Schedule
                  </span>
                  <span className="text-xs font-extrabold text-[#1E3A8A] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{approvedTimeLabel || requestedTimeLabel}</span>
                  </span>
                  {hasAdjustedApprovedTime && (
                    <span className="text-[10px] font-medium text-slate-500 block pt-0.5">
                      Originally Requested: {requestedTimeLabel}
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-2xs">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Venue Location</span>
                  <span
                    className="text-xs font-bold text-slate-900 flex items-center gap-1 block truncate"
                    title={inquiry.venue}
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 inline" />
                    <span className="truncate">{inquiry.venue}</span>
                  </span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-2xs">
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

          {/* Section 3: Selected Services, Packages, Options & Preferences */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Requested Inclusions &amp; Preferences</span>
              </h4>
              {selectionDetails?.selectionMode && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-[#1E3A8A] border-blue-200 font-bold">
                  {formatSelectionModeLabel(selectionDetails.selectionMode)}
                </Badge>
              )}
            </div>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 space-y-3">
              {inquiry.packageId && (
                <div className="p-3.5 rounded-md bg-purple-50 border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-purple-900">
                          {packageCustom?.packageName && packageCustom.packageName !== inquiry.packageId
                            ? `Selected Package: ${packageCustom.packageName}`
                            : 'Selected Package Bundle'}
                        </div>
                        <div className="text-[10px] text-purple-700">
                          Reference ID: {inquiry.packageId}
                        </div>
                      </div>
                    </div>
                    <Badge variant="blue" className="text-[10px]">
                      Package Inclusions
                    </Badge>
                  </div>

                  {packageCustom?.selectedOptions && packageCustom.selectedOptions.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-purple-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                        Selected Package Options ({packageCustom.selectedOptions.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {packageCustom.selectedOptions.map((opt, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] bg-white text-purple-900 border border-purple-200 font-medium"
                          >
                            <Check className="w-2.5 h-2.5 mr-1 text-purple-700" />
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {packageCustom?.customNotes && packageCustom.customNotes.trim() && (
                    <div className="p-2 rounded bg-white/90 border border-purple-200 text-xs text-slate-700">
                      <span className="font-bold text-purple-900">Your Package Note: </span>
                      {packageCustom.customNotes}
                    </div>
                  )}
                </div>
              )}

              {inquiry.selectedServices && inquiry.selectedServices.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {inquiry.packageId ? 'Selected Add-On Services:' : 'Selected Services:'}
                  </span>
                  <div className="space-y-2">
                    {inquiry.selectedServices.map((srvId) => {
                      const c = selectionDetails?.serviceCustomizations?.[srvId];
                      const displayName =
                        c?.serviceName && c.serviceName !== srvId
                          ? c.serviceName
                          : srvId.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
                      const hasPrefs = Boolean(
                        c?.preferredDishes?.trim() ||
                          c?.dietaryRestrictions?.trim() ||
                          c?.preferredActivities?.trim() ||
                          c?.stylingThemeNotes?.trim() ||
                          c?.customNotes?.trim()
                      );

                      return (
                        <div
                          key={srvId}
                          className="p-3 rounded-md bg-white border border-slate-200 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="text-xs font-extrabold text-slate-900">
                                {displayName}
                              </span>
                            </div>
                            {c?.category && (
                              <Badge variant="outline" className="text-[9px] text-slate-500">
                                {c.category}
                              </Badge>
                            )}
                          </div>

                          {c?.selectedOptions && c.selectedOptions.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-500 block">
                                Selected Options ({c.selectedOptions.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {c.selectedOptions.map((opt, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-[10px] bg-blue-50/70 text-[#1E3A8A] border border-blue-200 font-medium"
                                  >
                                    <Check className="w-2.5 h-2.5 mr-1 text-blue-600" />
                                    {opt}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {hasPrefs && (
                            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] block">
                                Your Submitted Preferences:
                              </span>
                              {c?.preferredDishes?.trim() && (
                                <div className="flex items-start gap-1.5 text-slate-700">
                                  <Utensils className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Preferred Dishes / Menu: </span>
                                    <span>{c.preferredDishes}</span>
                                  </div>
                                </div>
                              )}
                              {c?.dietaryRestrictions?.trim() && (
                                <div className="text-slate-700 pl-5">
                                  <span className="font-bold">Dietary Restrictions: </span>
                                  <span>{c.dietaryRestrictions}</span>
                                </div>
                              )}
                              {c?.preferredActivities?.trim() && (
                                <div className="flex items-start gap-1.5 text-slate-700">
                                  <Music className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Preferred Activities / Program: </span>
                                    <span>{c.preferredActivities}</span>
                                  </div>
                                </div>
                              )}
                              {c?.stylingThemeNotes?.trim() && (
                                <div className="flex items-start gap-1.5 text-slate-700">
                                  <Palette className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Theme &amp; Color Palette: </span>
                                    <span>{c.stylingThemeNotes}</span>
                                  </div>
                                </div>
                              )}
                              {c?.customNotes?.trim() && (
                                <div className="text-slate-700">
                                  <span className="font-bold">Specific Instructions: </span>
                                  <span>{c.customNotes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !inquiry.packageId ? (
                <div className="text-xs text-slate-500 italic">
                  Custom event requirements requested.
                </div>
              ) : null}
            </div>
          </div>

          {/* Section 4: Special Requirements & Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Overall Event Notes</span>
            </h4>
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap min-h-[70px]">
              {plainNotes || 'No special requirements noted.'}
            </div>
          </div>

          {/* Cancellation Details Section (if cancelled) */}
          {inquiry.status === 'CANCELLED' && inquiry.cancellationReason && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>Cancellation Reason</span>
              </h4>
              <div className="p-4 rounded-md bg-red-50 border border-red-200/80 text-xs text-red-800 whitespace-pre-wrap min-h-[50px]">
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
              <p className="text-[11px] text-slate-500">
                Please provide a reason for cancellation. This action cannot be undone.
              </p>
              <textarea
                className="w-full text-xs p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCancelling(false)}
                  className="text-xs h-7"
                >
                  Keep Inquiry
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="text-xs h-7"
                >
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
              className="rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              Cancel Inquiry
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-md text-xs font-semibold"
          >
            Close
          </Button>

          {onReviewQuotation &&
            (inquiry.status === 'Quotation Sent' ||
              inquiry.status === 'Accepted' ||
              inquiry.status === 'Deposit Paid') && (
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  onClose();
                  onReviewQuotation();
                }}
                className="rounded-md text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
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
