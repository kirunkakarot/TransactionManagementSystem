"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  Receipt, 
  Calendar, 
  Check, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Booking, PaymentTransaction, Quotation } from '../types';
import { toast } from 'sonner';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  quotations: Quotation[];
  existingPayments: PaymentTransaction[];
  initialBookingId?: string;
  onSavePayment: (payment: PaymentTransaction) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  bookings,
  quotations,
  existingPayments,
  initialBookingId,
  onSavePayment
}) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialBookingId || (bookings[0]?.id || ''));
  const [paymentType, setPaymentType] = useState<PaymentTransaction['type']>('Downpayment (50%)');
  const [amount, setAmount] = useState<string | number>('');
  const [method, setMethod] = useState<PaymentTransaction['method']>('GCash QR');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [verified, setVerified] = useState(true);
  const [notes, setNotes] = useState('');

  // Selected Booking Details
  const activeBooking = bookings.find(b => b.id === selectedBookingId) || bookings[0];

  // Calculate existing payments for this booking
  const totalPaidSoFar = existingPayments
    .filter(p => {
      if (!p.verified) return false;
      const matchesBookingId = p.bookingId === selectedBookingId || (activeBooking?.dbId !== undefined && p.bookingId === String(activeBooking.dbId));
      const matchesQuotationId = Boolean(activeBooking?.quotationId && p.quotationId && String(p.quotationId) === String(activeBooking.quotationId));
      const matchesInquiryId = Boolean(activeBooking?.inquiryId && p.bookingId === activeBooking.inquiryId);
      return matchesBookingId || matchesQuotationId || matchesInquiryId;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const totalContract = activeBooking ? activeBooking.totalAmount : 0;
  const remainingBalance = Math.max(0, totalContract - totalPaidSoFar);
  const suggested50Percent = Math.round(totalContract * 0.5);

  const generateReceiptNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(5000 + Math.random() * 4999);
    return `OR-${year}-${rand}`;
  };

  const generateRefNo = () => {
    const prefix = method.includes('GCash') ? 'GCASH' : method.includes('BDO') ? 'BDO-TR' : method.includes('BPI') ? 'BPI-TR' : 'CARD';
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  useEffect(() => {
    if (initialBookingId) {
      setSelectedBookingId(initialBookingId);
    }
  }, [initialBookingId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setReceiptNumber(generateReceiptNo());
      setReferenceNumber(generateRefNo());

      if (paymentType === 'Downpayment (50%)') {
        setAmount(suggested50Percent > 0 ? String(suggested50Percent) : '');
      } else if (paymentType === 'Full Settlement') {
        setAmount(remainingBalance > 0 ? String(remainingBalance) : '');
      } else {
        setAmount('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedBookingId]);

  if (!isOpen) return null;

  const handleTypeChange = (type: PaymentTransaction['type']) => {
    setPaymentType(type);
    if (type === 'Downpayment (50%)') {
      setAmount(suggested50Percent > 0 ? String(suggested50Percent) : '');
    } else if (type === 'Full Settlement') {
      setAmount(remainingBalance > 0 ? String(remainingBalance) : '');
    } else {
      setAmount('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (amount === '' || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Invalid Amount', {
        description: 'Please enter a valid positive payment amount.'
      });
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error('Reference Number Required', {
        description: 'Please input the bank transfer or GCash transaction reference.'
      });
      return;
    }

    const newPayment: PaymentTransaction = {
      id: `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      bookingId: selectedBookingId,
      quotationId: activeBooking?.quotationId,
      receiptNumber: receiptNumber || generateReceiptNo(),
      clientName: activeBooking ? activeBooking.clientName : 'Client',
      clientEmail: activeBooking ? activeBooking.clientEmail : 'client@example.com',
      type: paymentType,
      amount: numericAmount,
      method,
      referenceNumber: referenceNumber.trim(),
      date: paymentDate,
      verified,
      verifiedBy: verified ? 'Admin Director' : undefined,
      verifiedAt: verified ? `${paymentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : undefined,
      notes: notes.trim()
    };

    onSavePayment(newPayment);
    toast.success('Payment Recorded Successfully!', {
      description: `Official Receipt #${newPayment.receiptNumber} issued for ₱${newPayment.amount.toLocaleString()} PHP.`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-md shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (Sticky) */}
        <div className="px-6 py-4.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-600 text-white flex items-center justify-center font-extrabold shadow-sm">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">Record Payment & Issue Official Receipt</h3>
                <Badge variant="success" className="text-[10px]">{receiptNumber}</Badge>
              </div>
              <p className="text-xs text-slate-500">Record Downpayment (50%), Partial, or Full Settlement into Escrow Ledger.</p>
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

        {/* Form and Scrollable Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {/* Booking Financial Snapshot */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Select Associated Event Booking:
                </label>
                <select
                  value={selectedBookingId}
                  onChange={e => setSelectedBookingId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-[#1E3A8A]"
                >
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.clientName} ({b.eventTitle}) • Total: ₱{b.totalAmount.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {activeBooking && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Contract Value</span>
                    <span className="font-extrabold text-slate-800 text-sm">₱{totalContract.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Total Paid to Date</span>
                    <span className="font-extrabold text-emerald-600 text-sm">₱{totalPaidSoFar.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Remaining Balance</span>
                    <span className="font-extrabold text-orange-600 text-sm">₱{remainingBalance.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4 text-xs">
          
          {/* Payment Type Tabs */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Payment Classification <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'Downpayment (50%)', label: '50% Downpayment', hint: `₱${suggested50Percent.toLocaleString()}` },
                { type: 'Partial Payment', label: 'Partial Milestone', hint: 'Custom Amount' },
                { type: 'Full Settlement', label: 'Full Settlement', hint: `₱${remainingBalance.toLocaleString()}` },
              ].map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleTypeChange(t.type as PaymentTransaction['type'])}
                  className={`p-2.5 rounded-md border text-left transition-all ${
                    paymentType === t.type 
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-slate-900">{t.label}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Payment Amount (PHP) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                placeholder="Enter payment amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="rounded-md text-base font-extrabold text-emerald-700 h-10"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Payment Method / Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as PaymentTransaction['method'])}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-emerald-600"
              >
                <option value="GCash QR">GCash QR (Escrow)</option>
                <option value="BDO Corporate Wire">BDO Corporate Wire / Online Banking</option>
                <option value="BPI Online Transfer">BPI Online Bank Transfer</option>
                <option value="Credit Card / Maya">Credit Card / Maya Payment Gateway</option>
                <option value="Cash at Office">Cash at JAD Events Office</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Transaction Reference # <span className="text-red-500">*</span>
              </label>
              <Input
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. GCASH-9812401 or Bank Trace #"
                required
                className="rounded-md font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Date Recorded
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="rounded-md text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Internal Verification & Auditing Notes
            </label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Verified via bank mobile app notification, acknowledged by admin..."
              className="rounded-md text-xs"
            />
          </div>

          {/* Verification Switch */}
          <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50/50 border border-emerald-200">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block text-xs">Verify Payment Immediately</span>
              <span className="text-[10px] text-slate-500">
                Mark transaction as verified in escrow ledger and update booking balance.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={verified}
                onChange={e => setVerified(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

            </div>
          </div>

          {/* Action Buttons (Sticky Footer) */}
          <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
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
              className="rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Receipt className="w-3.5 h-3.5 mr-1" />
              <span>Record & Issue Receipt</span>
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

