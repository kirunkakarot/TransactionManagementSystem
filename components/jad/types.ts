export interface EquipmentResource {
  id: string;
  name: string;
  category: string;
  quantity: number;
  availableUnits: number;
  unit: string;
  condition: 'Excellent' | 'Good' | 'Needs Maintenance';
  assignedServiceId?: string;
  notes?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  shortDesc: string;
  fullDesc: string;
  description?: string;
  iconName: string;
  startingPrice: number;
  featuredImage: string;
  features: string[];
  inclusions: string[];
  isActive?: boolean;
  equipmentResources?: EquipmentResource[];
}

export interface PackageItem {
  id: string;
  name: string;
  tagline: string;
  capacity: string;
  price: number;
  originalPrice?: number;
  isPopular?: boolean;
  isActive?: boolean;
  idealFor: string;
  inclusions: string[];
  features: string[];
  servicesIncluded?: string[];
}

export interface WorkflowStep {
  stepNumber: string;
  title: string;
  shortDesc: string;
  customerAction: string;
  systemAction: string;
  iconName: string;
  category: 'Inquiry & Quote' | 'Booking & Payment' | 'Execution & Wrap-up';
}

export interface InquiryFormData {
  id?: string;
  dbId?: number;
  fullName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  venue: string;
  guestCount: number;
  selectedServices: string[];
  packageId?: string;
  notes: string;
  budgetRange?: string;
  status?: 'Pending Review' | 'Quotation Sent' | 'Accepted' | 'Deposit Paid' | 'Confirmed' | 'Declined' | 'CANCELLED' | 'Cancelled';
  submittedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface QuotationLineItem {
  id: string;
  type: 'service' | 'package' | 'custom';
  name: string;
  rate: number;
  quantity: number;
  amount: number;
  notes?: string;
}

export interface QuotationDiscount {
  id: string;
  label: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

export interface QuotationAdditionalCharge {
  id: string;
  label: string;
  amount: number;
}

export interface Quotation {
  id: string;
  dbId?: number;
  inquiryId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  venue: string;
  guestCount: number;
  items: QuotationLineItem[];
  subtotal: number;
  discounts: QuotationDiscount[];
  additionalCharges: QuotationAdditionalCharge[];
  grandTotal: number;
  requiredDownpayment: number;
  validUntil: string;
  validityDays: number;
  status: 'Draft' | 'Quotation Sent' | 'Accepted' | 'Deposit Paid' | 'Confirmed' | 'Expired' | 'Declined';
  notes: string;
  terms: string[];
  createdAt: string;
  sentAt?: string;
  depositPaidAt?: string;
  confirmedAt?: string;
}

// Staff & Crew Member Type
export interface StaffMember {
  id: string;
  name: string;
  role: 'Lead Director' | 'Sound Engineer' | 'Lighting Tech' | 'Master of Ceremonies' | 'Photo/Video Lead' | 'Event Coordinator' | 'Stage Manager' | 'Banquet Captain';
  phone: string;
  email: string;
  status: 'Available' | 'Assigned' | 'On Leave';
  avatar?: string;
  skills?: string[];
  assignedBookingIds?: string[];
}

// Booking Management Model
export interface Booking {
  id: string; // e.g. BK-2026-0828
  dbId?: number;
  inquiryId?: string;
  quotationId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventTitle: string;
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  venue: string;
  guestCount: number;
  status: 'Tentative' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rescheduled';
  cancellationReason?: string;
  rescheduledFrom?: string;
  assignedStaff: Array<{
    id: string;
    name: string;
    role: string;
    phone?: string;
  }>;
  assignedServices: string[];
  assignedPackages: string[];
  assignedEquipmentIds?: string[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  feedback?: Feedback | null;
}

// Payment and Transaction Model
export interface PaymentTransaction {
  id: string; // e.g. PAY-2026-9041
  dbId?: number;
  bookingId?: string;
  quotationId?: string;
  receiptNumber: string; // e.g. OR-2026-5501
  clientName: string;
  clientEmail: string;
  type: string;
  amount: number;
  method: string;
  referenceNumber: string;
  date: string;
  status?: string; // 'Pending Verification' | 'Verified' | 'Rejected'
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  notes?: string;
  proofUrl?: string;
}

// Customer Feedback and Evaluation Model
export interface Feedback {
  id: number;
  bookingId: number;
  userId: number;
  overallRating: number;
  serviceRating: number;
  staffRating: number;
  executionRating: number;
  comments?: string | null;
  suggestions?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  booking?: {
    id: number;
    bookingRef: string;
    eventTitle: string;
    eventType: string;
    eventDate: string;
    venue: string;
    clientName: string;
    clientEmail: string;
    status?: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

// Scheduling Conflict Structure
export interface SchedulingConflict {
  id: string;
  type: 'Venue Collision' | 'Date Overbooking' | 'Staff Double-Booking' | 'Equipment Exhaustion';
  severity: 'High' | 'Warning';
  message: string;
  conflictingBookingIds: string[];
  conflictingDate: string;
}

export interface AvailabilityCheckState {
  eventType: string;
  eventDate: string;
  venue: string;
  guestCount: string;
  status: 'idle' | 'checking' | 'available' | 'conflict';
  details?: {
    availableSlots: number;
    assignedCoord: string;
    venueStatus: string;
    notes: string;
  };
}

export interface CustomerPortalData {
  customerName: string;
  email: string;
  bookingRef: string;
  activeInquiry: {
    id: string;
    type: string;
    date: string;
    guests: number;
    venue: string;
    status: 'Pending Review' | 'Quotation Sent' | 'Deposit Paid' | 'Confirmed' | 'CANCELLED';
    submittedAt: string;
  };
  quotation?: Quotation | null;
  upcomingEvent: {
    title: string;
    type: string;
    date: string;
    time: string;
    venue: string;
    status: 'Confirmed' | 'In Preparation';
    daysLeft: number;
  };
  payment: {
    total: number;
    paid: number;
    balance: number;
    nextDue: string;
    status: 'Partial Payment Received' | 'Paid in Full' | 'Pending';
  };
}

export interface AdminDashboardData {
  metrics: {
    pendingInquiries: number;
    activeQuotations: number;
    upcomingEvents: number;
    outstandingReceivables: number;
    monthRevenue: number;
  };
  recentInquiries: InquiryFormData[];
  quotations: Quotation[];
}
