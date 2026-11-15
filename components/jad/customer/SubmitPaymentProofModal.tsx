"use client";
import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
  Wallet,
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Quotation } from '../types';
import {
  uploadPaymentProofApi,
  deleteTemporaryPaymentProofApi,
  payQuotationDepositApi,
} from '@/services/api';
import Cookies from 'js-cookie';

interface SubmitPaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onPaymentSubmitted: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGE_DIMENSION = 12000;
const MAX_IMAGE_PIXELS = 50_000_000;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function verifyClientImageDecodable(file: File): Promise<{ valid: boolean; error?: string }> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve({ valid: true });
  }
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(tempUrl);

      if (width < 1 || height < 1) {
        resolve({
          valid: false,
          error: 'The selected image has invalid dimensions. Please select a valid payment screenshot.',
        });
        return;
      }

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) {
        resolve({
          valid: false,
          error: `Image dimensions (${width}x${height} px) exceed the maximum allowed limit (${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} px).`,
        });
        return;
      }

      resolve({ valid: true });
    };
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve({
        valid: false,
        error: 'The selected image file is corrupted or cannot be decoded. Please upload a valid screenshot.',
      });
    };
    img.src = tempUrl;
  });
}

async function verifyClientImageFile(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please select a valid payment screenshot.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `The selected file (${formatFileSize(file.size)}) exceeds the 5 MB maximum size limit. Please choose a smaller screenshot.`,
    };
  }

  const normalizedMime = file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase();
  const extMatch = /\.[^.]+$/.exec(file.name.toLowerCase());
  const ext = extMatch ? extMatch[0] : '';

  if (!ALLOWED_MIME_TYPES.includes(normalizedMime) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file format (${ext || file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`,
    };
  }

  try {
    const headerSlice = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(headerSlice);
    if (bytes.length < 12) {
      return {
        valid: false,
        error: 'The selected file is corrupted or incomplete. Please choose a valid image file.',
      };
    }

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isWebp =
      String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF' &&
      String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      return {
        valid: false,
        error: 'The selected file does not contain valid JPEG, PNG, or WebP image data.',
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Unable to read the selected image file. Please try another file.',
    };
  }

  return await verifyClientImageDecodable(file);
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
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingLockRef = useRef(false);
  const uploadRequestIdRef = useRef(0);

  const getToken = () =>
    (typeof window !== 'undefined' && localStorage.getItem('jad_token')) ||
    Cookies.get('token') ||
    Cookies.get('jad_token') ||
    '';

  useEffect(() => {
    if (quotation) {
      const deposit = quotation.requiredDownpayment || quotation.grandTotal * 0.5;
      setAmount(deposit > 0 ? String(deposit) : '');
    }
  }, [quotation]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!quotation) return null;

  const requiredDeposit = Number(quotation.requiredDownpayment || quotation.grandTotal * 0.5);
  const numericAmount = Number(amount);
  const isAmountValid =
    amount !== '' && !isNaN(numericAmount) && Number.isFinite(numericAmount) && numericAmount >= requiredDeposit;
  const isReferenceValid = referenceNumber.trim().length > 0;
  const isProofReady =
    selectedFile !== null && uploadStatus === 'success' && Boolean(uploadedProofUrl);

  const canSubmit =
    Boolean(method.trim()) &&
    isReferenceValid &&
    isAmountValid &&
    Boolean(paymentDate) &&
    isProofReady &&
    !isSubmitting;

  const performUpload = async (file: File, previousProofUrl: string | null) => {
    const currentRequestId = ++uploadRequestIdRef.current;
    setUploadStatus('uploading');
    setUploadProgress(25);
    setValidationError(null);
    setSubmitError(null);
    setUploadedProofUrl(null);

    try {
      const token = getToken();
      setUploadProgress(60);
      const uploadRes = await uploadPaymentProofApi(
        file,
        token,
        previousProofUrl || undefined
      );

      if (currentRequestId !== uploadRequestIdRef.current) return;

      if (!uploadRes || typeof uploadRes.proofUrl !== 'string' || !uploadRes.proofUrl.trim()) {
        throw new Error('Server did not return a valid payment proof reference.');
      }

      setUploadedProofUrl(uploadRes.proofUrl.trim());
      setUploadProgress(100);
      setUploadStatus('success');
      toast.success('Payment receipt attached.', {
        description: `${file.name} (${formatFileSize(file.size)}) is ready to submit.`,
        icon: <Wallet className="w-4 h-4 text-emerald-600" />,
      });
    } catch (err: any) {
      if (currentRequestId !== uploadRequestIdRef.current) return;
      const errMsg =
        err?.message || 'Unable to upload payment receipt. Please check your connection and try again.';
      setUploadStatus('error');
      setUploadProgress(0);
      setUploadedProofUrl(null);
      setValidationError(errMsg);
      toast.error('Unable to upload payment receipt', { description: errMsg });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    setValidationError(null);
    setSubmitError(null);

    const check = await verifyClientImageFile(file);
    if (!check.valid) {
      setValidationError(check.error || 'Invalid image file selected.');
      toast.error('Invalid Payment Proof Image', {
        description: check.error || 'Please select a valid JPG, PNG, or WebP image under 5 MB.',
      });
      return;
    }

    const previousProofUrl = uploadedProofUrl;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);

    await performUpload(file, previousProofUrl);
  };

  const handleRemoveFile = async (cleanupServerTemp = true) => {
    uploadRequestIdRef.current++;
    const prevUploadedUrl = uploadedProofUrl;

    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedProofUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (cleanupServerTemp && prevUploadedUrl) {
      await deleteTemporaryPaymentProofApi(prevUploadedUrl, getToken());
    }
  };

  const handleCloseModal = async () => {
    if (isSubmitting || uploadStatus === 'uploading') return;
    if (uploadedProofUrl) {
      await deleteTemporaryPaymentProofApi(uploadedProofUrl, getToken());
    }
    await handleRemoveFile(false);
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLockRef.current || isSubmitting || uploadStatus === 'uploading') {
      return;
    }

    setSubmitError(null);

    if (!referenceNumber.trim()) {
      const msg = 'Please enter the transaction or reference number from your payment receipt.';
      setSubmitError(msg);
      toast.error('Reference Number Required', { description: msg });
      return;
    }

    if (!isAmountValid) {
      const msg = `Payment amount must be at least the required 50% downpayment (₱${requiredDeposit.toLocaleString()} PHP).`;
      setSubmitError(msg);
      toast.error('Invalid Payment Amount', { description: msg });
      return;
    }

    if (!selectedFile) {
      const msg = 'No payment proof image selected. Please upload a screenshot or photo of your completed payment.';
      setValidationError(msg);
      toast.error('Payment Proof Required', { description: msg });
      return;
    }

    if (uploadStatus !== 'success' || !uploadedProofUrl) {
      const msg =
        uploadStatus === 'error'
          ? 'Your payment proof upload failed. Please retry uploading or select a valid image before submitting.'
          : 'Please wait for your payment proof image to finish uploading before submitting.';
      setValidationError(msg);
      toast.error('Payment Proof Not Uploaded', { description: msg });
      return;
    }

    isSubmittingLockRef.current = true;
    setIsSubmitting(true);

    try {
      const token = getToken();

      await payQuotationDepositApi(
        quotation.id,
        {
          method,
          referenceNumber: referenceNumber.trim(),
          amount: numericAmount,
          proofUrl: uploadedProofUrl,
          notes: notes.trim() || undefined,
        },
        token
      );

      toast.success('Payment information submitted successfully.', {
        description: 'Your payment is awaiting verification by our team.',
        icon: <Wallet className="w-4 h-4 text-emerald-600" />,
      });

      // Clear modal state without deleting the now-linked payment proof
      await handleRemoveFile(false);
      setReferenceNumber('');
      setNotes('');
      onPaymentSubmitted();
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to submit your payment information. Please verify your details and try again.';
      setSubmitError(errMsg);
      toast.error('Unable to submit payment information', { description: errMsg });
    } finally {
      isSubmittingLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCloseModal();
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-md p-6 sm:p-8 bg-white text-slate-800 shadow-2xl border border-slate-200">
        <DialogHeader className="space-y-1 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Manual Payment Recording &amp; Verification</span>
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
            <span>Payment Instructions &amp; External Deposit</span>
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            JAD Events receives payments externally (GCash, BDO/BPI Wire, or Cash/Remittance). Please settle your 50% reservation deposit externally, then upload the payment proof screenshot and transaction reference number below for manual administrator verification.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
            <span className="text-base font-extrabold text-emerald-700">₱{requiredDeposit.toLocaleString()} PHP</span>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Payment Channel / Method <span className="text-red-500">*</span>
              </Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={isSubmitting}
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
              <Label className="text-xs font-bold text-slate-700">
                Reference / Trace Number <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. GCASH-99881234 or 12-digit Ref #"
                value={referenceNumber}
                onChange={(e) => {
                  setReferenceNumber(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                disabled={isSubmitting}
                required
                className="h-9 text-xs rounded-md border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Amount Paid (PHP) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={requiredDeposit}
                step="any"
                placeholder="Enter amount paid"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                disabled={isSubmitting}
                required
                className="h-9 text-xs rounded-md border-slate-200 font-bold text-emerald-700"
              />
              {amount !== '' && !isAmountValid && (
                <p className="text-[11px] text-red-600 font-medium">
                  Minimum required downpayment is ₱{requiredDeposit.toLocaleString()} PHP.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isSubmitting}
                required
                className="h-9 text-xs rounded-md border-slate-200"
              />
            </div>
          </div>

          {/* Mandatory Payment Proof Upload Section */}
          <div className="p-4 rounded-md border-2 border-blue-200/90 bg-blue-50/25 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-extrabold text-[#1E3A8A] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Upload Payment Proof (Required)</span>
                  <span className="text-red-600">*</span>
                </Label>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Please upload a screenshot or image of your completed payment transaction. Your payment cannot be submitted without this proof.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-white text-[#1E3A8A] border-blue-200 shrink-0">
                JPG, PNG, WebP • Max 5MB
              </Badge>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {selectedFile && previewUrl ? (
              <div
                className={`rounded-md border p-3 space-y-2.5 bg-white ${
                  uploadStatus === 'success'
                    ? 'border-emerald-300'
                    : uploadStatus === 'error'
                    ? 'border-red-300'
                    : 'border-blue-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-16 h-16 rounded-md bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Selected Payment Proof Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="overflow-hidden space-y-1">
                      <span className="font-bold text-slate-900 block truncate text-xs" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                        <span>{formatFileSize(selectedFile.size)}</span>
                        <span>•</span>
                        {uploadStatus === 'uploading' && (
                          <span className="text-blue-700 font-semibold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading proof...
                          </span>
                        )}
                        {uploadStatus === 'success' && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Uploaded &amp; Verified
                          </span>
                        )}
                        {uploadStatus === 'error' && (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            Upload Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {uploadStatus === 'error' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => performUpload(selectedFile, uploadedProofUrl)}
                        className="h-8 px-2.5 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting || uploadStatus === 'uploading'}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-2.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting || uploadStatus === 'uploading'}
                      onClick={() => handleRemoveFile(true)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                      title="Remove selected image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {uploadStatus === 'uploading' && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-1.5" />
                    <span className="text-[10px] text-slate-500 block">
                      Verifying image signature and uploading securely...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => {
                  if (!isSubmitting) fileInputRef.current?.click();
                }}
                className="border-2 border-dashed border-blue-300 hover:border-[#1E3A8A] rounded-md p-5 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/40 group"
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1E3A8A] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-800 text-xs">
                    Click to select and upload payment proof image
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Supported formats: JPEG / JPG, PNG, WebP (Maximum 5 MB)
                  </span>
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{validationError}</span>
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
              disabled={isSubmitting}
              className="h-9 text-xs rounded-md border-slate-200"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              {!isProofReady
                ? uploadStatus === 'uploading'
                  ? 'Waiting for image upload to finish...'
                  : 'Upload a valid payment proof image to enable submission.'
                : !isReferenceValid
                ? 'Enter your payment reference number to proceed.'
                : 'Ready to submit for administrator verification.'}
            </span>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting || uploadStatus === 'uploading'}
                className="text-xs h-9 px-4 rounded-md border-slate-200 font-semibold text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="text-xs h-9 px-5 rounded-md font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs gap-1.5"
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading Proof...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Payment...</span>
                  </>
                ) : (
                  <span>Submit Downpayment Proof</span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
