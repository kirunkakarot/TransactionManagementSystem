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
  Receipt,
  Clock,
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
  ServiceItem,
  PackageItem,
  EventType,
  parseInquirySelectionDetails,
  extractPlainInquiryNotes,
  formatSelectionModeLabel,
  formatEventTimeRange,
  resolveEventTimes,
} from '../types';

interface InquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: InquiryFormData | null;
  services?: ServiceItem[];
  packages?: PackageItem[];
  availableEventTypes?: EventType[];
  onUpdateInquiryClassification?: (inquiryId: string, eventTypeId: number, eventTypeName: string) => void;
  onCreateQuotation?: (inquiry: InquiryFormData) => void;
}

function toSlug(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  services = [],
  packages = [],
  availableEventTypes = [],
  onUpdateInquiryClassification,
  onCreateQuotation,
}) => {
  if (!inquiry) return null;

  const selectionDetails =
    inquiry.selectionDetails ||
    parseInquirySelectionDetails(
      inquiry.requirements,
      inquiry.selectedServices,
      inquiry.packageId
    );
  const plainNotes = extractPlainInquiryNotes(inquiry.notes, inquiry.requirements);
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

  const matchedPackage = inquiry.packageId
    ? packages.find(
        (p) =>
          p.id === String(inquiry.packageId) ||
          p.name.toLowerCase() === String(inquiry.packageId).toLowerCase() ||
          toSlug(p.name) === String(inquiry.packageId).toLowerCase()
      )
    : undefined;

  const packageCustom = selectionDetails?.packageSelection || null;

  const matchedServices = (inquiry.selectedServices || []).map((sId) => {
    const clean = String(sId).trim().toLowerCase();
    const found = services.find(
      (s) =>
        s.id.toLowerCase() === clean ||
        s.name.toLowerCase() === clean ||
        toSlug(s.name) === clean
    );
    const custom =
      selectionDetails?.serviceCustomizations?.[sId] ||
      (found ? selectionDetails?.serviceCustomizations?.[found.id] : undefined);

    return {
      id: sId,
      name:
        found?.name ||
        custom?.serviceName ||
        sId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      category: found?.category || custom?.category,
      price: found ? found.startingPrice : undefined,
      custom,
    };
  });

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
                    Inquiry Details
                  </DialogTitle>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    #{inquiry.id || 'INQ-NEW'}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Customer event specifications, selected options, and quotation preparation reference
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
              <span>Customer Information</span>
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
                <a
                  href={`mailto:${inquiry.email}`}
                  className="text-xs font-bold text-[#1E3A8A] hover:underline flex items-center gap-1.5 mt-0.5 truncate"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{inquiry.email}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Contact Phone</span>
                <a
                  href={`tel:${inquiry.phone}`}
                  className="text-xs font-bold text-slate-900 hover:text-[#1E3A8A] flex items-center gap-1.5 mt-0.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {inquiry.phone || 'Not provided'}
                </a>
              </div>
            </div>
          </div>

          {/* Section 2: Event Specifications */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Target Event Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm col-span-1 sm:col-span-2 lg:col-span-1">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Event Type</span>

                  {availableEventTypes.length > 0 && onUpdateInquiryClassification ? (
                    <div className="mt-1">
                      <select
                        value={inquiry.eventTypeId || inquiry.eventType}
                        onChange={(e) => {
                          const selected = availableEventTypes.find(
                            (t) => t.id === Number(e.target.value) || t.name === e.target.value
                          );
                          if (selected && inquiry.id) {
                            onUpdateInquiryClassification(inquiry.id, selected.id, selected.name);
                          }
                        }}
                        className="w-full text-xs font-bold text-[#1E3A8A] border-slate-200 rounded px-1 py-0.5 bg-blue-50/50"
                      >
                        <option value={inquiry.eventType} disabled>
                          {inquiry.eventType}
                        </option>
                        {availableEventTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs font-extrabold text-[#1E3A8A] block">
                      {inquiry.eventType}
                    </span>
                  )}

                  {inquiry.customEventDescription && (
                    <span className="text-[10px] font-normal text-slate-500 block mt-1">
                      Custom Description: {inquiry.customEventDescription}
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target Event Date</span>
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1 block">
                    <Calendar className="w-3.5 h-3.5 text-orange-500 inline" />
                    {inquiry.eventDate}
                  </span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm sm:col-span-2">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                    Requested Event Time
                  </span>
                  <span className="text-xs font-extrabold text-[#1E3A8A] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{requestedTimeLabel}</span>
                  </span>
                  {hasAdjustedApprovedTime && (
                    <span className="text-[10px] font-bold text-emerald-700 block pt-0.5">
                      Approved Schedule: {approvedTimeLabel}
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target Venue</span>
                  <span
                    className="text-xs font-bold text-slate-900 flex items-center gap-1 block truncate"
                    title={inquiry.venue}
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 inline" />
                    <span className="truncate">{inquiry.venue}</span>
                  </span>
                </CardContent>
              </Card>

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Estimated Guests</span>
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
                <span>Requested Services, Packages & Customizations</span>
              </h4>
              {selectionDetails?.selectionMode && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-[#1E3A8A] border-blue-200 font-bold">
                  Mode: {formatSelectionModeLabel(selectionDetails.selectionMode)}
                </Badge>
              )}
            </div>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 space-y-3.5">
              {/* Selected Package Block */}
              {(matchedPackage || inquiry.packageId) && (
                <div className="p-3.5 rounded-md bg-purple-50/80 border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-purple-900">
                          Selected Package: {matchedPackage?.name || packageCustom?.packageName || inquiry.packageId}
                        </div>
                        <div className="text-[10px] text-purple-700">
                          {matchedPackage?.tagline || matchedPackage?.capacity || 'Bundled Event Package'}
                        </div>
                      </div>
                    </div>
                    {matchedPackage && typeof matchedPackage.price === 'number' && (
                      <div className="text-xs font-extrabold text-purple-900 shrink-0">
                        ₱{matchedPackage.price.toLocaleString()} PHP
                      </div>
                    )}
                  </div>

                  {packageCustom?.selectedOptions && packageCustom.selectedOptions.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-purple-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                        Selected Package Inclusions & Features ({packageCustom.selectedOptions.length}):
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
                      <span className="font-bold text-purple-900">Client Package Note: </span>
                      {packageCustom.customNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Individual / Add-On Services */}
              {matchedServices.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {inquiry.packageId ? 'Requested Add-On Services:' : 'Requested Individual Services:'}
                  </span>
                  <div className="space-y-2.5">
                    {matchedServices.map((srv) => {
                      const c = srv.custom;
                      const hasPreferences = Boolean(
                        c?.preferredDishes?.trim() ||
                          c?.dietaryRestrictions?.trim() ||
                          c?.preferredActivities?.trim() ||
                          c?.stylingThemeNotes?.trim() ||
                          c?.customNotes?.trim()
                      );

                      return (
                        <div
                          key={srv.id}
                          className="p-3 rounded-md bg-white border border-slate-200 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="text-xs font-extrabold text-slate-900">{srv.name}</span>
                              {srv.category && (
                                <Badge variant="outline" className="text-[9px] text-slate-500">
                                  {srv.category}
                                </Badge>
                              )}
                            </div>
                            {typeof srv.price === 'number' && (
                              <span className="text-xs font-bold text-emerald-700 shrink-0">
                                Base: ₱{srv.price.toLocaleString()} PHP
                              </span>
                            )}
                          </div>

                          {c?.selectedOptions && c.selectedOptions.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-500 block">
                                Selected Service Options ({c.selectedOptions.length}):
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

                          {hasPreferences && (
                            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A] block">
                                Client Service Preferences:
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
                                  <span className="font-bold">Dietary Restrictions / Allergies: </span>
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
                                    <span className="font-bold">Theme / Motif & Color Palette: </span>
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
              ) : !matchedPackage && !inquiry.packageId ? (
                <div className="text-xs text-slate-500 italic">
                  No specific service or package pre-selected. Custom scope requested.
                </div>
              ) : null}

              {inquiry.budgetRange && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimated Budget Indicator:</span>
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
              <span>Overall Event Notes & Customer Remarks</span>
            </h4>
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap min-h-[70px]">
              {plainNotes || 'No additional custom requirements noted by client.'}
            </div>
          </div>

          {/* Section 5: Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Submitted: {inquiry.submittedAt || 'Recent'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-md text-xs font-semibold"
          >
            Close
          </Button>

          {onCreateQuotation && (
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                onClose();
                onCreateQuotation(inquiry);
              }}
              className="rounded-md text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              <span>Create Official Quotation</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
