"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  UserCheck, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Package, 
  Wrench, 
  Check, 
  Boxes,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Booking, 
  ServiceItem, 
  PackageItem, 
  StaffMember, 
  EquipmentResource 
} from '../types';
import { toast } from 'sonner';

interface BookingEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingToEdit: Booking | null;
  existingBookings: Booking[];
  availableStaff: StaffMember[];
  availableServices: ServiceItem[];
  availablePackages: PackageItem[];
  availableEquipment: EquipmentResource[];
  onSaveBooking: (booking: Booking) => void;
}

export const BookingEditorModal: React.FC<BookingEditorModalProps> = ({
  isOpen,
  onClose,
  bookingToEdit,
  existingBookings,
  availableStaff,
  availableServices,
  availablePackages,
  availableEquipment,
  onSaveBooking
}) => {
  const isEditing = Boolean(bookingToEdit);

  // Form State
  const [bookingId, setBookingId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('18th Debut Milestone Celebration');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('23:00');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [status, setStatus] = useState<Booking['status']>('Tentative');
  const [totalAmount, setTotalAmount] = useState<number>(50000);
  const [notes, setNotes] = useState('');

  // Assignments
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  // Generate Reference Number
  const generateNewBookingRef = () => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `BK-${year}-${randomSuffix}`;
  };

  useEffect(() => {
    if (bookingToEdit) {
      setBookingId(bookingToEdit.id);
      setClientName(bookingToEdit.clientName);
      setClientEmail(bookingToEdit.clientEmail);
      setClientPhone(bookingToEdit.clientPhone);
      setEventTitle(bookingToEdit.eventTitle);
      setEventType(bookingToEdit.eventType);
      setEventDate(bookingToEdit.eventDate);
      setStartTime(bookingToEdit.startTime || '17:00');
      setEndTime(bookingToEdit.endTime || '23:00');
      setVenue(bookingToEdit.venue);
      setGuestCount(bookingToEdit.guestCount);
      setStatus(bookingToEdit.status);
      setTotalAmount(bookingToEdit.totalAmount);
      setNotes(bookingToEdit.notes || '');
      setSelectedStaffIds(bookingToEdit.assignedStaff.map(s => s.id));
      setSelectedServiceIds(bookingToEdit.assignedServices || []);
      setSelectedPackageIds(bookingToEdit.assignedPackages || []);
      setSelectedEquipmentIds(bookingToEdit.assignedEquipmentIds || []);
    } else {
      setBookingId(generateNewBookingRef());
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setEventTitle('');
      setEventType('Grand Wedding');
      setEventDate('2026-09-25');
      setStartTime('16:00');
      setEndTime('22:00');
      setVenue('The Glass Garden Pasig');
      setGuestCount(150);
      setStatus('Confirmed');
      setTotalAmount(85000);
      setNotes('');
      setSelectedStaffIds(['st-1', 'st-2', 'st-4']);
      setSelectedServiceIds(['event-decoration', 'entertainment']);
      setSelectedPackageIds(['pkg-wedding']);
      setSelectedEquipmentIds(['eq-1', 'eq-2', 'eq-3']);
    }
  }, [bookingToEdit, isOpen]);

  if (!isOpen) return null;

  // Conflict Detection
  const conflictingBookingsOnDate = existingBookings.filter(b => 
    b.id !== bookingId && 
    b.eventDate === eventDate && 
    b.status !== 'Cancelled'
  );

  const isVenueConflicted = conflictingBookingsOnDate.some(b => 
    b.venue.toLowerCase().trim() === venue.toLowerCase().trim() && venue.trim().length > 0
  );

  // Staff Conflict Check
  const getStaffConflict = (staffId: string) => {
    const conflictingBooking = conflictingBookingsOnDate.find(b => 
      b.assignedStaff.some(s => s.id === staffId)
    );
    return conflictingBooking;
  };

  const handleToggleStaff = (staffId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId) 
        : [...prev, staffId]
    );
  };

  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };

  const handleTogglePackage = (pkgId: string) => {
    setSelectedPackageIds(prev => 
      prev.includes(pkgId) 
        ? prev.filter(id => id !== pkgId) 
        : [...prev, pkgId]
    );
  };

  const handleToggleEquipment = (eqId: string) => {
    setSelectedEquipmentIds(prev => 
      prev.includes(eqId) 
        ? prev.filter(id => id !== eqId) 
        : [...prev, eqId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !eventTitle.trim() || !venue.trim() || !eventDate) {
      toast.error('Please fill in required fields', {
        description: 'Client Name, Event Title, Venue, and Event Date are required.'
      });
      return;
    }

    const assignedStaffObjects = selectedStaffIds.map(id => {
      const found = availableStaff.find(s => s.id === id);
      return {
        id,
        name: found ? found.name : 'Assigned Staff',
        role: found ? found.role : 'Coordinator',
        phone: found ? found.phone : undefined
      };
    });

    const newBooking: Booking = {
      id: bookingId || generateNewBookingRef(),
      inquiryId: bookingToEdit?.inquiryId,
      quotationId: bookingToEdit?.quotationId,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || `${clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      clientPhone: clientPhone.trim() || '0917-000-0000',
      eventTitle: eventTitle.trim(),
      eventType,
      eventDate,
      startTime,
      endTime,
      venue: venue.trim(),
      guestCount: Number(guestCount) || 100,
      status,
      assignedStaff: assignedStaffObjects,
      assignedServices: selectedServiceIds,
      assignedPackages: selectedPackageIds,
      assignedEquipmentIds: selectedEquipmentIds,
      totalAmount: Number(totalAmount) || 0,
      notes: notes.trim(),
      createdAt: bookingToEdit?.createdAt || new Date().toISOString().split('T')[0],
      confirmedAt: status === 'Confirmed' ? (bookingToEdit?.confirmedAt || new Date().toISOString().split('T')[0]) : undefined
    };

    onSaveBooking(newBooking);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E3A8A] text-white flex items-center justify-center font-extrabold shadow-sm">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  {isEditing ? `Edit Booking: ${bookingToEdit?.id}` : 'Create New Event Booking'}
                </h3>
                <Badge variant="blue" className="text-[10px] font-mono">
                  {bookingId}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Confirm event dates, allocate crew leads, assign packages, and prevent scheduling collisions.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Conflict Warning Banner if Collision Detected */}
        {conflictingBookingsOnDate.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Date Notice:</strong> There {conflictingBookingsOnDate.length === 1 ? 'is 1 other event' : `are ${conflictingBookingsOnDate.length} other events`} booked on <strong>{eventDate}</strong>.
                {isVenueConflicted && <span className="text-red-700 font-bold ml-1">âš ï¸ Venue Double-Booking Warning!</span>}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
              Capacity: {conflictingBookingsOnDate.length + 1} / 3 Max Daily
            </Badge>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Section 1: Client & Booking Identity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="font-extrabold text-[#1E3A8A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                <span>1. Booking Reference & Client Information</span>
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setBookingId(generateNewBookingRef())}
                className="text-[10px] h-6 text-[#1E3A8A] font-semibold"
              >
                Regenerate Ref #
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Booking Reference <span className="text-red-500">*</span>
                </label>
                <Input
                  value={bookingId}
                  onChange={e => setBookingId(e.target.value)}
                  placeholder="BK-2026-XXXX"
                  required
                  className="rounded-xl font-mono text-xs font-bold text-[#1E3A8A] bg-blue-50/50 border-blue-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Client Full Name / Company <span className="text-red-500">*</span>
                </label>
                <Input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Aria Ramos / Ayala Corp"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Client Email Address
                </label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Contact Mobile
                </label>
                <Input
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="0917-000-0000"
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Event Title / Headline <span className="text-red-500">*</span>
                </label>
                <Input
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder="e.g. Kenzo & Camille Grand Wedding"
                  required
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Event Category / Type
                </label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:ring-2 focus:ring-[#1E3A8A]"
                >
                  <option value="Grand Wedding">Grand Wedding</option>
                  <option value="18th Debut Milestone Celebration">18th Debut Milestone Celebration</option>
                  <option value="Annual Gala & Product Launch">Annual Gala & Product Launch</option>
                  <option value="Birthday & Jubilee">Birthday & Jubilee</option>
                  <option value="Corporate Summit">Corporate Summit</option>
                  <option value="Anniversary Celebration">Anniversary Celebration</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Event Date, Schedule, Venue & Capacity */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#1E3A8A] text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>2. Event Date, Timing, Venue & Guests</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  required
                  className="rounded-xl text-xs font-bold text-[#1E3A8A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Start Time (Program)
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  End Time (Wrap-up)
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Guest Count (Pax) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="10"
                  max="5000"
                  value={guestCount}
                  onChange={e => setGuestCount(Number(e.target.value))}
                  required
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Event Venue & Hall <span className="text-red-500">*</span>
                </label>
                <Input
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="e.g. Grand Palazzo Royale, Ballroom A"
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Booking Status
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Booking['status'])}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-[#1E3A8A]"
                >
                  <option value="Tentative">Tentative (Slot Held)</option>
                  <option value="Confirmed">Confirmed (Deposit Received)</option>
                  <option value="In Progress">In Progress (Active Ingress)</option>
                  <option value="Completed">Completed</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Staff Roster Assignment (Conflict Aware) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="font-extrabold text-[#1E3A8A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Assign Event Staff & Production Crew ({selectedStaffIds.length} Selected)</span>
              </h4>
              <span className="text-[10px] text-slate-500">Live clash detection enabled</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {availableStaff.map(staff => {
                const isSelected = selectedStaffIds.includes(staff.id);
                const conflict = getStaffConflict(staff.id);

                return (
                  <div
                    key={staff.id}
                    onClick={() => handleToggleStaff(staff.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-purple-50 border-purple-300 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">{staff.name}</span>
                        <span className="text-[10px] text-purple-700 font-semibold">{staff.role}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {conflict && (
                      <div className="mt-2 text-[9px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Also on {conflict.id}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Packages & Services Attached */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#1E3A8A] text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Included Packages & Event Services</span>
            </h4>

            {/* Packages Selector */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">Select All-Inclusive Packages:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availablePackages.map(pkg => {
                  const isSelected = selectedPackageIds.includes(pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handleTogglePackage(pkg.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{pkg.name}</div>
                        <div className="text-[10px] text-indigo-600 font-semibold">₱{pkg.price.toLocaleString()} PHP • {pkg.capacity}</div>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Services Selector */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-bold text-slate-700">Add Individual Event Services:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {availableServices.map(srv => {
                  const isSelected = selectedServiceIds.includes(srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => handleToggleService(srv.id)}
                      className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="font-semibold text-slate-900 truncate">{srv.name}</div>
                        <div className="text-[10px] text-slate-500">₱{srv.startingPrice.toLocaleString()}</div>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-md border shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 5: Contract Value & Operational Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Total Contract Price (PHP) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="500"
                value={totalAmount}
                onChange={e => setTotalAmount(Number(e.target.value))}
                required
                className="rounded-xl text-sm font-extrabold text-[#1E3A8A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Operational Notes & Logistics Directives
              </label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ingress call time, special stage requests, client preferences..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Assigned: <strong className="text-slate-800">{selectedStaffIds.length} Staff</strong> • Total: <strong className="text-[#1E3A8A]">₱{totalAmount.toLocaleString()} PHP</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleSubmit}
              className="rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 mr-1" />
              <span>{isEditing ? 'Update Booking Record' : 'Confirm & Save Booking'}</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

