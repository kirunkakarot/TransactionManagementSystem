"use client";
import React, { useState } from 'react';
import { Star, MessageSquare, Send, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Booking } from '../types';
import { submitCustomerFeedbackApi } from '@/services/api';
import { toast } from 'sonner';
import Cookies from 'js-cookie';

interface CustomerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onFeedbackSubmitted: () => void;
}

export const CustomerFeedbackModal: React.FC<CustomerFeedbackModalProps> = ({
  isOpen,
  onClose,
  booking,
  onFeedbackSubmitted,
}) => {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [staffRating, setStaffRating] = useState<number>(5);
  const [executionRating, setExecutionRating] = useState<number>(5);
  const [comments, setComments] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!booking) return null;

  const handleStarClick = (
    category: 'overall' | 'service' | 'staff' | 'execution',
    score: number
  ) => {
    switch (category) {
      case 'overall':
        setOverallRating(score);
        break;
      case 'service':
        setServiceRating(score);
        break;
      case 'staff':
        setStaffRating(score);
        break;
      case 'execution':
        setExecutionRating(score);
        break;
    }
  };

  const renderStarRating = (
    label: string,
    description: string,
    currentScore: number,
    category: 'overall' | 'service' | 'staff' | 'execution'
  ) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-md bg-slate-50 border border-slate-200/80">
      <div>
        <span className="text-xs font-bold text-slate-800 block">{label}</span>
        <span className="text-[11px] text-slate-500 block">{description}</span>
      </div>
      <div className="flex items-center gap-1.5 self-start sm:self-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            className="p-1 hover:scale-110 transition-transform focus:outline-hidden"
            title={`${star} out of 5 stars`}
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= currentScore
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
        <span className="font-mono text-xs font-extrabold text-slate-700 min-w-[28px] text-right">
          {currentScore}/5
        </span>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericBookingId = booking.dbId || parseInt(booking.id.replace('BK-', ''), 10);
    if (!numericBookingId || isNaN(numericBookingId)) {
      setErrorMsg('Invalid booking reference. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token =
        localStorage.getItem('jad_token') ||
        Cookies.get('token') ||
        Cookies.get('jad_token') ||
        '';

      await submitCustomerFeedbackApi(
        {
          bookingId: numericBookingId,
          overallRating,
          serviceRating,
          staffRating,
          executionRating,
          comments,
          suggestions,
        },
        token
      );

      toast.success('Evaluation Submitted!', {
        description: 'Thank you for your valuable feedback. It helps us continually elevate our services.',
      });

      onFeedbackSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setErrorMsg(err.message || 'Failed to submit feedback. Please try again.');
      toast.error('Submission Failed', {
        description: err.message || 'Could not save your evaluation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6 max-h-[90vh] overflow-y-auto bg-white rounded-md shadow-2xl border border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-[#1E3A8A]">
                Event Experience Evaluation
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Booking #{booking.id} • {booking.eventTitle} ({booking.eventDate})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Performance Ratings (1 - 5 Stars)
            </h4>

            {renderStarRating(
              'Overall Experience',
              'How satisfied are you with your overall event experience?',
              overallRating,
              'overall'
            )}

            {renderStarRating(
              'Service & Production Quality',
              'Quality of setups, decor, sound, lighting, and coordination.',
              serviceRating,
              'service'
            )}

            {renderStarRating(
              'Staff & Crew Performance',
              'Professionalism, responsiveness, and attentiveness of our team.',
              staffRating,
              'staff'
            )}

            {renderStarRating(
              'Event Execution & Timeliness',
              'Adherence to schedule, program flow, and setup promptness.',
              executionRating,
              'execution'
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comments" className="text-xs font-bold text-slate-700">
              Your Feedback & Impressions <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="comments"
              placeholder="Tell us what you enjoyed most about our services or memorable moments from your celebration..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              maxLength={2000}
              className="text-xs rounded-md border-slate-200 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suggestions" className="text-xs font-bold text-slate-700">
              Suggestions for Improvement <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="suggestions"
              placeholder="Any areas we could refine or features you would love to see for future events?"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              rows={2}
              maxLength={2000}
              className="text-xs rounded-md border-slate-200 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-bold rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-bold rounded-md bg-[#1E3A8A] hover:bg-blue-900 text-white gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Evaluation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
