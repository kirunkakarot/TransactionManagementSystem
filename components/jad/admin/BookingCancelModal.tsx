"use client";
import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Calendar, 
  User, 
  Trash2, 
  ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Booking } from '../types';

interface BookingCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onConfirmCancel: (bookingId: string, reason: string) => void;
}

export const BookingCancelModal: React.FC<BookingCancelModalProps> = ({
  isOpen,
  onClose,
  booking,
  onConfirmCancel
}) => {
  const [reasonCategory, setReasonCategory] = useState('Client Request / Personal Emergency');
  const [customNotes, setCustomNotes] = useState('');

  if (!isOpen || !booking) return null;

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customNotes.trim() 
      ? `${reasonCategory}: ${customNotes.trim()}` 
      : reasonCategory;

    onConfirmCancel(booking.id, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-md shadow-2xl border border-red-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-red-600 text-white flex items-center justify-center font-extrabold shadow-sm">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-red-950">Cancel Event Booking</h3>
                <Badge variant="destructive" className="text-[10px]">{booking.id}</Badge>
              </div>
              <p className="text-xs text-red-700">{booking.eventTitle}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Warning Details */}
        <form onSubmit={handleCancelSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">{booking.clientName}</div>
            <div className="text-slate-500">{booking.eventType} • {booking.eventDate}</div>
            <div className="text-slate-500">{booking.venue}</div>
            <div className="text-orange-600 font-extrabold pt-1">Contract: ₱{booking.totalAmount.toLocaleString()} PHP</div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Cancellation Reason Category
            </label>
            <select
              value={reasonCategory}
              onChange={e => setReasonCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:ring-2 focus:ring-red-600"
            >
              <option value="Client Request / Personal Emergency">Client Request / Personal Emergency</option>
              <option value="Severe Weather Disturbance / Typhoon Protocol">Severe Weather Disturbance / Typhoon Protocol</option>
              <option value="Venue Unavailability / Force Majeure">Venue Unavailability / Force Majeure</option>
              <option value="Non-Payment of Reservation Downpayment">Non-Payment of Reservation Downpayment</option>
              <option value="Duplicate Test Record">Duplicate Test Record</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Specific Cancellation Notes (Audit Log)
            </label>
            <textarea
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              placeholder="Additional notes, refund eligibility, or formal client letter reference..."
              rows={3}
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-md bg-red-50/70 border border-red-200 text-red-800 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              This will update the booking status to <strong>Cancelled</strong>, release all assigned crew members, and free the calendar slot.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-md text-xs font-semibold"
            >
              Keep Active
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="rounded-md text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Confirm Cancellation</span>
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

