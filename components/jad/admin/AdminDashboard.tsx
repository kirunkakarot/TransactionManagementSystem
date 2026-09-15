"use client";
import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Receipt, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowLeft, 
  LogOut, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft,
  FileText, 
  Check, 
  X, 
  Layers, 
  ShieldCheck,
  Plus,
  Printer,
  Eye,
  EyeOff,
  Ban,
  Send,
  Lock,
  UserCheck,
  Wrench,
  Package,
  Boxes,
  Power,
  PowerOff,
  Trash2,
  Edit3,
  ExternalLink,
  Tag,
  Star,
  Settings,
  AlertTriangle,
  RefreshCw,
  MapPin,
  CalendarCheck,
  CalendarX,
  Phone,
  Mail,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  LayoutDashboard,
  Menu,
  HardHat,
  Truck,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

import { QuotationBuilderModal } from './QuotationBuilderModal';
import { InquiryDetailModal } from './InquiryDetailModal';
import { ServiceEditorModal } from './ServiceEditorModal';
import { PackageEditorModal } from './PackageEditorModal';
import { EquipmentResourceModal } from './EquipmentResourceModal';
import { BookingEditorModal } from './BookingEditorModal';
import { BookingRescheduleModal } from './BookingRescheduleModal';
import { BookingCancelModal } from './BookingCancelModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { BookingDetailModal } from './BookingDetailModal';
import { CreateAccountModal } from './CreateAccountModal';

import { 
  InquiryFormData, 
  Quotation, 
  ServiceItem, 
  PackageItem, 
  EquipmentResource,
  Booking,
  PaymentTransaction,
  StaffMember,
  SchedulingConflict
} from '../types';

interface AdminDashboardProps {
  userEmail: string;
  inquiries: InquiryFormData[];
  quotations: Quotation[];
  services: ServiceItem[];
  packages: PackageItem[];
  equipmentResources: EquipmentResource[];
  bookings: Booking[];
  payments: PaymentTransaction[];
  staffRoster: StaffMember[];
  onNavigateHome: () => void;
  onLogout: () => void;
  onSwitchToCustomer: () => void;
  onSaveQuotation: (quotation: Quotation) => void;
  onDeleteQuotation?: (quotationId: string) => void;
  onUpdateInquiryStatus: (inquiryId: string, status: InquiryFormData['status']) => void;
  onDeleteInquiry?: (inquiryId: string) => void;
  onVerifyDownpayment: (inquiryId: string) => void;
  onApproveBooking: (inquiryId: string) => void;
  onSaveService: (service: ServiceItem) => void;
  onDeleteService: (serviceId: string) => void;
  onToggleServiceActive: (serviceId: string) => void;
  onSavePackage: (pkg: PackageItem) => void;
  onDeletePackage: (packageId: string) => void;
  onTogglePackageActive: (packageId: string) => void;
  onSaveEquipment: (equipment: EquipmentResource) => void;
  onDeleteEquipment: (equipmentId: string) => void;
  onSaveBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  onRescheduleBooking: (bookingId: string, newDate: string, newStartTime: string, newEndTime: string, reason: string) => void;
  onCancelBooking: (bookingId: string, reason: string) => void;
  onSavePayment: (payment: PaymentTransaction) => void;
  onToggleVerifyPayment: (paymentId: string) => void;
  onVerifyPayment?: (paymentId: string) => void;
  onRejectPayment?: (paymentId: string, reason: string) => void;
  onDeletePayment: (paymentId: string) => void;
  adminToken?: string;
  onAccountCreated?: () => void;
  onToggleStaffStatus?: (staffId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userEmail,
  inquiries,
  quotations,
  services,
  packages,
  equipmentResources,
  bookings,
  payments,
  staffRoster,
  onNavigateHome,
  onLogout,
  onSwitchToCustomer,
  onSaveQuotation,
  onDeleteQuotation,
  onUpdateInquiryStatus,
  onDeleteInquiry,
  onVerifyDownpayment,
  onApproveBooking,
  onSaveService,
  onDeleteService,
  onToggleServiceActive,
  onSavePackage,
  onDeletePackage,
  onTogglePackageActive,
  onSaveEquipment,
  onDeleteEquipment,
  onSaveBooking,
  onDeleteBooking,
  onUpdateBookingStatus,
  onRescheduleBooking,
  onCancelBooking,
  onSavePayment,
  onToggleVerifyPayment,
  onVerifyPayment,
  onRejectPayment,
  onDeletePayment,
  adminToken,
  onAccountCreated,
  onToggleStaffStatus,
}) => {
  // Navigation active view state
  const [activeSection, setActiveSection] = useState<
    'overview' | 'inquiries' | 'quotations' | 'bookings' | 'scheduling' | 'payments' | 'services' | 'packages' | 'equipment' | 'staff' | 'evaluations'
  >('overview');

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search & Filter states
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('ALL');
  const [quotationSearch, setQuotationSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('ALL');
  const [packageSearch, setPackageSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  // Calendar view state (Month navigation)
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 7, 1)); // August 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>('2026-08-28');

  // Simulation & Conflict Checker Tester state
  const [checkDate, setCheckDate] = useState('2026-08-28');
  const [checkVenue, setCheckVenue] = useState('Grand Palazzo Royale, Ballroom A');
  const [checkStaffId, setCheckStaffId] = useState('st-1');

  // Modals state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedInquiryForQuote, setSelectedInquiryForQuote] = useState<InquiryFormData | null>(null);
  const [selectedExistingQuote, setSelectedExistingQuote] = useState<Quotation | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInquiryForDetails, setSelectedInquiryForDetails] = useState<InquiryFormData | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageToEdit, setPackageToEdit] = useState<PackageItem | null>(null);

  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<EquipmentResource | null>(null);

  // Booking Modals
  const [isBookingDetailModalOpen, setIsBookingDetailModalOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  // Payment Modals
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [initialBookingForPayment, setInitialBookingForPayment] = useState<string | undefined>(undefined);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentTransaction | null>(null);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  // Automated Conflict Detection Engine
  const detectConflicts = (): SchedulingConflict[] => {
    const conflicts: SchedulingConflict[] = [];

    // Group bookings by date
    const dateMap = new Map<string, Booking[]>();
    bookings.filter(b => b.status !== 'Cancelled').forEach(b => {
      const list = dateMap.get(b.eventDate) || [];
      list.push(b);
      dateMap.set(b.eventDate, list);
    });

    dateMap.forEach((dateBookings, date) => {
      // 1. Check Venue collisions
      const venueMap = new Map<string, Booking[]>();
      dateBookings.forEach(b => {
        const v = b.venue.toLowerCase().trim();
        if (v) {
          const list = venueMap.get(v) || [];
          list.push(b);
          venueMap.set(v, list);
        }
      });

      venueMap.forEach((vBookings) => {
        if (vBookings.length > 1) {
          conflicts.push({
            id: `conf-v-${date}-${vBookings[0].venue}`,
            type: 'Venue Collision',
            severity: 'High',
            message: `Venue "${vBookings[0].venue}" is booked by ${vBookings.length} events on ${date}: ${vBookings.map(b => b.id).join(', ')}`,
            conflictingBookingIds: vBookings.map(b => b.id),
            conflictingDate: date
          });
        }
      });

      // 2. Check Staff double-booking
      const staffMap = new Map<string, Booking[]>();
      dateBookings.forEach(b => {
        b.assignedStaff.forEach(s => {
          const list = staffMap.get(s.id) || [];
          list.push(b);
          staffMap.set(s.id, list);
        });
      });

      staffMap.forEach((sBookings, staffId) => {
        if (sBookings.length > 1) {
          const staffObj = staffRoster.find(s => s.id === staffId);
          conflicts.push({
            id: `conf-s-${date}-${staffId}`,
            type: 'Staff Double-Booking',
            severity: 'High',
            message: `Staff member "${staffObj ? staffObj.name : staffId}" is assigned to multiple events on ${date}: ${sBookings.map(b => b.id).join(', ')}`,
            conflictingBookingIds: sBookings.map(b => b.id),
            conflictingDate: date
          });
        }
      });

      // 3. Date Overbooking limit (>3 events a day)
      if (dateBookings.length > 3) {
        conflicts.push({
          id: `conf-cap-${date}`,
          type: 'Date Overbooking',
          severity: 'Warning',
          message: `Date ${date} has ${dateBookings.length} events scheduled (Recommended max is 3 per day).`,
          conflictingBookingIds: dateBookings.map(b => b.id),
          conflictingDate: date
        });
      }
    });

    return conflicts;
  };

  const detectedConflicts = detectConflicts();

  // Handlers for Booking Operations
  const handleOpenNewBooking = () => {
    setBookingToEdit(null);
    setIsBookingModalOpen(true);
  };

  const handleViewBookingDetails = (booking: Booking) => {
    setSelectedBookingForDetails(booking);
    setIsBookingDetailModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setBookingToEdit(booking);
    setIsBookingModalOpen(true);
  };

  const handleOpenReschedule = (booking: Booking) => {
    setBookingToReschedule(booking);
    setIsRescheduleModalOpen(true);
  };

  const handleOpenCancel = (booking: Booking) => {
    setBookingToCancel(booking);
    setIsCancelModalOpen(true);
  };

  const handleOpenRecordPaymentForBooking = (bookingId: string) => {
    setInitialBookingForPayment(bookingId);
    setIsRecordPaymentModalOpen(true);
  };

  const handleViewReceipt = (payment: PaymentTransaction) => {
    setSelectedPaymentForReceipt(payment);
    setIsReceiptModalOpen(true);
  };

  // Convert Inquiry to Booking directly
  const handleConvertInquiryToBooking = (inq: InquiryFormData) => {
    const relatedQuote = quotations.find(q => q.inquiryId === inq.id || (inq.dbId && q.inquiryId === inq.dbId.toString()));
    
    // 0. Check if already booked
    const existingBooking = bookings.find(b => 
      b.status !== 'Cancelled' && 
      (b.inquiryId === inq.id || 
       (inq.dbId && b.inquiryId === inq.dbId.toString()) || 
       (relatedQuote && (b.quotationId === relatedQuote.id || (relatedQuote.dbId && b.quotationId === relatedQuote.dbId.toString()))))
    );
    if (existingBooking) {
      toast.info('Already Booked', {
        description: `This inquiry has already been converted into Booking #${existingBooking.id}.`
      });
      return;
    }

    // 1. Check if quotation exists
    if (!relatedQuote) {
      toast.error('Quotation Required', {
        description: 'An official quotation must be created and sent to the customer before converting this inquiry to a booking.'
      });
      return;
    }

    // 2. Check if quotation has been accepted by customer
    const isAccepted = relatedQuote.status === 'Accepted' || relatedQuote.status === 'Deposit Paid' || relatedQuote.status === 'Confirmed' || inq.status === 'Accepted' || inq.status === 'Deposit Paid' || inq.status === 'Confirmed';
    if (!isAccepted) {
      toast.error('Quotation Not Accepted', {
        description: `Quotation #${relatedQuote.id} has not been accepted by the customer yet. Customer must accept the quote first.`
      });
      return;
    }

    // 3. Check downpayment status
    const quotePayments = payments.filter(p => relatedQuote && (
      p.quotationId === relatedQuote.id || 
      (relatedQuote.dbId && p.quotationId === relatedQuote.dbId.toString()) || 
      (inq.dbId && p.bookingId === inq.dbId.toString()) ||
      (p.clientEmail && inq.email && p.clientEmail.toLowerCase() === inq.email.toLowerCase())
    ));
    const hasVerifiedDeposit = quotePayments.some(p => p.verified);
    const pendingPayment = quotePayments.find(p => !p.verified && p.status === 'Pending Verification');
    const hasPendingDeposit = Boolean(pendingPayment);
    const isDepositSettled = relatedQuote.status === 'Deposit Paid' || relatedQuote.status === 'Confirmed' || inq.status === 'Deposit Paid' || inq.status === 'Confirmed' || hasVerifiedDeposit;

    if (!isDepositSettled) {
      if (hasPendingDeposit && pendingPayment) {
        toast.info('Reviewing Payment Proof', {
          description: 'Opening payment proof screenshot for administrator review & verification...'
        });
        handleViewReceipt(pendingPayment);
      } else {
        toast.error('Downpayment Required', {
          description: 'Customer must submit and settle the 50% reservation downpayment before this inquiry can be converted into a confirmed booking.'
        });
      }
      return;
    }

    // Choose available staff from live staff roster
    const defaultStaff = staffRoster.length > 0 
      ? staffRoster.slice(0, 2).map(s => ({ id: s.id, name: s.name, role: s.role }))
      : [
          { id: 'st-1', name: 'Marco Valenzuela', role: 'Lead Director' },
          { id: 'st-4', name: 'Marie Del Rosario', role: 'Event Coordinator' }
        ];

    const newBooking: Booking = {
      id: `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      inquiryId: inq.dbId ? inq.dbId.toString() : (inq.id || 'INQ-MANUAL'),
      quotationId: relatedQuote.id,
      clientName: inq.fullName,
      clientEmail: inq.email,
      clientPhone: inq.phone,
      eventTitle: `${inq.fullName}'s ${inq.eventType}`,
      eventType: inq.eventType,
      eventDate: inq.eventDate,
      startTime: '17:00',
      endTime: '23:00',
      venue: inq.venue,
      guestCount: inq.guestCount,
      status: 'Confirmed',
      assignedStaff: defaultStaff,
      assignedServices: inq.selectedServices || [],
      assignedPackages: inq.packageId ? [inq.packageId] : [],
      totalAmount: relatedQuote.grandTotal || 50000,
      notes: inq.notes,
      createdAt: new Date().toISOString().split('T')[0],
      confirmedAt: new Date().toISOString().split('T')[0]
    };

    onSaveBooking(newBooking);
    onUpdateInquiryStatus(inq.id!, 'Confirmed');
    toast.success('Converted to Confirmed Booking!', {
      description: `Booking #${newBooking.id} created and placed on operational schedule.`
    });
  };

  // Financial Metrics Calculations
  const totalContractBookings = bookings
    .filter(b => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalVerifiedPayments = payments
    .filter(p => p.verified)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingVerificationPaymentsList = payments.filter(p => !p.verified && p.status === 'Pending Verification');
  const pendingInquiriesList = inquiries.filter(i => !i.status || i.status === 'Pending Review');
  const quotationsAwaitingResponse = quotations.filter(q => q.status === 'Quotation Sent');

  const totalOutstandingReceivables = Math.max(0, totalContractBookings - totalVerifiedPayments);

  // Filtered lists
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.clientName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.eventTitle.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.venue.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchesStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.clientName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.method.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      (p.receiptNumber && p.receiptNumber.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (p.bookingId && p.bookingId.toLowerCase().includes(paymentSearch.toLowerCase()));
    
    let matchesFilter = true;
    if (paymentFilter === 'PENDING') matchesFilter = !p.verified && p.status === 'Pending Verification';
    else if (paymentFilter === 'VERIFIED') matchesFilter = p.verified;
    else if (paymentFilter === 'REJECTED') matchesFilter = !p.verified && p.status === 'Rejected';
    return matchesSearch && matchesFilter;
  });

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = 
      inq.fullName.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.email.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.venue.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.eventType.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      (inq.id && inq.id.toLowerCase().includes(inquirySearch.toLowerCase()));
    const matchesStatus = inquiryStatusFilter === 'ALL' || inq.status === inquiryStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredQuotations = quotations.filter(q => 
    q.clientName.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.id.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.inquiryId.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.eventType.toLowerCase().includes(quotationSearch.toLowerCase())
  );

  const filteredServices = services.filter(srv => {
    const matchesSearch = srv.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      srv.category.toLowerCase().includes(serviceSearch.toLowerCase());
    const matchesCat = serviceCategoryFilter === 'ALL' || srv.category === serviceCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(packageSearch.toLowerCase()) ||
    pkg.capacity.toLowerCase().includes(packageSearch.toLowerCase())
  );

  const filteredEquipment = equipmentResources.filter(eq => 
    eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.category.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const filteredStaff = staffRoster.filter(st => 
    st.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    st.role.toLowerCase().includes(staffSearch.toLowerCase())
  );

  // Calendar builders
  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const monthName = currentCalendarDate.toLocaleString('default', { month: 'long' });

  // Upcoming confirmed events sorted
  const upcomingBookings = [...bookings]
    .filter(b => b.status === 'Confirmed' || b.status === 'In Progress')
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  // Sidebar navigation menu configuration
  const sidebarSections = [
    {
      group: 'OVERVIEW',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, badge: null }
      ]
    },
    {
      group: 'RESERVATIONS',
      items: [
        { 
          id: 'inquiries', 
          label: 'Inquiries', 
          icon: Clock, 
          badge: pendingInquiriesList.length > 0 ? `${pendingInquiriesList.length} new` : null, 
          badgeColor: 'bg-amber-100 text-amber-800' 
        },
        { 
          id: 'quotations', 
          label: 'Quotations', 
          icon: Receipt, 
          badge: quotationsAwaitingResponse.length > 0 ? `${quotationsAwaitingResponse.length}` : null,
          badgeColor: 'bg-blue-100 text-blue-800'
        },
        { 
          id: 'bookings', 
          label: 'Bookings', 
          icon: CalendarCheck, 
          badge: bookings.length > 0 ? `${bookings.length}` : null,
          badgeColor: 'bg-slate-100 text-slate-700'
        },
        { 
          id: 'scheduling', 
          label: 'Calendar & Schedule', 
          icon: Calendar, 
          badge: detectedConflicts.length > 0 ? `${detectedConflicts.length} alert` : null,
          badgeColor: 'bg-red-100 text-red-700'
        }
      ]
    },
    {
      group: 'TRANSACTIONS',
      items: [
        { 
          id: 'payments', 
          label: 'Payment Verification', 
          icon: CreditCard, 
          badge: pendingVerificationPaymentsList.length > 0 ? `${pendingVerificationPaymentsList.length} verify` : null,
          badgeColor: 'bg-orange-100 text-orange-800 font-bold'
        }
      ]
    },
    {
      group: 'SERVICES & RESOURCES',
      items: [
        { id: 'services', label: 'Event Services', icon: Wrench, badge: `${services.length}`, badgeColor: 'bg-slate-100 text-slate-600' },
        { id: 'packages', label: 'Packages', icon: Package, badge: `${packages.length}`, badgeColor: 'bg-slate-100 text-slate-600' },
        { id: 'equipment', label: 'Equipment & Inventory', icon: Boxes, badge: `${equipmentResources.length}`, badgeColor: 'bg-slate-100 text-slate-600' }
      ]
    },
    {
      group: 'OPERATIONS',
      items: [
        { id: 'staff', label: 'Staff Roster', icon: Users, badge: `${staffRoster.length}`, badgeColor: 'bg-slate-100 text-slate-600' },
        { 
          id: 'evaluations', 
          label: 'Customer Evaluations', 
          icon: Star, 
          badge: bookings.filter(b => Boolean(b.feedback)).length > 0 ? `${bookings.filter(b => Boolean(b.feedback)).length} reviews` : null, 
          badgeColor: 'bg-amber-100 text-amber-800 font-bold' 
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col">
      {/* ======================================================== */}
      {/* TOP COMMAND HEADER                                       */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden h-9 w-9 text-slate-700"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateHome}
            className="hidden sm:flex text-slate-600 hover:text-[#1E3A8A] gap-1.5 rounded-xl font-semibold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Website</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm tracking-wider text-[#1E3A8A]">JAD EVENTS</span>
                <Badge variant="brand" className="text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold">
                  Command Center
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                Operations, Reservations & Escrow Verification Portal
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {pendingVerificationPaymentsList.length > 0 && (
            <Button
              size="sm"
              onClick={() => setActiveSection('payments')}
              className="text-xs h-8 px-2.5 rounded-xl font-bold bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 flex items-center gap-1.5 shadow-2xs"
            >
              <AlertCircle className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span className="hidden sm:inline">{pendingVerificationPaymentsList.length} Payment Verification Pending</span>
              <span className="sm:hidden">{pendingVerificationPaymentsList.length}</span>
            </Button>
          )}

          <div className="flex items-center gap-2 py-1 pl-2.5 pr-1 rounded-full bg-slate-100/80 border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 hidden lg:inline max-w-[140px] truncate">
              {userEmail}
            </span>
            <Avatar className="w-7 h-7 bg-orange-100 text-orange-800 text-xs font-extrabold">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-slate-500 hover:text-red-600 rounded-xl h-8 w-8 p-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN LAYOUT: SIDEBAR + CONTENT WORKSPACE                */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/90 bg-white p-4 space-y-6 shrink-0 overflow-y-auto max-h-[calc(100vh-4rem)] sticky top-16">
          {sidebarSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 px-3 uppercase block mb-1">
                {sec.group}
              </span>
              <nav className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-[#1E3A8A] font-bold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1E3A8A]' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* MOBILE SIDEBAR DRAWER OVERLAY */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" 
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative w-64 max-w-xs bg-white border-r border-slate-200 p-4 space-y-6 overflow-y-auto z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-extrabold text-[#1E3A8A] tracking-wider">NAVIGATION</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="h-7 w-7 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {sidebarSections.map((sec, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-400 px-3 uppercase block mb-1">
                    {sec.group}
                  </span>
                  <nav className="space-y-0.5">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveSection(item.id as any);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-50 text-[#1E3A8A] font-bold'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1E3A8A]' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* ======================================================== */}
          {/* SECTION 1: DASHBOARD OVERVIEW                            */}
          {/* ======================================================== */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Conflict Banner if detected */}
              {detectedConflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-red-950 text-xs sm:text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Scheduling Conflict Warning ({detectedConflicts.length} Issues Detected)</span>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">Conflict Engine Active</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-red-800">
                    {detectedConflicts.slice(0, 2).map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-red-100">
                        <span>{c.message}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveSection('scheduling')}
                          className="text-[11px] h-6 px-2 text-red-700 font-bold hover:bg-red-100"
                        >
                          Resolve in Calendar →
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact Operational KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setActiveSection('bookings')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Bookings</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#1E3A8A]">
                      {bookings.filter(b => b.status === 'Confirmed' || b.status === 'Tentative' || b.status === 'In Progress').length}
                    </span>
                    <span className="text-xs text-emerald-600 font-bold">
                      {bookings.filter(b => b.status === 'Confirmed').length} Confirmed
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Calendar slots reserved</span>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5 cursor-pointer hover:border-orange-300 transition-colors" onClick={() => setActiveSection('payments')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Verification</span>
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-orange-600">
                      {pendingVerificationPaymentsList.length}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Awaiting Review</span>
                  </div>
                  <span className="text-[11px] text-orange-700 font-semibold block mt-1">Customer payment proofs submitted</span>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5 cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setActiveSection('inquiries')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Inquiries</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {pendingInquiriesList.length}
                    </span>
                    <span className="text-xs text-amber-700 font-bold">Awaiting Quote</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Total inquiries: {inquiries.length}</span>
                </Card>

                <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5 cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => setActiveSection('payments')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Cleared Revenue</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-emerald-700">
                      ₱{(totalVerifiedPayments / 1000).toFixed(0)}k
                    </span>
                    <span className="text-xs text-slate-500 font-medium">PHP Cleared</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Outstanding: ₱{(totalOutstandingReceivables / 1000).toFixed(0)}k PHP</span>
                </Card>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 flex-wrap p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <span className="text-xs font-bold text-slate-600 mr-2">Quick Actions:</span>
                <Button
                  size="sm"
                  variant="brand"
                  onClick={handleOpenNewBooking}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-[#1E3A8A] text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Booking</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedInquiryForQuote(null);
                    setSelectedExistingQuote(null);
                    setIsQuoteModalOpen(true);
                  }}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 text-slate-700"
                >
                  <Receipt className="w-3.5 h-3.5 text-orange-500" />
                  <span>New Quotation</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSection('payments')}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 text-slate-700"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verify Payments ({pendingVerificationPaymentsList.length})</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSection('scheduling')}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 text-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>View Schedule</span>
                </Button>
              </div>

              {/* Today's & Upcoming Events Queue */}
              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-blue-600" />
                      <span>Upcoming Confirmed Events & Production Schedule</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Confirmed events scheduled on the production calendar.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveSection('bookings')}
                    className="text-xs font-bold text-[#1E3A8A] hover:underline"
                  >
                    View All Bookings ({bookings.length}) →
                  </Button>
                </div>

                <div className="divide-y divide-slate-100">
                  {upcomingBookings.slice(0, 5).map(b => (
                    <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] font-bold text-xs flex flex-col items-center justify-center shrink-0 border border-blue-100">
                          <span className="text-[10px] text-slate-500 uppercase">{b.eventDate.slice(5, 7)}</span>
                          <span className="text-sm font-extrabold leading-none">{b.eventDate.slice(8, 10)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{b.eventTitle}</span>
                            <Badge variant={b.status === 'Confirmed' ? 'success' : 'blue'} className="text-[10px] py-0">
                              {b.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-red-500" />
                              <span className="truncate max-w-[180px]">{b.venue}</span>
                            </span>
                            <span>•</span>
                            <span>Client: {b.clientName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="font-mono font-bold text-xs text-[#1E3A8A] mr-2">
                          ₱{b.totalAmount.toLocaleString()} PHP
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewBookingDetails(b)}
                          className="h-7 px-2 text-xs rounded-lg font-bold text-[#1E3A8A] border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          <span>View</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBooking(b)}
                          className="h-7 px-2 text-xs rounded-lg font-semibold"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}

                  {upcomingBookings.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No upcoming confirmed events found.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: INQUIRIES MODULE                              */}
          {/* ======================================================== */}
          {activeSection === 'inquiries' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Customer Inquiry Management</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review incoming customer inquiries, inspect specifications, and issue official itemized quotations.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search inquiries..."
                      value={inquirySearch}
                      onChange={e => setInquirySearch(e.target.value)}
                      className="pl-8 text-xs rounded-xl h-9 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <select
                    value={inquiryStatusFilter}
                    onChange={e => setInquiryStatusFilter(e.target.value)}
                    className="text-xs h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Deposit Paid">Deposit Paid</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              {/* Inquiries Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Ref / Submitted</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Event & Venue</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInquiries.map((inq) => {
                      const relatedQuote = quotations.find(q => q.inquiryId === inq.id || (inq.dbId && q.inquiryId === inq.dbId.toString()));
                      return (
                        <tr key={inq.id || inq.dbId} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-[#1E3A8A] block">#{inq.id || inq.dbId}</span>
                            <span className="text-[10px] text-slate-400">{inq.submittedAt || 'Recent'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{inq.fullName}</div>
                            <div className="text-[11px] text-slate-500">{inq.email} • {inq.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{inq.eventType} ({inq.guestCount} guests)</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-orange-500" />
                              <span>{inq.eventDate}</span>
                              <span>•</span>
                              <span className="truncate max-w-[150px]">{inq.venue}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={inq.status === 'Confirmed' ? 'success' : inq.status === 'Accepted' ? 'blue' : inq.status === 'Quotation Sent' ? 'blue' : inq.status === 'CANCELLED' ? 'destructive' : 'warning'} className="text-[10px]">
                              {inq.status || 'Pending Review'}
                            </Badge>
                            {inq.status === 'CANCELLED' && (
                              <div className="text-[9px] text-red-500 font-medium mt-1">Customer Cancelled</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedInquiryForDetails(inq);
                                  setIsDetailModalOpen(true);
                                }}
                                className="h-7 px-2 text-xs rounded-lg font-semibold"
                                title="View details"
                              >
                                View
                              </Button>

                              {!relatedQuote && inq.status !== 'CANCELLED' && (
                                <Button
                                  size="sm"
                                  variant="brand"
                                  onClick={() => {
                                    setSelectedInquiryForQuote(inq);
                                    setSelectedExistingQuote(null);
                                    setIsQuoteModalOpen(true);
                                  }}
                                  className="h-7 px-2 text-xs rounded-lg font-bold bg-[#1E3A8A] text-white"
                                >
                                  Quote
                                </Button>
                              )}
                              
                              {!relatedQuote && inq.status === 'CANCELLED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="h-7 px-2 text-xs rounded-lg font-bold text-slate-400 bg-slate-100 cursor-not-allowed"
                                >
                                  Quote
                                </Button>
                              )}

                              {relatedQuote && inq.status !== 'Confirmed' && inq.status !== 'CANCELLED' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleConvertInquiryToBooking(inq)}
                                  className="h-7 px-2 text-xs rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Convert inquiry to confirmed booking"
                                >
                                  Book
                                </Button>
                              )}

                              {onDeleteInquiry && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Permanently delete inquiry #${inq.id}?`)) {
                                      onDeleteInquiry(inq.id || inq.dbId?.toString() || '');
                                    }
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: QUOTATIONS MODULE                             */}
          {/* ======================================================== */}
          {activeSection === 'quotations' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>Official Quotations Hub</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track issued quotations, grand totals, 50% reservation downpayment requirements, and validity dates.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search quotations..."
                      value={quotationSearch}
                      onChange={e => setQuotationSearch(e.target.value)}
                      className="pl-8 text-xs rounded-xl h-9 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => {
                      setSelectedInquiryForQuote(null);
                      setSelectedExistingQuote(null);
                      setIsQuoteModalOpen(true);
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Quote</span>
                  </Button>
                </div>
              </div>

              {/* Quotations Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Quote Ref</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Event Date</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-right">50% Downpayment</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuotations.map((quote) => (
                      <tr key={quote.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#1E3A8A] block">#{quote.id}</span>
                          <span className="text-[10px] text-slate-400">Valid: {quote.validUntil}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{quote.clientName}</div>
                          <div className="text-[11px] text-slate-500">{quote.clientEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{quote.eventType}</div>
                          <div className="text-[11px] text-slate-500">{quote.eventDate}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-[#1E3A8A]">
                          ₱{quote.grandTotal.toLocaleString()} PHP
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-orange-600">
                          ₱{quote.requiredDownpayment.toLocaleString()} PHP
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={quote.status === 'Confirmed' ? 'success' : quote.status === 'Accepted' ? 'blue' : 'warning'} className="text-[10px]">
                            {quote.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const inq = inquiries.find(i => i.id === quote.inquiryId) || null;
                                setSelectedInquiryForQuote(inq);
                                setSelectedExistingQuote(quote);
                                setIsQuoteModalOpen(true);
                              }}
                              className="h-7 px-2 text-xs rounded-lg font-semibold"
                            >
                              Edit / Preview
                            </Button>

                            {onDeleteQuotation && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Permanently delete quotation #${quote.id}?`)) {
                                    onDeleteQuotation(quote.id);
                                  }
                                }}
                                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: BOOKINGS MANAGEMENT MODULE                    */}
          {/* ======================================================== */}
          {activeSection === 'bookings' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-blue-600" />
                    <span>Confirmed Bookings & Production Management</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage locked event bookings, reschedule dates, assign crew members, record balance payments, and update statuses.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search bookings..."
                      value={bookingSearch}
                      onChange={e => setBookingSearch(e.target.value)}
                      className="pl-8 text-xs rounded-xl h-9 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <select
                    value={bookingStatusFilter}
                    onChange={e => setBookingStatusFilter(e.target.value)}
                    className="text-xs h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
                  >
                    <option value="ALL">All Bookings</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Tentative">Tentative</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Rescheduled">Rescheduled</option>
                  </select>

                  <Button
                    size="sm"
                    variant="brand"
                    onClick={handleOpenNewBooking}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-[#1E3A8A] text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Booking</span>
                  </Button>
                </div>
              </div>

              {/* Bookings Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Event Date & Venue</th>
                      <th className="py-3 px-4">Assigned Crew</th>
                      <th className="py-3 px-4 text-right">Contract Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewBookingDetails(b)}
                            className="font-mono font-bold text-[#1E3A8A] block hover:underline text-left cursor-pointer"
                            title="Click to view full booking details"
                          >
                            #{b.id}
                          </button>
                          <span className="text-[10px] text-slate-400">{b.eventType}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{b.clientName}</div>
                          <div className="text-[11px] text-slate-500">{b.clientPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-orange-500" />
                            <span>{b.eventDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={b.venue}>
                            {b.venue}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {b.assignedStaff.slice(0, 2).map(st => (
                              <Badge key={st.id} variant="secondary" className="text-[9px] py-0 px-1">
                                {st.name}
                              </Badge>
                            ))}
                            {b.assignedStaff.length > 2 && (
                              <span className="text-[9px] text-slate-400">+{b.assignedStaff.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-[#1E3A8A]">
                          ₱{b.totalAmount.toLocaleString()} PHP
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge 
                              variant={b.status === 'Confirmed' ? 'success' : b.status === 'Completed' ? 'success' : b.status === 'Cancelled' ? 'destructive' : 'blue'}
                              className="text-[10px]"
                            >
                              {b.status}
                            </Badge>
                            {b.status === 'Completed' && (
                              b.feedback ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>{b.feedback.overallRating}/5 Rated</span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400">No review</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Mark booking #${b.id} as COMPLETED? This will unlock customer evaluation.`)) {
                                    onUpdateBookingStatus(b.id, 'Completed');
                                  }
                                }}
                                className="h-7 px-2 text-xs rounded-lg font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1"
                                title="Mark event as Completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Complete</span>
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewBookingDetails(b)}
                              className="h-7 px-2 text-xs rounded-lg font-bold text-[#1E3A8A] border-blue-200 bg-blue-50/50 hover:bg-blue-100 flex items-center gap-1"
                              title="View full booking details, finances, and crew"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBooking(b)}
                              className="h-7 px-2 text-xs rounded-lg font-semibold"
                            >
                              Edit
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenRecordPaymentForBooking(b.id)}
                              className="h-7 px-2 text-xs rounded-lg text-emerald-700 hover:bg-emerald-50"
                              title="Record payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReschedule(b)}
                              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-blue-600"
                              title="Reschedule"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCancel(b)}
                              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600"
                              title="Cancel booking"
                            >
                              <Ban className="w-3 h-3" />
                            </Button>

                            {onDeleteBooking && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Permanently delete booking #${b.id} (${b.clientName} - ${b.eventTitle})? This will release the schedule date and allocated resources.`)) {
                                    onDeleteBooking(b.id);
                                  }
                                }}
                                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600"
                                title="Permanently delete booking"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 5: CALENDAR & SCHEDULING CONFLICT DETECTOR       */}
          {/* ======================================================== */}
          {activeSection === 'scheduling' && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Production Scheduling & Conflict Prevention Engine</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time validation for venue collisions, staff double-booking, and day overbooking.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                      className="h-8 w-8 p-0 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-bold text-xs text-slate-800 min-w-[120px] text-center">
                      {monthName} {calendarYear}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                      className="h-8 w-8 p-0 rounded-lg"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Conflict Status Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  detectedConflicts.length > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {detectedConflicts.length > 0 ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    <span>
                      {detectedConflicts.length > 0 ? `${detectedConflicts.length} Scheduling Conflicts Detected` : 'All Clear — No Scheduling Collisions'}
                    </span>
                  </div>
                  <Badge variant={detectedConflicts.length > 0 ? 'destructive' : 'success'} className="text-[10px]">
                    {detectedConflicts.length > 0 ? 'Action Required' : 'Optimal Capacity'}
                  </Badge>
                </div>

                {/* Calendar Month Grid */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="font-bold text-slate-400 py-1 uppercase text-[10px]">
                      {d}
                    </div>
                  ))}

                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayBookings = bookings.filter(b => b.eventDate === dateStr && b.status !== 'Cancelled');
                    const hasConflict = detectedConflicts.some(c => c.conflictingDate === dateStr);
                    const isSelected = selectedCalendarDay === dateStr;

                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedCalendarDay(dateStr)}
                        className={`min-h-[70px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                          isSelected
                            ? 'ring-2 ring-[#1E3A8A] bg-blue-50/50 border-blue-300'
                            : hasConflict
                            ? 'bg-red-50/60 border-red-200'
                            : dayBookings.length > 0
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-bold text-xs text-slate-700">{day}</span>
                        {dayBookings.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded block truncate">
                              {dayBookings.length} event{dayBookings.length > 1 ? 's' : ''}
                            </span>
                            {hasConflict && (
                              <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1 py-0.2 rounded block truncate">
                                Conflict!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Date Bookings Inspector */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Bookings for Selected Date: {selectedCalendarDay}
                  </h4>
                  <div className="space-y-2">
                    {bookings.filter(b => b.eventDate === selectedCalendarDay).map(b => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{b.eventTitle}</span>
                          <span className="text-slate-500 ml-2">({b.venue})</span>
                        </div>
                        <Badge variant={b.status === 'Confirmed' ? 'success' : 'blue'}>{b.status}</Badge>
                      </div>
                    ))}
                    {bookings.filter(b => b.eventDate === selectedCalendarDay).length === 0 && (
                      <div className="text-xs text-slate-400 italic">No bookings scheduled on this date.</div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 6: PAYMENT VERIFICATION & LEDGER                 */}
          {/* ======================================================== */}
          {activeSection === 'payments' && (
            <div className="space-y-6">
              {/* Prioritized Pending Verification Queue */}
              <Card className="rounded-2xl border-orange-200 bg-orange-50/30 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-orange-200/80">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <h3 className="text-sm font-extrabold text-orange-950">
                        Pending Customer Payment Verification Queue
                      </h3>
                      <p className="text-xs text-orange-800">
                        Proofs of payment uploaded by customers requiring administrator review and bank verification.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-bold">
                    {pendingVerificationPaymentsList.length} Pending
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {pendingVerificationPaymentsList.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl bg-white border border-orange-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{p.clientName}</span>
                          <span className="text-xs text-slate-500 font-mono">Ref #{p.referenceNumber}</span>
                          <Badge variant="warning" className="text-[10px]">Awaiting Review</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Method: <strong>{p.method}</strong> • Amount: <strong className="text-emerald-700">₱{Number(p.amount).toLocaleString()} PHP</strong> • Submitted: {p.date || 'Recent'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewReceipt(p)}
                          className="rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Proof & Verify</span>
                        </Button>
                      </div>
                    </div>
                  ))}

                  {pendingVerificationPaymentsList.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                      All customer payment submissions have been reviewed and verified.
                    </div>
                  )}
                </div>
              </Card>

              {/* All Transactions History Table */}
              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Payment Transactions & Receipts Ledger</span>
                    </h3>
                    <p className="text-xs text-slate-500">Complete transaction history across all event reservations.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-48 sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        placeholder="Search payments..."
                        value={paymentSearch}
                        onChange={e => setPaymentSearch(e.target.value)}
                        className="pl-8 text-xs rounded-xl h-9 bg-slate-50 border-slate-200"
                      />
                    </div>

                    <select
                      value={paymentFilter}
                      onChange={e => setPaymentFilter(e.target.value)}
                      className="text-xs h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
                    >
                      <option value="ALL">All Records</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="PENDING">Pending Review</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-3 px-4">Receipt / Ref</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Method & Date</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-[#1E3A8A]">
                            {p.receiptNumber || p.id}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.clientName}</div>
                            <div className="text-[10px] text-slate-400">Ref: {p.referenceNumber}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{p.method}</div>
                            <div className="text-[10px] text-slate-400">{p.date || 'Recent'}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                            ₱{Number(p.amount).toLocaleString()} PHP
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={p.verified ? 'success' : p.status === 'Rejected' ? 'destructive' : 'warning'} className="text-[10px]">
                              {p.verified ? 'Verified' : p.status || 'Pending'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReceipt(p)}
                              className="h-7 px-2 text-xs rounded-lg font-semibold"
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 7: SERVICES CATALOG MODULE                       */}
          {/* ======================================================== */}
          {activeSection === 'services' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-500" />
                    <span>Event Services Catalog</span>
                  </h3>
                  <p className="text-xs text-slate-500">Manage individual event services, rates, and inclusions.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                      className="pl-8 text-xs rounded-xl h-9 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => {
                      setServiceToEdit(null);
                      setIsServiceModalOpen(true);
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-[#1E3A8A] text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Service</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map(srv => {
                  const isDisabled = srv.isActive === false;
                  return (
                    <div 
                      key={srv.id}
                      className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                        isDisabled ? 'bg-slate-50/85 border-dashed border-red-200 shadow-2xs' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h4 className={`font-bold text-sm ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
                              {srv.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600">
                                {srv.category}
                              </Badge>
                              {isDisabled ? (
                                <Badge variant="outline" className="text-[10px] font-bold bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  <span>Inactive</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Active</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={`text-xs ${isDisabled ? 'text-slate-400' : 'text-slate-600'} line-clamp-2`}>{srv.shortDesc}</p>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Starting Price:</span>
                          <span className="font-extrabold text-[#1E3A8A]">₱{srv.startingPrice.toLocaleString()} PHP</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        {/* Interactive Enable / Disable Button with Red / Green Color Coding */}
                        <Button
                          size="sm"
                          onClick={() => onToggleServiceActive(srv.id)}
                          className={`text-xs h-7.5 px-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${
                            !isDisabled 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 hover:shadow-emerald-200' 
                              : 'bg-red-600 hover:bg-red-700 text-white border border-red-700 hover:shadow-red-200'
                          }`}
                          title={!isDisabled ? 'Service is currently Enabled. Click to Disable.' : 'Service is currently Disabled. Click to Enable.'}
                        >
                          {!isDisabled ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Enabled</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5 text-white" />
                              <span>Disabled</span>
                            </>
                          )}
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setServiceToEdit(srv);
                              setIsServiceModalOpen(true);
                            }}
                            className="text-xs h-7.5 px-2.5 font-bold text-[#1E3A8A] rounded-xl border-slate-200"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteService(srv.id)}
                            className="text-xs h-7.5 w-7.5 p-0 text-slate-400 hover:text-red-600 rounded-xl"
                            title="Delete service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 8: PACKAGES MODULE                               */}
          {/* ======================================================== */}
          {activeSection === 'packages' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Event Packages Management</span>
                  </h3>
                  <p className="text-xs text-slate-500">Create and manage bundled event service packages.</p>
                </div>

                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => {
                    setPackageToEdit(null);
                    setIsPackageModalOpen(true);
                  }}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Package</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPackages.map(pkg => {
                  const isDisabled = pkg.isActive === false;
                  return (
                    <div 
                      key={pkg.id} 
                      className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                        isDisabled ? 'bg-slate-50/85 border-dashed border-red-200 shadow-2xs' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-extrabold text-base ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>{pkg.name}</h4>
                              {isDisabled ? (
                                <Badge variant="outline" className="text-[10px] font-bold bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  <span>Inactive</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Active</span>
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{pkg.tagline}</p>
                          </div>
                          <Badge variant="blue" className="text-[10px] shrink-0">{pkg.capacity}</Badge>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
                          <span className="text-slate-500">Package Rate:</span>
                          <span className="font-extrabold text-base text-[#1E3A8A]">₱{pkg.price.toLocaleString()} PHP</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        {/* Interactive Enable / Disable Button with Red / Green Color Coding */}
                        <Button
                          size="sm"
                          onClick={() => onTogglePackageActive(pkg.id)}
                          className={`text-xs h-7.5 px-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${
                            !isDisabled 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 hover:shadow-emerald-200' 
                              : 'bg-red-600 hover:bg-red-700 text-white border border-red-700 hover:shadow-red-200'
                          }`}
                          title={!isDisabled ? 'Package is currently Enabled. Click to Disable.' : 'Package is currently Disabled. Click to Enable.'}
                        >
                          {!isDisabled ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Enabled</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5 text-white" />
                              <span>Disabled</span>
                            </>
                          )}
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPackageToEdit(pkg);
                              setIsPackageModalOpen(true);
                            }}
                            className="text-xs h-7.5 px-2.5 font-bold text-[#1E3A8A] rounded-xl border-slate-200"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeletePackage(pkg.id)}
                            className="text-xs h-7.5 w-7.5 p-0 text-slate-400 hover:text-red-600 rounded-xl"
                            title="Delete package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 9: EQUIPMENT & INVENTORY MODULE                  */}
          {/* ======================================================== */}
          {activeSection === 'equipment' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>Equipment & Resource Inventory</span>
                  </h3>
                  <p className="text-xs text-slate-500">Track stage lighting, sound engineering hardware, and available units.</p>
                </div>

                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => {
                    setEquipmentToEdit(null);
                    setIsEquipmentModalOpen(true);
                  }}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-[#1E3A8A] text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Equipment</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEquipment.map(eq => (
                  <div key={eq.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{eq.name}</h4>
                        <span className="text-[10px] text-slate-400 uppercase">{eq.category}</span>
                      </div>
                      <Badge variant={eq.condition === 'Excellent' ? 'success' : 'warning'} className="text-[9px]">
                        {eq.condition}
                      </Badge>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Available:</span>
                      <span className="font-bold text-slate-800">{eq.availableUnits} / {eq.quantity} {eq.unit}</span>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEquipmentToEdit(eq);
                          setIsEquipmentModalOpen(true);
                        }}
                        className="text-xs h-7 px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteEquipment(eq.id)}
                        className="text-xs h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 10: STAFF ROSTER MODULE                          */}
          {/* ======================================================== */}
          {activeSection === 'staff' && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Event Operations Staff Roster</span>
                  </h3>
                  <p className="text-xs text-slate-500">Active event directors, stage managers, sound engineers, and coordinators.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search crew & staff..."
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                      className="pl-8 text-xs rounded-xl h-9 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsCreateAccountModalOpen(true)}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shrink-0 shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Add Staff / Admin</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map(st => (
                  <div key={st.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 bg-blue-50 text-[#1E3A8A] text-xs font-extrabold border border-blue-100">
                        <AvatarFallback>{st.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{st.name}</h4>
                        <span className="text-[11px] text-[#1E3A8A] font-semibold block">{st.role}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{st.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{st.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <Badge variant={st.status === 'Available' ? 'success' : 'secondary'} className="text-[10px]">
                        {st.status}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {st.assignedBookingIds?.length || 0} active events
                        </span>
                        {onToggleStaffStatus && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => onToggleStaffStatus(st.id)}
                          >
                            {st.status === 'Available' ? 'Disable' : 'Enable'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ======================================================== */}
          {/* SECTION 11: CUSTOMER EVALUATIONS & FEEDBACK              */}
          {/* ======================================================== */}
          {activeSection === 'evaluations' && (
            <div className="space-y-6">
              {/* Top Aggregate KPI Metrics */}
              {(() => {
                const evaluatedBookings = bookings.filter(b => Boolean(b.feedback));
                const completedBookings = bookings.filter(b => b.status === 'Completed');
                const totalEvaluations = evaluatedBookings.length;
                
                const avgOverall = totalEvaluations > 0 
                  ? (evaluatedBookings.reduce((sum, b) => sum + (b.feedback?.overallRating || 0), 0) / totalEvaluations).toFixed(1)
                  : '0.0';

                const avgService = totalEvaluations > 0 
                  ? (evaluatedBookings.reduce((sum, b) => sum + (b.feedback?.serviceRating || 0), 0) / totalEvaluations).toFixed(1)
                  : '0.0';

                const avgStaff = totalEvaluations > 0 
                  ? (evaluatedBookings.reduce((sum, b) => sum + (b.feedback?.staffRating || 0), 0) / totalEvaluations).toFixed(1)
                  : '0.0';

                const avgExecution = totalEvaluations > 0 
                  ? (evaluatedBookings.reduce((sum, b) => sum + (b.feedback?.executionRating || 0), 0) / totalEvaluations).toFixed(1)
                  : '0.0';

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                      <CardContent className="p-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-slate-400">Average Overall Rating</span>
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-[#1E3A8A] flex items-center gap-1.5">
                          <span>{avgOverall}</span>
                          <span className="text-xs font-normal text-slate-500">/ 5.0</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          Based on {totalEvaluations} customer review{totalEvaluations === 1 ? '' : 's'}
                        </span>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                      <CardContent className="p-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-slate-400">Service Quality</span>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center">
                            <Wrench className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{avgService}</span>
                          <span className="text-xs font-normal text-slate-500">/ 5.0</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          Production & styling rating
                        </span>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                      <CardContent className="p-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-slate-400">Staff Performance</span>
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{avgStaff}</span>
                          <span className="text-xs font-normal text-slate-500">/ 5.0</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          Team professionalism & responsiveness
                        </span>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-5">
                      <CardContent className="p-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-slate-400">Completion & Feedback</span>
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-purple-700">
                          {totalEvaluations} / {completedBookings.length}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {completedBookings.length > 0 
                            ? `${Math.round((totalEvaluations / completedBookings.length) * 100)}% evaluation submission rate`
                            : 'No completed events yet'}
                        </span>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Evaluations List Card */}
              <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1E3A8A] flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Customer Evaluations & Post-Event Feedback</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ratings and qualitative feedback submitted by clients following completed event operations.
                    </p>
                  </div>
                </div>

                {/* Evaluations Grid */}
                {bookings.filter(b => Boolean(b.feedback)).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookings.filter(b => Boolean(b.feedback)).map(b => {
                      const fb = b.feedback!;
                      return (
                        <div 
                          key={fb.id} 
                          className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-200 transition-colors space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewBookingDetails(b)}
                                  className="font-mono text-xs font-bold text-[#1E3A8A] hover:underline cursor-pointer"
                                >
                                  #{b.id}
                                </button>
                                <span className="text-xs font-bold text-slate-900">{b.clientName}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {b.eventTitle} • {b.eventType} ({b.eventDate})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 shrink-0">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-mono text-xs font-extrabold text-amber-900">
                                {fb.overallRating}/5
                              </span>
                            </div>
                          </div>

                          {/* Ratings Matrix */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-400 block font-medium">Service</span>
                              <span className="font-bold text-slate-800">{fb.serviceRating}/5</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-400 block font-medium">Staff</span>
                              <span className="font-bold text-slate-800">{fb.staffRating}/5</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] text-slate-400 block font-medium">Execution</span>
                              <span className="font-bold text-slate-800">{fb.executionRating}/5</span>
                            </div>
                          </div>

                          {/* Written Feedback Comments */}
                          {fb.comments && (
                            <div className="p-3 rounded-xl bg-slate-50/70 text-xs text-slate-700 italic border border-slate-100">
                              "{fb.comments}"
                            </div>
                          )}

                          {/* Suggestions */}
                          {fb.suggestions && (
                            <div className="text-[11px] text-slate-500">
                              <span className="font-bold text-slate-700">Suggestions:</span> {fb.suggestions}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                            <span>Submitted: {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : 'Recent'}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewBookingDetails(b)}
                              className="h-6 px-2 text-[11px] text-[#1E3A8A] font-bold hover:underline"
                            >
                              View Booking
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">No Customer Evaluations Yet</div>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Once administrators mark completed bookings, clients can submit their event experience evaluations here.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

        </main>
      </div>

      {/* ======================================================== */}
      {/* ATTACHED OPERATIONAL MODALS                              */}
      {/* ======================================================== */}

      {/* Inquiry Detail Modal */}
      <InquiryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInquiryForDetails(null);
        }}
        inquiry={selectedInquiryForDetails}
        services={services}
        packages={packages}
        onCreateQuotation={(inq) => {
          setSelectedInquiryForQuote(inq);
          setSelectedExistingQuote(null);
          setIsQuoteModalOpen(true);
        }}
      />

      {/* Quotation Builder Modal */}
      <QuotationBuilderModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        inquiry={selectedInquiryForQuote}
        existingQuotation={selectedExistingQuote}
        services={services}
        packages={packages}
        onSaveAndSend={onSaveQuotation}
      />

      {/* Service Editor Modal */}
      <ServiceEditorModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        serviceToEdit={serviceToEdit}
        onSaveService={onSaveService}
        availableResources={equipmentResources}
      />

      {/* Package Editor Modal */}
      <PackageEditorModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        packageToEdit={packageToEdit}
        onSavePackage={onSavePackage}
        availableServices={services}
      />

      {/* Equipment Resource Modal */}
      <EquipmentResourceModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        resourceToEdit={equipmentToEdit}
        onSaveResource={onSaveEquipment}
        availableServices={services}
      />

      {/* Booking Editor Modal */}
      <BookingEditorModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingToEdit={bookingToEdit}
        existingBookings={bookings}
        availableStaff={staffRoster}
        availableServices={services}
        availablePackages={packages}
        availableEquipment={equipmentResources}
        onSaveBooking={onSaveBooking}
      />

      {/* Booking Reschedule Modal */}
      <BookingRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        booking={bookingToReschedule}
        existingBookings={bookings}
        onConfirmReschedule={onRescheduleBooking}
      />

      {/* Booking Cancel Modal */}
      <BookingCancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        booking={bookingToCancel}
        onConfirmCancel={onCancelBooking}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        bookings={bookings}
        quotations={quotations}
        existingPayments={payments}
        initialBookingId={initialBookingForPayment}
        onSavePayment={onSavePayment}
      />

      {/* Payment Receipt / Verification Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedPaymentForReceipt(null);
        }}
        payment={selectedPaymentForReceipt}
        booking={selectedPaymentForReceipt ? bookings.find(b => b.id === selectedPaymentForReceipt.bookingId || (b.dbId && selectedPaymentForReceipt.bookingId === b.dbId.toString())) : null}
        onVerify={(payId) => {
          if (onVerifyPayment) onVerifyPayment(payId);
          else onToggleVerifyPayment(payId);
        }}
        onReject={(payId, reason) => {
          if (onRejectPayment) onRejectPayment(payId, reason);
        }}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isBookingDetailModalOpen}
        onClose={() => {
          setIsBookingDetailModalOpen(false);
          setSelectedBookingForDetails(null);
        }}
        booking={selectedBookingForDetails}
        payments={payments}
        quotations={quotations}
        inquiries={inquiries}
        onEditBooking={handleEditBooking}
        onRescheduleBooking={handleOpenReschedule}
        onCancelBooking={handleOpenCancel}
        onRecordPayment={handleOpenRecordPaymentForBooking}
        onDeleteBooking={onDeleteBooking}
        onUpdateBookingStatus={onUpdateBookingStatus}
      />

      {/* Privileged Account Creation Modal (Admin-Only) */}
      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
        onSuccess={() => {
          if (onAccountCreated) onAccountCreated();
        }}
        token={adminToken || ''}
      />
    </div>
  );
};
