export interface EventType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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
  eventTypes?: EventType[] | number[];
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
  eventTypes?: EventType[] | number[];
}

export type InquirySelectionMode = 'package-only' | 'package-plus-services' | 'services-only';

export interface ServiceCustomization {
  serviceId: string;
  serviceName: string;
  category?: string;
  selectedOptions: string[];
  preferredDishes?: string;
  dietaryRestrictions?: string;
  preferredActivities?: string;
  stylingThemeNotes?: string;
  customNotes?: string;
}

export interface PackageCustomization {
  packageId: string;
  packageName: string;
  selectedOptions: string[];
  preferredDishes?: string;
  dietaryRestrictions?: string;
  preferredActivities?: string;
  stylingThemeNotes?: string;
  customNotes?: string;
}

export interface InquirySelectionDetails {
  version: 1;
  selectionMode: InquirySelectionMode;
  eventTypeId?: number | null;
  eventTypeName?: string;
  packageSelection?: PackageCustomization | null;
  packageCustomizations?: Record<string, PackageCustomization>;
  packageSelections?: PackageCustomization[];
  serviceCustomizations: Record<string, ServiceCustomization>;
  additionalNotes?: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
}

export interface EventTimeOption {
  value: string;
  label: string;
}

export const EVENT_TIME_OPTIONS: EventTimeOption[] = Array.from({ length: 48 }, (_, idx) => {
  const hours24 = Math.floor(idx / 2);
  const minutes = idx % 2 === 0 ? '00' : '30';
  const value = `${String(hours24).padStart(2, '0')}:${minutes}`;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const label = `${hours12}:${minutes} ${period}`;
  return { value, label };
}).concat([{ value: '23:59', label: '11:59 PM' }]);

export function normalizeTime24Hour(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const match24 = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24) {
    return `${match24[1].padStart(2, '0')}:${match24[2]}`;
  }

  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return undefined;
}

export function parseTimeMinutes(timeStr?: string | null): number | null {
  const normalized = normalizeTime24Hour(timeStr);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function formatTime12Hour(timeStr?: string | null): string {
  const normalized = normalizeTime24Hour(timeStr);
  if (!normalized) return '';
  const [h, m] = normalized.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours12 = h % 12 === 0 ? 12 : h % 12;
  return `${hours12}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateEventDurationMinutes(startTime?: string | null, endTime?: string | null): number | null {
  const startMins = parseTimeMinutes(startTime);
  const endMins = parseTimeMinutes(endTime);
  if (startMins === null || endMins === null) return null;
  const diff = endMins - startMins;
  return diff > 0 ? diff : null;
}

export function calculateEventDurationLabel(startTime?: string | null, endTime?: string | null): string {
  const diff = calculateEventDurationMinutes(startTime, endTime);
  if (diff === null || diff <= 0) return '';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${mins} mins`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${mins} mins`;
}

export function formatEventTimeRange(
  startTime?: string | null,
  endTime?: string | null,
  options?: { includeDuration?: boolean; fallback?: string }
): string {
  const startLabel = formatTime12Hour(startTime);
  const endLabel = formatTime12Hour(endTime);
  if (!startLabel || !endLabel) return options?.fallback ?? '';
  const rangeStr = `${startLabel} – ${endLabel}`;
  if (options?.includeDuration) {
    const duration = calculateEventDurationLabel(startTime, endTime);
    if (duration) return `${rangeStr} (${duration})`;
  }
  return rangeStr;
}

export interface EventTimeValidationResult {
  valid: boolean;
  startTime?: string;
  endTime?: string;
  normalizedStartTime?: string;
  normalizedEndTime?: string;
  durationMinutes?: number;
  durationLabel?: string;
  message?: string;
  error?: string;
}

export function validateEventTimeRange(
  startTime?: string | null,
  endTime?: string | null,
  options?: { required?: boolean; requireBoth?: boolean }
): EventTimeValidationResult {
  const rawStart = typeof startTime === 'string' ? startTime.trim() : '';
  const rawEnd = typeof endTime === 'string' ? endTime.trim() : '';
  const isRequired = Boolean(options?.required || options?.requireBoth);

  if (!rawStart && !rawEnd) {
    if (isRequired) {
      const msg = 'Event start time and end time are required.';
      return {
        valid: false,
        message: msg,
        error: msg,
      };
    }
    return { valid: true };
  }

  if (!rawStart || !rawEnd) {
    const msg = 'Both event start time and event end time must be provided.';
    return {
      valid: false,
      message: msg,
      error: msg,
    };
  }

  const normalizedStartTime = normalizeTime24Hour(rawStart);
  const normalizedEndTime = normalizeTime24Hour(rawEnd);

  if (!normalizedStartTime || !normalizedEndTime) {
    const msg = 'Invalid event time format. Please select a valid start time and end time.';
    return {
      valid: false,
      message: msg,
      error: msg,
    };
  }

  const startMins = parseTimeMinutes(normalizedStartTime)!;
  const endMins = parseTimeMinutes(normalizedEndTime)!;

  if (endMins === startMins) {
    const msg = 'Event end time cannot be the same as start time (duration must be greater than 0).';
    return {
      valid: false,
      message: msg,
      error: msg,
    };
  }

  if (endMins < startMins) {
    const msg = 'Event end time must be later than start time on the same calendar day.';
    return {
      valid: false,
      message: msg,
      error: msg,
    };
  }

  const durationMinutes = endMins - startMins;
  const durationLabel = calculateEventDurationLabel(normalizedStartTime, normalizedEndTime);

  return {
    valid: true,
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    normalizedStartTime,
    normalizedEndTime,
    durationMinutes,
    durationLabel,
  };
}

export interface ResolvedEventTimes {
  startTime?: string;
  endTime?: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
  effectiveStartTime?: string;
  effectiveEndTime?: string;
  hasRecordedTime: boolean;
  isModifiedFromRequest: boolean;
}

export function resolveEventTimes(input: {
  startTime?: string | null;
  endTime?: string | null;
  requestedStartTime?: string | null;
  requestedEndTime?: string | null;
  approvedStartTime?: string | null;
  approvedEndTime?: string | null;
  selectionDetails?: InquirySelectionDetails | null;
  requirements?: string | null;
  requirementsRaw?: string | null;
}): ResolvedEventTimes {
  const rawReqs = input.requirementsRaw ?? input.requirements ?? null;
  const details =
    input.selectionDetails ??
    (rawReqs ? parseInquirySelectionDetails(rawReqs) : null);

  const requestedStartTime = normalizeTime24Hour(
    input.requestedStartTime || details?.requestedStartTime
  );
  const requestedEndTime = normalizeTime24Hour(
    input.requestedEndTime || details?.requestedEndTime
  );

  const approvedStartTime = normalizeTime24Hour(
    input.approvedStartTime || details?.approvedStartTime || input.startTime
  );
  const approvedEndTime = normalizeTime24Hour(
    input.approvedEndTime || details?.approvedEndTime || input.endTime
  );

  const effectiveStartTime = approvedStartTime || requestedStartTime;
  const effectiveEndTime = approvedEndTime || requestedEndTime;

  const hasRecordedTime = Boolean(effectiveStartTime && effectiveEndTime);
  const isModifiedFromRequest = Boolean(
    requestedStartTime &&
      requestedEndTime &&
      approvedStartTime &&
      approvedEndTime &&
      (requestedStartTime !== approvedStartTime || requestedEndTime !== approvedEndTime)
  );

  return {
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    requestedStartTime,
    requestedEndTime,
    approvedStartTime,
    approvedEndTime,
    effectiveStartTime,
    effectiveEndTime,
    hasRecordedTime,
    isModifiedFromRequest,
  };
}

export function updateRequirementsWithSchedule(
  requirementsRaw: string | null | undefined,
  schedule: {
    requestedStartTime?: string | null;
    requestedEndTime?: string | null;
    approvedStartTime?: string | null;
    approvedEndTime?: string | null;
  },
  fallbackSelectedServices?: any,
  fallbackPackageId?: string | null
): string {
  const parsed = parseInquirySelectionDetails(
    requirementsRaw,
    fallbackSelectedServices,
    fallbackPackageId
  );
  const plainFallback =
    typeof requirementsRaw === 'string' &&
    requirementsRaw.trim().length > 0 &&
    !requirementsRaw.trim().startsWith('{')
      ? requirementsRaw.trim()
      : undefined;

  const base: InquirySelectionDetails = parsed || {
    version: 1,
    selectionMode: fallbackPackageId
      ? Array.isArray(fallbackSelectedServices) && fallbackSelectedServices.length > 0
        ? 'package-plus-services'
        : 'package-only'
      : 'services-only',
    serviceCustomizations: {},
    additionalNotes: plainFallback,
  };

  const nextReqStart = normalizeTime24Hour(schedule.requestedStartTime);
  const nextReqEnd = normalizeTime24Hour(schedule.requestedEndTime);
  const nextAppStart = normalizeTime24Hour(schedule.approvedStartTime);
  const nextAppEnd = normalizeTime24Hour(schedule.approvedEndTime);

  // Never overwrite existing requestedStartTime/requestedEndTime unless not yet set or explicitly setting initial request
  const finalRequestedStart = base.requestedStartTime || nextReqStart;
  const finalRequestedEnd = base.requestedEndTime || nextReqEnd;
  const finalApprovedStart = nextAppStart || base.approvedStartTime;
  const finalApprovedEnd = nextAppEnd || base.approvedEndTime;

  const updated: InquirySelectionDetails = {
    ...base,
    ...(finalRequestedStart ? { requestedStartTime: finalRequestedStart } : {}),
    ...(finalRequestedEnd ? { requestedEndTime: finalRequestedEnd } : {}),
    ...(finalApprovedStart ? { approvedStartTime: finalApprovedStart } : {}),
    ...(finalApprovedEnd ? { approvedEndTime: finalApprovedEnd } : {}),
  };

  return JSON.stringify(updated);
}

export function isItemCompatibleWithEventType(
  itemEventTypes?: EventType[] | number[],
  selectedEventTypeId?: number | null,
  isOtherEvent?: boolean
): boolean {
  if (isOtherEvent || !selectedEventTypeId) return true;
  if (!Array.isArray(itemEventTypes) || itemEventTypes.length === 0) return true;
  return itemEventTypes.some((et: any) => {
    const id = typeof et === 'number' ? et : et?.id;
    return Number(id) === Number(selectedEventTypeId);
  });
}

export function serializeInquirySelectionDetails(details: InquirySelectionDetails): string {
  return JSON.stringify(details);
}

export function extractPlainInquiryNotes(
  notes?: string | null,
  requirements?: string | null
): string {
  if (typeof notes === 'string' && notes.trim().length > 0 && !notes.trim().startsWith('{')) {
    return notes;
  }
  if (typeof requirements === 'string' && requirements.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(requirements);
      if (parsed && typeof parsed.additionalNotes === 'string' && parsed.additionalNotes.trim()) {
        return parsed.additionalNotes;
      }
    } catch {
      // ignore
    }
  }
  if (
    typeof requirements === 'string' &&
    requirements.trim().length > 0 &&
    !requirements.trim().startsWith('{')
  ) {
    return requirements;
  }
  return '';
}

export function formatSelectionModeLabel(mode?: InquirySelectionMode | null): string {
  switch (mode) {
    case 'package-only':
      return 'Package Only';
    case 'package-plus-services':
      return 'Package + Add-on Services';
    case 'services-only':
      return 'Individual Services Only';
    default:
      return 'Custom Selection';
  }
}

export function summarizePackageCustomizationForNotes(
  pkgCustom?: PackageCustomization | null,
  fallbackCapacity?: string
): string {
  const parts: string[] = [];
  if (pkgCustom?.selectedOptions && pkgCustom.selectedOptions.length > 0) {
    parts.push(`Selected Inclusions: ${pkgCustom.selectedOptions.join(', ')}`);
  }
  if (pkgCustom?.customNotes && pkgCustom.customNotes.trim()) {
    parts.push(`Client Note: ${pkgCustom.customNotes.trim()}`);
  }
  if (parts.length > 0) {
    return parts.join(' | ');
  }
  return `All-inclusive bundle (${fallbackCapacity || 'Complete'})`;
}

export function summarizeServiceCustomizationForNotes(
  srvCustom?: ServiceCustomization | null,
  fallbackDesc?: string
): string {
  if (!srvCustom) {
    return fallbackDesc || 'Standard Service';
  }
  const parts: string[] = [];
  if (Array.isArray(srvCustom.selectedOptions) && srvCustom.selectedOptions.length > 0) {
    parts.push(`Options: ${srvCustom.selectedOptions.join(', ')}`);
  }
  if (srvCustom.preferredDishes?.trim()) {
    parts.push(`Preferred Dishes: ${srvCustom.preferredDishes.trim()}`);
  }
  if (srvCustom.dietaryRestrictions?.trim()) {
    parts.push(`Dietary: ${srvCustom.dietaryRestrictions.trim()}`);
  }
  if (srvCustom.preferredActivities?.trim()) {
    parts.push(`Activities/Program: ${srvCustom.preferredActivities.trim()}`);
  }
  if (srvCustom.stylingThemeNotes?.trim()) {
    parts.push(`Theme/Palette: ${srvCustom.stylingThemeNotes.trim()}`);
  }
  if (srvCustom.customNotes?.trim()) {
    parts.push(`Client Note: ${srvCustom.customNotes.trim()}`);
  }
  return parts.length > 0 ? parts.join(' | ') : (fallbackDesc || 'Standard Service');
}

export function stripQuotationItemScopeMetadata(rawNotes?: string | null): string {
  if (!rawNotes || typeof rawNotes !== 'string') return '';
  return rawNotes
    .replace(/\s*\[\[JAD_SCOPE_V\d+:[^\]]*\]\]/g, '')
    .replace(/\s*\[\[JAD_SCOPE_[^\]]*\]?\]?$/g, '')
    .trim();
}

export function formatQuotationItemNotesForDisplay(rawNotes?: string | null): string {
  return stripQuotationItemScopeMetadata(rawNotes);
}

export function parseInquirySelectionDetails(
  requirements?: string | null,
  selectedServices?: any,
  packageId?: string | null
): InquirySelectionDetails | null {
  if (typeof requirements === 'string' && requirements.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(requirements);
      if (
        parsed &&
        (parsed.version === 1 ||
          parsed.serviceCustomizations ||
          parsed.selectionMode ||
          parsed.requestedStartTime ||
          parsed.approvedStartTime)
      ) {
        return {
          version: 1,
          selectionMode:
            parsed.selectionMode ||
            (packageId
              ? Array.isArray(selectedServices) && selectedServices.length > 0
                ? 'package-plus-services'
                : 'package-only'
              : 'services-only'),
          eventTypeId: parsed.eventTypeId ?? null,
          eventTypeName: parsed.eventTypeName || undefined,
          packageSelection:
            parsed.packageSelection ||
            (packageId
              ? { packageId: String(packageId), packageName: String(packageId), selectedOptions: [] }
              : null),
          ...(parsed.packageCustomizations
            ? { packageCustomizations: parsed.packageCustomizations }
            : {}),
          ...(Array.isArray(parsed.packageSelections)
            ? { packageSelections: parsed.packageSelections }
            : {}),
          serviceCustomizations: parsed.serviceCustomizations || {},
          additionalNotes: parsed.additionalNotes || undefined,
          requestedStartTime: normalizeTime24Hour(parsed.requestedStartTime),
          requestedEndTime: normalizeTime24Hour(parsed.requestedEndTime),
          approvedStartTime: normalizeTime24Hour(parsed.approvedStartTime),
          approvedEndTime: normalizeTime24Hour(parsed.approvedEndTime),
        };
      }
    } catch {
      // Fall through to legacy normalization
    }
  }

  const srvList = Array.isArray(selectedServices) ? selectedServices : [];
  if (!packageId && srvList.length === 0) return null;

  const serviceCustomizations: Record<string, ServiceCustomization> = {};
  srvList.forEach((raw: any) => {
    if (typeof raw === 'string') {
      serviceCustomizations[raw] = {
        serviceId: raw,
        serviceName: raw,
        selectedOptions: [],
      };
    } else if (raw && typeof raw === 'object' && raw.serviceId) {
      serviceCustomizations[String(raw.serviceId)] = {
        serviceId: String(raw.serviceId),
        serviceName: raw.serviceName || String(raw.serviceId),
        category: raw.category,
        selectedOptions: Array.isArray(raw.selectedOptions) ? raw.selectedOptions : [],
        preferredDishes: raw.preferredDishes,
        dietaryRestrictions: raw.dietaryRestrictions,
        preferredActivities: raw.preferredActivities,
        stylingThemeNotes: raw.stylingThemeNotes,
        customNotes: raw.customNotes,
      };
    }
  });

  return {
    version: 1,
    selectionMode: packageId
      ? srvList.length > 0
        ? 'package-plus-services'
        : 'package-only'
      : 'services-only',
    packageSelection: packageId
      ? {
          packageId: String(packageId),
          packageName: String(packageId),
          selectedOptions: [],
        }
      : null,
    serviceCustomizations,
  };
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
  eventTypeId?: number | null;
  customEventDescription?: string | null;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
  venue: string;
  guestCount: number;
  selectedServices: string[];
  packageId?: string;
  notes: string;
  requirements?: string;
  selectionDetails?: InquirySelectionDetails | null;
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
  startTime?: string;
  endTime?: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
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
  adminComment?: string | null;
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
  requestedStartTime?: string;
  requestedEndTime?: string;
  approvedStartTime?: string;
  approvedEndTime?: string;
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
