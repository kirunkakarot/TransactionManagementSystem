"use client";
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Send, 
  Printer, 
  Calendar, 
  Package, 
  Percent, 
  Clock, 
  CheckCircle2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  AlertCircle,
  Download,
  X
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
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Quotation, QuotationLineItem, QuotationDiscount, QuotationAdditionalCharge, InquiryFormData, ServiceItem, PackageItem } from '../types';

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: InquiryFormData | null;
  existingQuotation?: Quotation | null;
  services?: ServiceItem[];
  packages?: PackageItem[];
  onSaveAndSend: (quotation: Quotation) => void | Promise<void>;
}

export const QuotationBuilderModal: React.FC<QuotationBuilderModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  existingQuotation,
  services = [],
  packages = [],
  onSaveAndSend
}) => {
  const [activeView, setActiveView] = useState<'editor' | 'printable'>('editor');

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState(100);

  // Line items
  const [items, setItems] = useState<QuotationLineItem[]>([]);

  // Discounts
  const [discounts, setDiscounts] = useState<QuotationDiscount[]>([]);

  // Additional Charges
  const [additionalCharges, setAdditionalCharges] = useState<QuotationAdditionalCharge[]>([]);

  // Validity
  const [validityDays, setValidityDays] = useState(14);
  const [validUntil, setValidUntil] = useState('');

  // Status & Notes
  const [status, setStatus] = useState<Quotation['status']>('Draft');
  const [notes, setNotes] = useState('Standard equipment setup and professional event management included.');
  const [terms, setTerms] = useState<string[]>([
    'A 50% reservation downpayment is required to lock production crews and calendar slots.',
    'The remaining 50% milestone balance is due 3 days prior to the event date.',
    'Equipment ingress begins 4 to 6 hours before event program call time.',
    'Prices quoted are valid until the specified validity expiration date.'
  ]);

  // Load from inquiry or existing quote
  useEffect(() => {
    if (existingQuotation) {
      setClientName(existingQuotation.clientName);
      setClientEmail(existingQuotation.clientEmail);
      setClientPhone(existingQuotation.clientPhone);
      setEventType(existingQuotation.eventType);
      setEventDate(existingQuotation.eventDate);
      setVenue(existingQuotation.venue);
      setGuestCount(existingQuotation.guestCount);
      setItems(existingQuotation.items);
      setDiscounts(existingQuotation.discounts || []);
      setAdditionalCharges(existingQuotation.additionalCharges || []);
      setValidityDays(existingQuotation.validityDays || 14);
      setValidUntil(existingQuotation.validUntil);
      setStatus(existingQuotation.status);
      setNotes(existingQuotation.notes);
      setTerms(existingQuotation.terms);
    } else if (inquiry) {
      setClientName(inquiry.fullName);
      setClientEmail(inquiry.email);
      setClientPhone(inquiry.phone);
      setEventType(inquiry.eventType);
      setEventDate(inquiry.eventDate);
      setVenue(inquiry.venue);
      setGuestCount(inquiry.guestCount || 100);

      // Populate selected package or services
      const initialItems: QuotationLineItem[] = [];

      if (inquiry.packageId) {
        const pkg = packages.find(p => p.id === inquiry.packageId);
        if (pkg) {
          initialItems.push({
            id: `item-${Date.now()}-pkg`,
            type: 'package',
            name: pkg.name,
            rate: pkg.price,
            quantity: 1,
            amount: pkg.price,
            notes: `All-inclusive bundle (${pkg.capacity || 'Complete'})`
          });
        }
      }

      if (inquiry.selectedServices && inquiry.selectedServices.length > 0) {
        inquiry.selectedServices.forEach(srvId => {
          const srv = services.find(s => s.id === srvId);
          if (srv) {
            initialItems.push({
              id: `item-${Date.now()}-${srv.id}`,
              type: 'service',
              name: srv.name,
              rate: srv.startingPrice,
              quantity: 1,
              amount: srv.startingPrice,
              notes: srv.shortDesc || srv.description || 'Standard Service'
            });
          }
        });
      }

      if (initialItems.length === 0) {
        // Default items if empty
        initialItems.push({
          id: `item-default-1`,
          type: 'service',
          name: 'Thematic Event Styling & Backdrop',
          rate: 25000,
          quantity: 1,
          amount: 25000,
          notes: 'Custom stage styling and entrance arch'
        });
      }

      setItems(initialItems);
      setDiscounts([
        { id: 'disc-init', label: 'Early Bird Privilege (5%)', type: 'percentage', value: 5, amount: 0 }
      ]);
      setAdditionalCharges([
        { id: 'add-init', label: 'City Staging & Sound Logistics Permitting', amount: 3500 }
      ]);

      // Calculate validity date (14 days from now)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14);
      setValidUntil(expiry.toISOString().split('T')[0]);
      setStatus('Draft');
    }
  }, [inquiry, existingQuotation, packages, services]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const calculatedDiscounts = discounts.map(d => {
    const amount = d.type === 'percentage' 
      ? Math.round((subtotal * d.value) / 100)
      : Number(d.value || 0);
    return { ...d, amount };
  });

  const totalDiscount = calculatedDiscounts.reduce((sum, d) => sum + d.amount, 0);
  const totalAdditional = additionalCharges.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalAdditional);
  const requiredDownpayment = Math.round(grandTotal * 0.5);

  // Line item handlers
  const handleAddItem = (type: 'service' | 'package' | 'custom', name: string, rate: number, notes = '') => {
    const newItem: QuotationLineItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      type,
      name,
      rate,
      quantity: 1,
      amount: rate,
      notes
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: 'name' | 'rate' | 'quantity' | 'notes', val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        if (field === 'rate' || field === 'quantity') {
          const qty = field === 'quantity' ? (val === '' ? 0 : Number(val)) : Number(item.quantity);
          const rate = field === 'rate' ? (val === '' ? 0 : Number(val)) : Number(item.rate);
          updated.amount = (qty || 1) * (rate || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Discount handlers
  const handleAddDiscount = () => {
    setDiscounts(prev => [
      ...prev,
      { id: `disc-${Date.now()}`, label: 'Promo Discount', type: 'fixed', value: 5000, amount: 5000 }
    ]);
  };

  const handleUpdateDiscount = (id: string, field: 'label' | 'type' | 'value', val: any) => {
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const handleRemoveDiscount = (id: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
  };

  // Additional charges handlers
  const handleAddCharge = () => {
    setAdditionalCharges(prev => [
      ...prev,
      { id: `charge-${Date.now()}`, label: 'Generator Set Fuel Contingency', amount: 4000 }
    ]);
  };

  const handleUpdateCharge = (id: string, field: 'label' | 'amount', val: any) => {
    setAdditionalCharges(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges(prev => prev.filter(c => c.id !== id));
  };

  const handleValidityChange = (days: number) => {
    setValidityDays(days);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    setValidUntil(expiry.toISOString().split('T')[0]);
  };

  const handleSendToCustomer = async () => {
    if (items.length === 0) {
      toast.error('Cannot send empty quotation', { description: 'Please add at least one service or package.' });
      return;
    }

    const newQuotation: Quotation = {
      id: existingQuotation?.id || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      dbId: existingQuotation?.dbId,
      inquiryId: inquiry?.id || (existingQuotation?.inquiryId || 'INQ-MANUAL'),
      clientName,
      clientEmail,
      clientPhone,
      eventType,
      eventDate,
      venue,
      guestCount,
      items,
      subtotal,
      discounts: calculatedDiscounts,
      additionalCharges,
      grandTotal,
      requiredDownpayment,
      validUntil,
      validityDays,
      status: 'Quotation Sent',
      notes,
      terms,
      createdAt: existingQuotation?.createdAt || new Date().toISOString().split('T')[0],
      sentAt: new Date().toISOString().split('T')[0]
    };

    try {
      await onSaveAndSend(newQuotation);
      onClose();
    } catch (error) {
      // The parent component might handle its own toast, but we should prevent modal closing.
      console.error('Save quotation failed in modal:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 sm:p-8 max-h-[92vh]">
        {/* Header with Title & Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="brand" className="gap-1 px-2.5 py-0.5 text-[10px]">
                <Receipt className="w-3 h-3" />
                <span>Quotation Engine</span>
              </Badge>
              <Badge variant={status === 'Quotation Sent' ? 'blue' : status === 'Deposit Paid' ? 'success' : 'outline'} className="text-[10px]">
                {status}
              </Badge>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-[#1E3A8A] mt-1">
              {existingQuotation ? `Edit Quotation #${existingQuotation.id}` : 'Create Official Quotation'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Build itemized specifications, apply discounts, additional fees, and dispatch to client.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-md bg-slate-100 border border-slate-200">
              <Button
                variant={activeView === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('editor')}
                className="h-7 px-2.5 rounded-md text-xs font-bold"
              >
                Quote Builder
              </Button>
              <Button
                variant={activeView === 'printable' ? 'brand' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('printable')}
                className="h-7 px-2.5 rounded-md text-xs font-bold gap-1"
              >
                <Printer className="w-3 h-3" />
                <span>Printable Letterhead</span>
              </Button>
            </div>
          </div>
        </div>

        {activeView === 'editor' ? (
          <div className="space-y-6 pt-2">
            {/* 1. Client & Event Info Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-md bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Client Info</span>
                <div className="font-bold text-slate-900">{clientName || 'Unspecified'}</div>
                <div className="text-slate-500">{clientEmail} • {clientPhone}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Event Details</span>
                <div className="font-bold text-[#1E3A8A]">{eventType || 'Event'}</div>
                <div className="text-slate-500">{eventDate} • {guestCount} Guests</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Reserved Venue</span>
                <div className="font-semibold text-slate-800 truncate">{venue || 'TBD Venue'}</div>
                <div className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Crew Slot Available
                </div>
              </div>
            </div>

            {/* 2. Quick Add Services & Packages Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Quick-Add Catalog Items</Label>
                <span className="text-[10px] text-slate-500">Click to append to quotation items</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {packages.map(pkg => (
                  <Button
                    key={pkg.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem('package', pkg.name, Number(pkg.price) || 0, `All-inclusive (${pkg.capacity || 'Complete'})`)}
                    className="h-7 px-2.5 rounded-md text-[11px] font-bold text-[#1E3A8A] bg-blue-50/50 hover:bg-blue-100/70 border-blue-200"
                  >
                    <Package className="w-3 h-3 text-orange-500 mr-1" />
                    + {pkg.name.split(' ')[0]} Pkg (₱{(Number(pkg.price) || 0).toLocaleString()})
                  </Button>
                ))}

                {services.map(srv => (
                  <Button
                    key={srv.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddItem('service', srv.name, Number(srv.startingPrice) || 0, srv.shortDesc || srv.description || '')}
                    className="h-7 px-2 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border-slate-200"
                  >
                    <Plus className="w-2.5 h-2.5 text-slate-400 mr-1" />
                    {srv.name}
                  </Button>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddItem('custom', 'Custom Specialized Service', 10000, 'Custom client requirement')}
                  className="h-7 px-2 rounded-md text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100"
                >
                  <Plus className="w-3 h-3 text-orange-500 mr-1" />
                  + Custom Item
                </Button>
              </div>
            </div>

            {/* 3. Itemized Line Items Table */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Itemized Service & Equipment Inclusions ({items.length})
                </Label>
                <span className="text-xs font-extrabold text-[#1E3A8A]">
                  Subtotal: ₱{subtotal.toLocaleString()} PHP
                </span>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200 gap-2 text-xs">
                    <div className="flex-1 w-full sm:w-auto grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5 font-bold">
                        <Input
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="h-8 text-xs font-bold"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <Input
                          placeholder="Notes / Specifications"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                          className="h-8 text-[11px] text-slate-500"
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Rate ₱</span>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate === 0 ? '' : item.rate}
                          placeholder="0"
                          onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value)}
                          className="h-8 text-xs font-extrabold text-[#1E3A8A]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <span className="font-extrabold text-slate-900 text-sm">
                        ₱{item.amount.toLocaleString()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="p-6 rounded-md bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No items in this quotation yet. Use the quick-add buttons above to add services.
                  </div>
                )}
              </div>
            </div>

            {/* 4. Discounts & Additional Charges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Discounts Box */}
              <div className="p-4 rounded-md bg-white border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    Applied Discounts
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDiscount}
                    className="h-6 px-2 text-[10px] rounded-md text-emerald-700 font-bold border-emerald-200"
                  >
                    + Discount
                  </Button>
                </div>

                <div className="space-y-2">
                  {calculatedDiscounts.map(d => (
                    <div key={d.id} className="flex items-center gap-2 p-2 rounded-md bg-emerald-50/50 border border-emerald-200 text-xs">
                      <Input
                        value={d.label}
                        onChange={(e) => handleUpdateDiscount(d.id, 'label', e.target.value)}
                        className="h-7 text-[11px] font-semibold bg-white flex-1"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={d.value === 0 ? '' : d.value}
                          placeholder="0"
                          onChange={(e) => handleUpdateDiscount(d.id, 'value', e.target.value === '' ? 0 : Number(e.target.value))}
                          className="h-7 text-xs font-bold bg-white text-emerald-700"
                        />
                        <span className="text-[10px] text-emerald-800">{d.type === 'percentage' ? '%' : '₱'}</span>
                      </div>
                      <span className="font-extrabold text-emerald-700 text-xs shrink-0">
                        -₱{d.amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDiscount(d.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {calculatedDiscounts.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic py-1">No promotional discounts applied.</div>
                  )}
                </div>
              </div>

              {/* Additional Charges Box */}
              <div className="p-4 rounded-md bg-white border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-orange-600" />
                    Additional Charges / Surcharges
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCharge}
                    className="h-6 px-2 text-[10px] rounded-md text-orange-700 font-bold border-orange-200"
                  >
                    + Add Charge
                  </Button>
                </div>

                <div className="space-y-2">
                  {additionalCharges.map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded-md bg-orange-50/50 border border-orange-200 text-xs">
                      <Input
                        value={c.label}
                        onChange={(e) => handleUpdateCharge(c.id, 'label', e.target.value)}
                        className="h-7 text-[11px] font-semibold bg-white flex-1"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={c.amount === 0 ? '' : c.amount}
                          placeholder="0"
                          onChange={(e) => handleUpdateCharge(c.id, 'amount', e.target.value === '' ? 0 : Number(e.target.value))}
                          className="h-7 text-xs font-bold bg-white text-orange-700"
                        />
                      </div>
                      <span className="font-extrabold text-orange-700 text-xs shrink-0">
                        +₱{Number(c.amount).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCharge(c.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {additionalCharges.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic py-1">No additional logistical charges.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Validity & Total Milestone Summary */}
            <div className="p-5 rounded-md bg-gradient-to-r from-blue-50 via-slate-50 to-orange-50 border border-blue-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Quotation Validity Expiry
                  </Label>
                  <div className="flex items-center gap-2">
                    {[7, 14, 30].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleValidityChange(d)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                          validityDays === d ? 'bg-[#1E3A8A] text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                    <Input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="h-8 text-xs bg-white w-36"
                    />
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Grand Total Amount:
                  </span>
                  <div className="text-3xl font-extrabold text-[#1E3A8A]">
                    ₱{grandTotal.toLocaleString()} <span className="text-sm font-normal text-slate-600">PHP</span>
                  </div>
                  <div className="text-xs text-orange-700 font-extrabold flex items-center justify-start sm:justify-end gap-1">
                    <span>Required 50% Downpayment: ₱{requiredDownpayment.toLocaleString()} PHP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="default"
                onClick={onClose}
                className="w-full sm:w-auto font-semibold"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setActiveView('printable')}
                  className="font-bold text-[#1E3A8A] gap-1.5 rounded-lg"
                >
                  <Printer className="w-4 h-4 text-orange-500" />
                  <span>Preview Print</span>
                </Button>

                <Button
                  variant="brand"
                  size="default"
                  onClick={handleSendToCustomer}
                  className="w-full sm:w-auto font-bold shadow-md gap-2 rounded-lg"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Send Quotation to Client</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* PRINTABLE LETTERHEAD VIEW */
          <div className="space-y-6 pt-2">
            <div className="p-6 sm:p-8 rounded-md bg-white border border-slate-200 shadow-sm space-y-6 print:m-0 print:border-none print:shadow-none">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b pb-6 border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-[#1E3A8A] flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
                    J
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#1E3A8A]">JAD EVENTS</h2>
                    <p className="text-xs text-slate-500">Transaction Management System • Official Quotation</p>
                    <p className="text-[11px] text-slate-400">Metro Manila & Southern Luzon • jadevents.ph</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-[#1E3A8A]">
                    REF #{existingQuotation?.id || 'QT-2026-PENDING'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Date Issued: {new Date().toISOString().split('T')[0]}</div>
                  <div className="text-xs text-orange-600 font-bold">Valid Until: {validUntil}</div>
                </div>
              </div>

              {/* Bill To & Event Details */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Client Recipient</span>
                  <div className="text-sm font-bold text-slate-900">{clientName}</div>
                  <div className="text-slate-600">{clientEmail}</div>
                  <div className="text-slate-600">{clientPhone}</div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Event Specifications</span>
                  <div className="text-sm font-bold text-[#1E3A8A]">{eventType}</div>
                  <div className="text-slate-600">{eventDate} • {guestCount} Expected Guests</div>
                  <div className="text-slate-600">{venue}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2">Description & Inclusions</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.notes}</div>
                        </td>
                        <td className="py-3 text-center font-medium">{item.quantity}</td>
                        <td className="py-3 text-right">₱{item.rate.toLocaleString()}</td>
                        <td className="py-3 text-right font-bold text-slate-900">₱{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Downpayment Summary */}
              <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Inclusions:</span>
                  <span>₱{subtotal.toLocaleString()} PHP</span>
                </div>

                {calculatedDiscounts.map(d => (
                  <div key={d.id} className="flex justify-between text-emerald-700 font-semibold">
                    <span>{d.label}:</span>
                    <span>-₱{d.amount.toLocaleString()} PHP</span>
                  </div>
                ))}

                {additionalCharges.map(c => (
                  <div key={c.id} className="flex justify-between text-orange-700 font-semibold">
                    <span>{c.label}:</span>
                    <span>+₱{Number(c.amount).toLocaleString()} PHP</span>
                  </div>
                ))}

                <div className="flex justify-between text-base font-extrabold text-[#1E3A8A] pt-2 border-t border-slate-200">
                  <span>Grand Total Contract Amount:</span>
                  <span>₱{grandTotal.toLocaleString()} PHP</span>
                </div>

                <div className="flex justify-between text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-md border border-emerald-200">
                  <span>Required 50% Booking Downpayment:</span>
                  <span>₱{requiredDownpayment.toLocaleString()} PHP</span>
                </div>
              </div>

              {/* Terms & Payment Instructions */}
              <div className="text-[11px] text-slate-500 space-y-1.5 bg-slate-50 p-4 rounded-md border border-slate-200">
                <div className="font-bold text-slate-800">Standard Booking Terms:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {terms.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <div className="font-bold text-slate-900 mt-1">JAD Events Executive Director</div>
                  <div className="text-[10px] text-slate-500">Authorized Signatory</div>
                </div>
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <div className="font-bold text-slate-900 mt-1">{clientName}</div>
                  <div className="text-[10px] text-slate-500">Client Conforme & Signature</div>
                </div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => setActiveView('editor')}
                className="font-semibold"
              >
                Back to Editor
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handlePrint}
                  className="font-bold text-[#1E3A8A] gap-1.5"
                >
                  <Printer className="w-4 h-4 text-orange-500" />
                  <span>Print / Save PDF</span>
                </Button>

                <Button
                  variant="brand"
                  size="default"
                  onClick={handleSendToCustomer}
                  className="font-bold shadow-md gap-2"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Dispatch Official Quotation</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

