"use client";
import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  RefreshCw, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Booking } from '../types';
import { toast } from 'sonner';

interface BookingRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  existingBookings: Booking[];
  onConfirmReschedule: (bookingId: string, newDate: string, newStartTime: string, newEndTime: string, reason: string) => void;
}

export const BookingRescheduleModal: React.FC<BookingRescheduleModalProps> = ({
  isOpen,
  onClose,
  booking,
  existingBookings,
  onConfirmReschedule
}) => {
  const [newDate, setNewDate] = useState(booking?.eventDate || '');
  const [newStartTime, setNewStartTime] = useState(booking?.startTime || '17:00');
  const [newEndTime, setNewEndTime] = useState(booking?.endTime || '23:00');
  const [reason, setReason] = useState('Client requested schedule movement due to venue availability.');

  if (!isOpen || !booking) return null;

  // Conflict Detection on Target Date
  const conflictingBookingsOnNewDate = existingBookings.filter(b => 
    b.id !== booking.id && 
    b.eventDate === newDate && 
    b.status !== 'Cancelled'
  );

  const isSameVenueBooked = conflictingBookingsOnNewDate.some(b => 
    b.venue.toLowerCase().trim() === booking.venue.toLowerCase().trim()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newDate === booking.eventDate && newStartTime === booking.startTime) {
      toast.warning('No Date Change Detected', {
        description: 'Please pick a new event date or time to reschedule.'
      });
      return;
    }

    if (!reason.trim()) {
      toast.error('Reason Required', {
        description: 'Please provide a brief reason or documentation note for rescheduling.'
      });
      return;
    }

    onConfirmReschedule(booking.id, newDate, newStartTime, newEndTime, reason.trim());
    toast.success(`Booking ${booking.id} Rescheduled!`, {
      description: `Moved from ${booking.eventDate} to ${newDate}. Calendar slot and crew re-allocated.`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-md shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-indigo-600 text-white flex items-center justify-center font-extrabold shadow-sm">
              <RefreshCw className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">Reschedule Event Booking</h3>
                <Badge variant="blue" className="text-[10px] font-mono">{booking.id}</Badge>
              </div>
              <p className="text-xs text-slate-500">{booking.eventTitle}</p>
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

        {/* Current Schedule Summary */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Current Confirmed Schedule</span>
          <div className="flex items-center justify-between p-3 rounded-md bg-white border border-slate-200">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>{booking.eventDate} ({booking.startTime || '17:00'} - {booking.endTime || '23:00'})</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{booking.venue}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{booking.status}</Badge>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Select New Event Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              required
              className="rounded-md font-bold text-xs text-[#1E3A8A] h-10"
            />
          </div>

          {/* Conflict Feedback */}
          {conflictingBookingsOnNewDate.length > 0 && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Schedule Clash Alert</span>
              </div>
              <p className="text-[11px] text-amber-800">
                There {conflictingBookingsOnNewDate.length === 1 ? 'is 1 other event' : `are ${conflictingBookingsOnNewDate.length} other events`} booked on this date ({conflictingBookingsOnNewDate.map(b => b.id).join(', ')}).
                {isSameVenueBooked && <strong className="text-red-700 block mt-1">âš ï¸ Warning: Same venue "{booking.venue}" is already booked!</strong>}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                New Start Time
              </label>
              <Input
                type="time"
                value={newStartTime}
                onChange={e => setNewStartTime(e.target.value)}
                className="rounded-md text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                New End Time
              </label>
              <Input
                type="time"
                value={newEndTime}
                onChange={e => setNewEndTime(e.target.value)}
                className="rounded-md text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Rescheduling Reason & Audit Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State reason for reschedule..."
              rows={3}
              required
              className="w-full rounded-md border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="sm"
              className="rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Confirm Reschedule</span>
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

