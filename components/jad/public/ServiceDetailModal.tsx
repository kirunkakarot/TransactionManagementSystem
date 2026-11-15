import React from 'react';
import { 
  Check, 
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceItem, EventType } from '../types';
import { resolveEventTypeLabels } from './ServicesSection';

interface ServiceDetailModalProps {
  service: ServiceItem | null;
  eventTypes?: EventType[];
  onClose: () => void;
  onInquire: (serviceId: string) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  eventTypes = [],
  onClose,
  onInquire
}) => {
  if (!service) return null;

  const compatibleLabels = resolveEventTypeLabels(service.eventTypes, eventTypes);

  return (
    <Dialog open={!!service} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-2xl p-5 sm:p-7 rounded-2xl max-h-[90dvh] overflow-y-auto">
        {/* Top Image Banner */}
        <div className="relative w-full h-48 sm:h-60 rounded-xl overflow-hidden mb-3 bg-slate-900">
          <img
            src={service.featuredImage}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent"></div>
          
          <Badge className="absolute top-3 left-3 bg-white/95 text-[#1E3A8A] font-bold shadow-xs border-none">
            {service.category}
          </Badge>

          <div className="absolute bottom-3 left-4 right-4">
            <DialogTitle className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
              {service.name}
            </DialogTitle>
          </div>
        </div>

        {/* Compatible Event Types Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-[#1E3A8A]" />
            <span>Compatible Events:</span>
          </span>
          {compatibleLabels.length === 0 ? (
            <Badge variant="secondary" className="text-[11px] bg-blue-50 text-[#1E3A8A] border-blue-200">
              All Event Types
            </Badge>
          ) : (
            compatibleLabels.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="text-[11px] bg-blue-50 text-[#1E3A8A] border-blue-200"
              >
                {label}
              </Badge>
            ))
          )}
        </div>

        {/* Full description */}
        <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
          {service.fullDesc}
        </DialogDescription>

        {/* Inclusions & Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
              <span>Service Highlights</span>
            </h4>
            <div className="space-y-1.5">
              {service.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Included Standard Crew & Gear</span>
            </h4>
            <div className="space-y-1.5">
              {service.inclusions.map((inc, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5"></div>
                  <span className="leading-snug">{inc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quotation CTA */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Tailored Event Rate
            </span>
            <div className="text-base sm:text-lg font-extrabold text-[#1E3A8A]">
              Custom Quotation Upon Inquiry
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Select or customize specific inclusions inside the inquiry form
            </span>
          </div>

          <Button
            variant="brand"
            size="lg"
            onClick={() => {
              onInquire(service.id);
              onClose();
            }}
            className="w-full sm:w-auto font-bold min-h-10 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add to Custom Inquiry</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
