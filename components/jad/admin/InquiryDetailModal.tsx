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
  Clock
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
import { InquiryFormData, ServiceItem, PackageItem } from '../types';

interface InquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: InquiryFormData | null;
  services?: ServiceItem[];
  packages?: PackageItem[];
  onCreateQuotation?: (inquiry: InquiryFormData) => void;
}

export const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  services = [],
  packages = [],
  onCreateQuotation,
}) => {
  if (!inquiry) return null;

  const matchedPackage = packages.find(p => p.id === inquiry.packageId);
  const matchedServices = (inquiry.selectedServices || []).map(sId => {
    const found = services.find(s => s.id === sId);
    return {
      id: sId,
      name: found ? found.name : sId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      price: found ? found.startingPrice : undefined,
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
                  Customer event specifications and requested package provisions
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
              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Event Type</span>
                  <span className="text-xs font-extrabold text-[#1E3A8A] block">{inquiry.eventType}</span>
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

              <Card className="p-3.5 rounded-md bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target Venue</span>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1 block truncate" title={inquiry.venue}>
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

          {/* Section 3: Selected Services & Packages */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Requested Services & Packages</span>
            </h4>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 space-y-3">
              {matchedPackage && (
                <div className="flex items-center justify-between p-3 rounded-md bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-900">Selected Package: {matchedPackage.name}</div>
                      <div className="text-[10px] text-purple-700">{matchedPackage.tagline || matchedPackage.capacity}</div>
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-purple-900">
                    ₱{matchedPackage.price.toLocaleString()} PHP
                  </div>
                </div>
              )}

              {matchedServices.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 block">Requested Production Services:</span>
                  <div className="flex flex-wrap gap-2">
                    {matchedServices.map(srv => (
                      <Badge key={srv.id} variant="secondary" className="px-2.5 py-1 text-xs bg-white border border-slate-200 text-slate-800 font-semibold gap-1.5 shadow-sm">
                        <Check className="w-3 h-3 text-blue-600" />
                        <span>{srv.name}</span>
                        {srv.price && (
                          <span className="text-[10px] text-emerald-700 font-bold ml-1">
                            (₱{srv.price.toLocaleString()})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : !matchedPackage ? (
                <div className="text-xs text-slate-500 italic">No specific service or package pre-selected. Custom scope requested.</div>
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
              <span>Event Requirements & Customer Notes</span>
            </h4>
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap min-h-[70px]">
              {inquiry.notes || 'No additional custom requirements noted by client.'}
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
