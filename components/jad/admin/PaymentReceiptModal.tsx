"use client";
import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Building2, 
  QrCode, 
  Calendar, 
  CheckCircle2, 
  CreditCard,
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  Check,
  Ban,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Copy,
  Columns,
  FileText,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PaymentTransaction, Booking } from '../types';
import { toast } from 'sonner';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentTransaction | null;
  booking?: Booking | null;
  onVerify?: (paymentId: string) => void;
  onReject?: (paymentId: string, reason: string) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  booking,
  onVerify,
  onReject,
}) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showImageZoom, setShowImageZoom] = useState(false);
  
  // Responsive view mode and proof inspection states
  const [viewMode, setViewMode] = useState<'split' | 'receipt' | 'proof'>('split');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !payment) return null;

  const hasProof = Boolean(payment.proofUrl);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmVerify = () => {
    if (onVerify) {
      onVerify(payment.id);
      onClose();
    }
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection Reason Required', {
        description: 'Please specify the reason for rejecting this payment proof (e.g. Unverified Reference, Incomplete Amount).'
      });
      return;
    }
    if (onReject) {
      onReject(payment.id, rejectionReason.trim());
      setIsRejecting(false);
      setRejectionReason('');
      onClose();
    }
  };

  const handleCopyRefNumber = () => {
    if (payment.referenceNumber) {
      navigator.clipboard.writeText(payment.referenceNumber);
      toast.success('Reference Number Copied', {
        description: payment.referenceNumber
      });
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(2.5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.75, prev - 0.25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  // Determine modal width based on whether proof is available and active view mode
  const modalWidthClass = hasProof && viewMode === 'split'
    ? 'max-w-5xl xl:max-w-6xl'
    : hasProof && viewMode === 'proof'
    ? 'max-w-4xl'
    : 'max-w-3xl';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div 
        className={`bg-white rounded-md sm:rounded-md shadow-2xl border border-slate-200 w-full ${modalWidthClass} max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-all`}
      >
        
        {/* Top Modal Header (Sticky) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                  Payment Details & Official Receipt
                </h3>
                <span className="font-mono text-[11px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {payment.receiptNumber}
                </span>
                <Badge 
                  variant={payment.verified ? 'success' : payment.status === 'Rejected' ? 'destructive' : 'warning'} 
                  className="text-[10px]"
                >
                  {payment.verified ? 'Verified' : payment.status === 'Rejected' ? 'Rejected' : 'Pending Review'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Inspection, reference cross-checking, and electronic acknowledgment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 px-2.5 sm:px-3 rounded-md font-bold gap-1 text-slate-700 hover:text-[#1E3A8A] hover:border-[#1E3A8A] bg-white shadow-sm"
              title="Print official receipt voucher"
            >
              <Printer className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden sm:inline">Print Receipt</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-700"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Modes & Admin Verification Action Bar (Sticky, no-print) */}
        <div className="no-print px-4 sm:px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 text-xs shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher (only shown if proof image is present) */}
          {hasProof ? (
            <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  viewMode === 'split' 
                    ? 'bg-[#1E3A8A] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="View proof screenshot and receipt side-by-side"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side-by-Side</span>
                <span className="sm:hidden">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('receipt')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  viewMode === 'receipt' 
                    ? 'bg-[#1E3A8A] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Focus on official receipt"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('proof')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  viewMode === 'proof' 
                    ? 'bg-[#1E3A8A] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Focus on proof screenshot inspector"
              >
                <Eye className="w-3.5 h-3.5 text-orange-500" />
                <span>Proof Screenshot</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Direct Payment Entry (No Uploaded Proof Screenshot)</span>
            </div>
          )}

          {/* Verification Actions */}
          <div className="flex items-center gap-2">
            {payment.verified ? (
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified by {payment.verifiedBy || 'Administrator'}</span>
              </div>
            ) : payment.status === 'Rejected' ? (
              <div className="flex items-center gap-2">
                <span className="text-red-700 font-bold text-xs bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                  Proof Rejected
                </span>
                <Button
                  size="sm"
                  onClick={handleConfirmVerify}
                  className="text-xs h-7 px-3 rounded-md font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Override & Verify
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isRejecting ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Specify rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="text-xs h-8 w-48 sm:w-64 rounded-md bg-white border-slate-300"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsRejecting(false)}
                      className="text-xs h-8 px-2 text-slate-500"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmReject}
                      className="text-xs h-8 px-3 rounded-md font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
                    >
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsRejecting(true)}
                      className="text-xs h-8 px-3 rounded-md font-bold text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1 text-red-500" />
                      Reject Proof
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmVerify}
                      className="text-xs h-8 px-4 rounded-md font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Verify Payment
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rejection Notice Banner (if rejected) */}
        {payment.status === 'Rejected' && payment.rejectionReason && (
          <div className="no-print px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span><strong>Rejection Reason:</strong> {payment.rejectionReason}</span>
            </div>
            {payment.rejectedAt && (
              <span className="text-[10px] text-red-600">Timestamp: {payment.rejectedAt}</span>
            )}
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
          
          {/* Case 1: Has Proof and in Split View */}
          {hasProof && viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Proof Screenshot Inspector */}
              <div className="space-y-4 no-print bg-white p-4 sm:p-5 rounded-md border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-800">Uploaded Payment Proof</span>
                  </div>
                  
                  {/* Zoom & Inspection Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      className="h-7 w-7 p-0 rounded-md text-slate-600 hover:bg-slate-100"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      className="h-7 w-7 p-0 rounded-md text-slate-600 hover:bg-slate-100"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRotate}
                      className="h-7 w-7 p-0 rounded-md text-slate-600 hover:bg-slate-100"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetView}
                      className="h-7 w-7 p-0 rounded-md text-slate-600 hover:bg-slate-100"
                      title="Reset View"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageZoom(true)}
                      className="h-7 px-2 text-[11px] rounded-md text-slate-700 hover:text-[#1E3A8A] font-medium gap-1"
                      title="Fullscreen Lightbox"
                    >
                      <Maximize2 className="w-3 h-3 text-orange-500" />
                      <span>Expand</span>
                    </Button>
                    <a
                      href={payment.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Open Original in New Tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Scalable Image Viewport */}
                <div 
                  className="relative rounded-md border border-slate-200 bg-slate-900/5 min-h-[380px] max-h-[540px] flex items-center justify-center overflow-auto p-4 select-none"
                  style={{ cursor: zoomLevel > 1 ? 'grab' : 'zoom-in' }}
                  onClick={() => {
                    if (zoomLevel === 1) setShowImageZoom(true);
                  }}
                >
                  { }
                  <img
                    src={payment.proofUrl}
                    alt="Payment Proof Screenshot"
                    className="max-h-[500px] w-auto object-contain rounded-md shadow-sm transition-transform duration-200"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center'
                    }}
                  />
                  {zoomLevel !== 1 && (
                    <div className="absolute bottom-2 left-2 bg-slate-900/75 text-white text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Scale: {Math.round(zoomLevel * 100)}%
                    </div>
                  )}
                </div>

                {/* Quick Metadata Verification Strip */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Channel & Ref #</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono font-bold text-slate-800 truncate" title={payment.referenceNumber}>
                        {payment.referenceNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRefNumber}
                        className="text-slate-400 hover:text-blue-600 p-1"
                        title="Copy Reference Number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-md bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Reported Amount</span>
                    <span className="font-extrabold text-sm text-emerald-800 block mt-0.5">
                      ₱{payment.amount.toLocaleString()} PHP
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Tip: Use the toolbar buttons above to zoom, rotate, or expand to full resolution.
                </p>
              </div>

              {/* Right Column: Official Receipt Document */}
              <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                {renderOfficialReceiptDocument()}
              </div>

            </div>
          )}

          {/* Case 2: Proof Only Mode */}
          {hasProof && viewMode === 'proof' && (
            <div className="max-w-4xl mx-auto space-y-4 no-print bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-sm text-slate-800">High-Resolution Payment Proof Inspection</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    className="h-8 px-2.5 text-xs font-bold gap-1"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom In</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    className="h-8 px-2.5 text-xs font-bold gap-1"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Zoom Out</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                    className="h-8 px-2.5 text-xs font-bold gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetView}
                    className="h-8 px-2.5 text-xs font-bold gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowImageZoom(true)}
                    className="h-8 px-3 text-xs font-bold bg-[#1E3A8A] text-white gap-1"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fullscreen</span>
                  </Button>
                </div>
              </div>

              <div 
                className="relative rounded-md border border-slate-200 bg-slate-950/5 min-h-[460px] max-h-[680px] flex items-center justify-center overflow-auto p-6"
                style={{ cursor: zoomLevel > 1 ? 'grab' : 'zoom-in' }}
                onClick={() => {
                  if (zoomLevel === 1) setShowImageZoom(true);
                }}
              >
                { }
                <img
                  src={payment.proofUrl}
                  alt="Payment Proof Screenshot"
                  className="max-h-[640px] w-auto object-contain rounded-md shadow-md transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-md bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Payment Channel & Ref</span>
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <span>{payment.method}</span>
                    <span>•</span>
                    <span className="font-mono text-[#1E3A8A]">{payment.referenceNumber}</span>
                    <button onClick={handleCopyRefNumber} className="text-slate-400 hover:text-blue-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Amount Settled</span>
                  <span className="font-extrabold text-base text-emerald-700">
                    ₱{payment.amount.toLocaleString()} PHP
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Client Name</span>
                  <span className="font-bold text-slate-800">
                    {payment.clientName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Case 3: Receipt Focus Mode or No Proof Available */}
          {(!hasProof || viewMode === 'receipt') && (
            <div className="max-w-3xl mx-auto bg-white rounded-md sm:rounded-md border border-slate-200 shadow-sm overflow-hidden">
              {renderOfficialReceiptDocument()}
            </div>
          )}

        </div>

      </div>

      {/* Lightbox / Fullscreen Image Zoom Overlay */}
      {showImageZoom && payment.proofUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowImageZoom(false)}
        >
          {/* Floating Controls Bar */}
          <div 
            className="flex items-center justify-between w-full max-w-4xl px-4 py-2 mb-3 bg-slate-900/80 border border-white/10 rounded-md text-white text-xs backdrop-blur-md z-70"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs">Payment Proof Lightbox</span>
              <span className="font-mono text-slate-400 text-[11px]">({payment.referenceNumber})</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="h-8 px-2 text-white hover:bg-white/10"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="h-8 px-2 text-white hover:bg-white/10"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 px-2 text-white hover:bg-white/10"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetView}
                className="h-8 px-2 text-white hover:bg-white/10"
                title="Reset Zoom"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageZoom(false)}
                className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/20 ml-2"
                title="Close fullscreen"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div 
            className="relative max-w-5xl max-h-[85vh] flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            { }
            <img
              src={payment.proofUrl}
              alt="Zoomed Payment Proof"
              className="max-h-[80vh] w-auto max-w-[90vw] rounded-md object-contain shadow-2xl transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for the Printable Official Receipt Document
  function renderOfficialReceiptDocument() {
    if (!payment) return null;

    return (
      <div className="p-5 sm:p-7 md:p-8 space-y-6 text-slate-800 bg-white" id="official-receipt-print">
        
        {/* Header Branding */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center font-extrabold text-sm">
                J
              </div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight text-[#1E3A8A]">
                JAD EVENTS PH
              </h2>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Event Production, Staging & Full Transaction Management<br />
              Metro Manila & Southern Luzon, Philippines<br />
              TIN: 489-102-991-000 • ops@jadevents.ph
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 inline-block">
              OFFICIAL RECEIPT
            </div>
            <div className="font-extrabold text-sm sm:text-base text-slate-900 font-mono">
              {payment.receiptNumber}
            </div>
            <div className="text-[11px] text-slate-500">
              Date: <strong>{payment.date}</strong>
            </div>
          </div>
        </div>

        {/* Client & Booking Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 rounded-md bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Received From (Client)</span>
            <span className="font-bold text-slate-900 block text-sm">{payment.clientName}</span>
            <span className="text-slate-500 text-[11px] truncate block">{payment.clientEmail}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Event & Booking Reference</span>
            <span className="font-bold text-[#1E3A8A] block font-mono">
              {payment.bookingId || payment.quotationId || 'Pending Booking Conversion'}
            </span>
            <span className="text-slate-600 text-[11px] block truncate">
              {booking?.eventTitle || 'Event Reservation'}
            </span>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-md border border-slate-200 text-xs">
            <table className="w-full text-left min-w-[480px]">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Payment Classification</th>
                  <th className="p-3">Payment Channel</th>
                  <th className="p-3">Transaction Trace #</th>
                  <th className="p-3 text-right">Amount (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-bold text-slate-900">
                    <div>{payment.type}</div>
                    {payment.notes && <div className="text-[10px] text-slate-400 font-normal">{payment.notes}</div>}
                  </td>
                  <td className="p-3 text-slate-600">{payment.method}</td>
                  <td className="p-3 font-mono font-semibold text-slate-700 text-[11px]">
                    {payment.referenceNumber}
                  </td>
                  <td className="p-3 text-right font-extrabold text-sm sm:text-base text-emerald-700">
                    ₱{payment.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Paid Summary */}
          <div className="flex flex-wrap justify-between items-center gap-2 p-3.5 sm:p-4 rounded-md bg-slate-900 text-white text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL AMOUNT RECEIVED</span>
              <span className="font-bold text-xs sm:text-sm text-emerald-400">
                PHP {payment.amount.toLocaleString()}.00 PESOS ONLY
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-extrabold text-white">
                ₱{payment.amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Verification & Signature Seal */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center p-1 shrink-0">
              <QrCode className="w-8 h-8 sm:w-10 sm:h-10 text-slate-700" />
            </div>
            <div className="space-y-0.5">
              <div className={`flex items-center gap-1 font-bold text-[11px] ${payment.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {payment.verified ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0" />}
                <span>{payment.verified ? 'Verified & Cleared in Escrow' : 'Pending Administrative Verification'}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Verified by: <strong>{payment.verifiedBy || (payment.verified ? 'JAD Finance Officer' : 'Unverified')}</strong>
              </div>
              {payment.verifiedAt && (
                <div className="text-[9px] text-slate-400 font-mono">
                  Timestamp: {payment.verifiedAt}
                </div>
              )}
            </div>
          </div>

          <div className="text-right space-y-1 ml-auto">
            <div className="h-8 border-b border-slate-300 w-28 sm:w-32 ml-auto"></div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold">Authorized Signatory</span>
            <span className="text-[11px] font-bold text-slate-800">JAD Events Operations</span>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-200">
          Thank you for celebrating with JAD Events! This document serves as an official electronic acknowledgment of your transaction.
        </div>

      </div>
    );
  }
};
