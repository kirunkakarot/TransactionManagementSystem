"use client";
import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText,
  Trash2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Quotation } from '../types';
import { uploadPaymentProofApi, payQuotationDepositApi } from '@/services/api';
import Cookies from 'js-cookie';

interface SubmitPaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onPaymentSubmitted: () => void;
}

export const SubmitPaymentProofModal: React.FC<SubmitPaymentProofModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onPaymentSubmitted,
}) => {
  const [method, setMethod] = useState('GCash QR');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize amount when quotation changes
  React.useEffect(() => {
    if (quotation) {
      const deposit = quotation.requiredDownpayment || quotation.grandTotal * 0.5;
      setAmount(deposit > 0 ? String(deposit) : '');
    }
  }, [quotation]);

  if (!quotation) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: 'Payment proof screenshot must be less than 5MB.' });
      return;
    }

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file format', { description: 'Please upload an image in JPG, PNG, or WEBP format.' });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!referenceNumber.trim()) {
      toast.error('Reference Number Required', { description: 'Please enter the transaction / reference number from your receipt.' });
      return;
    }

    const numericAmount = Number(amount);
    if (amount === '' || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Invalid Amount', { description: 'Please enter a valid amount paid.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('jad_token') || Cookies.get('token') || Cookies.get('jad_token') || '';
      let proofUrl: string | undefined = undefined;

      // 1. Upload proof image if selected
      if (selectedFile) {
        setIsUploadingProof(true);
        try {
          const uploadRes = await uploadPaymentProofApi(selectedFile, token);
          proofUrl = uploadRes.proofUrl;
        } catch (uploadErr: any) {
          console.warn('Proof upload warning:', uploadErr);
          toast.warning('Proof Upload Notice', { description: 'Proof image upload encountered an issue, recording transaction details...' });
        } finally {
          setIsUploadingProof(false);
        }
      }

      // 2. Submit payment record to API (status: Pending Verification)
      await payQuotationDepositApi(
        quotation.id,
        {
          method,
          referenceNumber: referenceNumber.trim(),
          amount: numericAmount,
          proofUrl,
          notes: notes.trim() || undefined,
        },
        token
      );

      toast.success('Payment Proof Submitted!', {
        description: 'Your payment record is now Pending Administrator Verification. Our finance team will verify it shortly.',
      });

      handleRemoveFile();
      setReferenceNumber('');
      setNotes('');
      onPaymentSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Error submitting payment proof:', err);
      toast.error('Submission Failed', { description: err.message || 'Unable to submit payment record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-md p-6 sm:p-8 bg-white text-slate-800 shadow-2xl border border-slate-200">
        <DialogHeader className="space-y-1 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Manual Payment Recording & Verification</span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-[#1E3A8A] tracking-tight">
            Submit Reservation Downpayment Proof
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Quotation #{quotation.id} • {quotation.eventType} on {quotation.eventDate}
          </DialogDescription>
        </DialogHeader>

        {/* Offline Payment Instructions Banner */}
        <div className="p-4 rounded-md bg-amber-50/80 border border-amber-200/90 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Payment Instructions & External Deposit</span>
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            JAD Events receives payments externally (GCash, BDO/BPI Wire, or Cash/Remittance). Please settle your 50% reservation deposit externally, then upload the payment proof screenshot and transaction reference number below for manual administrator verification.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-white/80 p-2 rounded-md border border-amber-200">
              <span className="text-[10px] text-amber-700 font-bold block">GCash Official Merchant</span>
              <span className="font-mono text-xs font-bold text-slate-900">0917-888-JADE (5233)</span>
            </div>
            <div className="bg-white/80 p-2 rounded-md border border-amber-200">
              <span className="text-[10px] text-amber-700 font-bold block">BDO Corporate Account</span>
              <span className="font-mono text-xs font-bold text-slate-900">0048-9102-9910</span>
            </div>
          </div>
        </div>

        {/* Payment Amount Card */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-md bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-medium block text-[11px]">Quotation Grand Total</span>
            <span className="text-sm font-bold text-slate-900">₱{quotation.grandTotal.toLocaleString()} PHP</span>
          </div>
          <div className="text-right">
            <span className="text-emerald-700 font-bold block text-[11px]">Required 50% Downpayment</span>
            <span className="text-base font-extrabold text-emerald-700">₱{quotation.requiredDownpayment.toLocaleString()} PHP</span>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Payment Channel / Method *</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
              >
                <option value="GCash QR">GCash QR / GCash Transfer</option>
                <option value="BDO Corporate Wire">BDO Corporate Wire / Online Banking</option>
                <option value="BPI Online Transfer">BPI Online Bank Transfer</option>
                <option value="Metrobank Transfer">Metrobank Corporate Transfer</option>
                <option value="Cash / Remittance">Cash / Remittance (Palawan / Cebuana)</option>
                <option value="Other Manual Method">Other Approved Manual Payment</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Reference / Trace Number *</Label>
              <Input
                type="text"
                placeholder="e.g. GCASH-99881234 or 12-digit Ref #"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
                className="h-9 text-xs rounded-md border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Amount Paid (PHP) *</Label>
              <Input
                type="number"
                min="1"
                step="any"
                placeholder="Enter amount paid"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-9 text-xs rounded-md border-slate-200 font-bold text-emerald-700"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="h-9 text-xs rounded-md border-slate-200"
              />
            </div>
          </div>

          {/* Upload Proof of Payment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Upload Proof of Payment (Screenshot / Receipt)</span>
              <span className="text-[10px] text-slate-400 font-normal">JPG, PNG, WEBP (Max 5MB)</span>
            </Label>

            {previewUrl ? (
              <div className="relative rounded-md border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-md bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    { }
                    <img src={previewUrl} alt="Payment Proof Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-bold text-slate-900 block truncate text-xs">{selectedFile?.name}</span>
                    <span className="text-[10px] text-slate-500">{(Number(selectedFile?.size || 0) / 1024).toFixed(1)} KB • Ready for upload</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-md p-4 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-9 h-9 rounded-md bg-blue-50 text-[#1E3A8A] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs">Click to upload payment screenshot</span>
                  <span className="text-[10px] text-slate-400">GCash confirmation slip, bank receipt photo, or deposit slip</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Optional Notes / Remarks</Label>
            <Input
              type="text"
              placeholder="e.g. Paid via Maria Santos GCash account"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-md border-slate-200"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9 px-4 rounded-md border-slate-200 font-semibold text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs h-9 px-5 rounded-md font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {isSubmitting ? (
                isUploadingProof ? 'Uploading Proof...' : 'Submitting...'
              ) : (
                'Submit Payment Proof'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
