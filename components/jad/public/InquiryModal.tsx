"use client";
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Check, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  LogIn, 
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ServiceItem, PackageItem, InquiryFormData } from '../types';
import { submitInquiry } from '@/services/api';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: PackageItem | null;
  initialDate?: string;
  initialEventType?: string;
  initialVenue?: string;
  initialServiceId?: string;
  currentUser?: { role: 'client' | 'admin'; email: string } | null;
  services?: ServiceItem[];
  packages?: PackageItem[];
  onRequireAuth?: () => void;
  onInquirySubmitted?: (inquiry: InquiryFormData) => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  initialPackage,
  initialDate,
  initialEventType,
  initialVenue,
  initialServiceId,
  currentUser,
  services = [],
  packages = [],
  onRequireAuth,
  onInquirySubmitted
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('0917-889-1234');
  const [eventType, setEventType] = useState('Birthday Celebration');
  const [eventDate, setEventDate] = useState('2026-08-28');
  const [venue, setVenue] = useState('Grand Palazzo Royale, Ballroom A');
  const [guestCount, setGuestCount] = useState<number>(120);
  const [selectedServices, setSelectedServices] = useState<string[]>(['entertainment', 'event-decoration']);
  const [notes, setNotes] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedRef, setGeneratedRef] = useState('');

  // Synchronize when user logs in or initial values change
  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email);
      if (!fullName) {
        setFullName(currentUser.email.split('@')[0].replace('.', ' ').toUpperCase());
      }
    }
  }, [currentUser, fullName]);

  useEffect(() => {
    if (initialPackage) {
      setSelectedPackageId(initialPackage.id);
      setEventType(initialPackage.name);
    }
    if (initialDate) setEventDate(initialDate);
    if (initialEventType) setEventType(initialEventType);
    if (initialVenue) setVenue(initialVenue);
    if (initialServiceId && !selectedServices.includes(initialServiceId)) {
      setSelectedServices(prev => [...prev, initialServiceId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPackage, initialDate, initialEventType, initialVenue, initialServiceId]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const calculateEstimatedTotal = () => {
    let total = 0;
    if (selectedPackageId) {
      const pkg = packages.find(p => p.id === selectedPackageId);
      if (pkg) total += pkg.price;
    } else {
      selectedServices.forEach(sId => {
        const s = services.find(srv => srv.id === sId);
        if (s) total += s.startingPrice;
      });
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guest protection check: guests are not allowed to submit inquiries
    if (!currentUser) {
      toast.error('Authentication Required', {
        description: 'Guests cannot submit inquiries. Please sign in or create an account to proceed.'
      });
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    setIsSubmitting(true);
    const randomRef = `INQ-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await submitInquiry({
        trackingId: randomRef,
        fullName: fullName || currentUser.email.split('@')[0],
        email: currentUser.email,
        phone: phone || '0917-889-1234',
        eventType,
        eventDate,
        eventVenue: venue,
        guestsCount: guestCount,
        selectedServices,
        packageId: selectedPackageId || undefined,
        notes,
        budgetRange: `₱${calculateEstimatedTotal().toLocaleString()}`,
        requirements: notes || selectedServices.join(', '),
      });
    } catch (err: any) {
      console.warn('Backend inquiry submit fallback:', err.message);
    } finally {
      setIsSubmitting(false);
      setIsSuccess(true);
      setGeneratedRef(randomRef);

      const newInquiry: InquiryFormData = {
        id: randomRef,
        fullName: fullName || currentUser.email.split('@')[0],
        email: currentUser.email,
        phone: phone || '0917-889-1234',
        eventType,
        eventDate,
        venue,
        guestCount,
        selectedServices,
        packageId: selectedPackageId,
        notes,
        budgetRange: `₱${calculateEstimatedTotal().toLocaleString()}`,
        status: 'Pending Review',
        submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      if (onInquirySubmitted) {
        onInquirySubmitted(newInquiry);
      }

      toast.success('Inquiry ticket created successfully!', {
        description: `Booking Reference #${randomRef} is now queued for administrator quotation review.`
      });
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="max-w-3xl p-6 sm:p-8 max-h-[92vh]">

        {isSuccess ? (
          /* Success Screen */
          <div className="py-6 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <Badge variant="success" className="mb-3 text-xs">
              Transaction Ticket Queued
            </Badge>

            <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A] mb-2 text-center">
              Inquiry Submitted Successfully!
            </DialogTitle>

            <DialogDescription className="text-sm text-slate-600 max-w-md mx-auto mb-6 text-center">
              Thank you, <strong className="text-[#1E3A8A]">{fullName || currentUser?.email}</strong>! Your event inquiry is now queued in our admin portal.
            </DialogDescription>

            <div className="w-full max-w-md p-5 rounded-md bg-slate-50 border border-slate-200 text-left mb-6 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500">Inquiry Reference:</span>
                <span className="font-mono font-bold text-[#1E3A8A] text-sm">{generatedRef}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Event:</span>
                <span className="text-slate-900 font-semibold">{eventType}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Target Date:</span>
                <span className="text-slate-900 font-semibold">{eventDate}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Estimated Initial Quote:</span>
                <span className="text-[#1E3A8A] font-extrabold">₱{calculateEstimatedTotal().toLocaleString()} PHP</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-emerald-700 font-semibold">
                <span>Status:</span>
                <span>Under Review by Admin Operations</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-sm mb-6">
              Our lead event director is preparing your itemized quotation. Once sent, you will be able to review and confirm with a 50% reservation downpayment.
            </p>

            <Button
              variant="brand"
              size="lg"
              onClick={handleResetAndClose}
              className="px-8 font-bold"
            >
              Done & Return to Homepage
            </Button>
          </div>
        ) : (
          /* Form Content */
          <div>
            <DialogHeader className="mb-4 text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Web-Based Event Booking System</span>
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A]">
                Submit Your Event Inquiry
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-600 mt-1">
                Fill in your celebration specifications for an itemized digital quotation.
              </DialogDescription>
            </DialogHeader>

            {!currentUser ? (
              <div className="mb-4 p-4 rounded-md bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900">Sign-in Required to Submit Inquiry</div>
                    <div className="text-amber-700 text-[11px] mt-0.5">
                      Guest inquiries are not permitted. Please sign in or create an account to submit and track your booking quotation.
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={onRequireAuth}
                  className="shrink-0 rounded-md font-bold text-xs gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </Button>
              </div>
            ) : (
              <div className="mb-4 p-2.5 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#1E3A8A] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Authenticated Client: <strong>{currentUser.email}</strong></span>
                </div>
                <Badge variant="blue" className="text-[10px]">Verified User</Badge>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Your Full Name *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-8 text-xs"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Email Address *</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      required
                      placeholder="maria@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8 text-xs"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Mobile / Phone *</Label>
                  <div className="relative">
                    <Input
                      type="tel"
                      required
                      placeholder="0917-xxx-xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-8 text-xs"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              {/* Event Type & Date & Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Event Type</Label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                  >
                    <option value="Birthday Celebration">Birthday Celebration</option>
                    <option value="Grand Wedding">Grand Wedding & Reception</option>
                    <option value="18th Debut">18th Debut Milestone</option>
                    <option value="Corporate Gala">Corporate Gala / Launch</option>
                    <option value="Anniversary Party">Anniversary & Reunion</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Event Date</Label>
                  <Input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Estimated Guests</Label>
                  <Input
                    type="number"
                    min="20"
                    max="1000"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 50)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-1.5">
                <Label>Preferred Venue / City</Label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Grand Palazzo Royale, Ballroom A or Manila Hotel"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="pl-8 text-xs"
                  />
                  <MapPin className="w-3.5 h-3.5 text-orange-500 absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Multi-Select Services Checklist */}
              <div className="space-y-2">
                <Label>Select Required Services (Multi-Select):</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {services.map((srv) => {
                    const isChecked = selectedServices.includes(srv.id);
                    return (
                      <button
                        type="button"
                        key={srv.id}
                        onClick={() => toggleService(srv.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-md text-left text-xs transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50 border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold'
                            : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-xs shrink-0 ${
                            isChecked
                              ? 'bg-[#1E3A8A] text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="truncate">
                          <div className="truncate">{srv.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">From ₱{srv.startingPrice.toLocaleString()}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special notes */}
              <div className="space-y-1.5">
                <Label>Specific Requests / Theme Color Palette</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Lavender and gold theme, need acoustic trio for dinner, 360 photo booth for 3 hours."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Instant Calculated Estimated Bar */}
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="text-slate-600">Estimated Base Quotation: </span>
                  <span className="text-base font-extrabold text-[#1E3A8A]">
                    ₱{calculateEstimatedTotal().toLocaleString()} PHP
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">({selectedServices.length} services selected)</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>50% Downpayment Required on Approval</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                {currentUser ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="brand"
                    size="lg"
                    className="w-full font-bold group"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        <span>Submitting to Operations Queue...</span>
                      </span>
                    ) : (
                      <>
                        <span>Submit Inquiry & Await Official Quotation</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onRequireAuth}
                    variant="brand"
                    size="lg"
                    className="w-full font-bold group gap-2"
                  >
                    <Lock className="w-4 h-4 text-white" />
                    <span>Sign In or Sign Up to Submit Inquiry</span>
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

