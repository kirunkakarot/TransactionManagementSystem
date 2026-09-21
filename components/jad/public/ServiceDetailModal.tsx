import React from 'react';
import { 
  Check, 
  PlusCircle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceItem } from '../types';

interface ServiceDetailModalProps {
  service: ServiceItem | null;
  onClose: () => void;
  onInquire: (serviceId: string) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  onClose,
  onInquire
}) => {
  if (!service) return null;

  return (
    <Dialog open={!!service} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-6 sm:p-8">
        {/* Top Image Banner */}
        <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden mb-4 bg-slate-900 -mt-2">
          <img
            src={service.featuredImage}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>
          
          <Badge className="absolute top-3 left-3 bg-white text-[#1E3A8A] font-bold shadow-sm">
            {service.category}
          </Badge>

          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              {service.name}
            </h3>
          </div>
        </div>

        {/* Full description */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
          {service.fullDesc}
        </p>

        {/* Inclusions & Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Service Highlights</span>
            </h4>
            <div className="space-y-1.5">
              {service.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Included Standard Crew & Gear</span>
            </h4>
            <div className="space-y-1.5">
              {service.inclusions.map((inc, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5"></div>
                  <span>{inc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Standard Starting Rate</span>
            <div className="text-2xl font-extrabold text-[#1E3A8A]">
              ₱{service.startingPrice.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">PHP</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">Customizable in Portal Quotation</span>
          </div>

          <Button
            variant="brand"
            size="default"
            onClick={() => {
              onInquire(service.id);
              onClose();
            }}
            className="w-full sm:w-auto font-bold"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add to Custom Inquiry</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

