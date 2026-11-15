"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Package,
  Layers,
  PlusCircle,
  MessageSquare,
  Utensils,
  Music,
  Palette,
  Info,
  ChevronDown,
  ChevronUp,
  Clock
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
import {
  ServiceItem,
  PackageItem,
  InquiryFormData,
  EventType,
  InquirySelectionMode,
  ServiceCustomization,
  PackageCustomization,
  InquirySelectionDetails,
  EVENT_TIME_OPTIONS,
  isItemCompatibleWithEventType,
  serializeInquirySelectionDetails,
  validateEventTimeRange,
  formatEventTimeRange,
  calculateEventDurationLabel,
} from '../types';
import { submitInquiry, checkClashApi } from '@/services/api';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: PackageItem | null;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialEventType?: string;
  initialVenue?: string;
  initialGuestCount?: number;
  initialServiceId?: string;
  currentUser?: { role: 'client' | 'admin'; email: string } | null;
  services?: ServiceItem[];
  packages?: PackageItem[];
  eventTypes?: EventType[];
  onRequireAuth?: () => void;
  onInquirySubmitted?: (inquiry: InquiryFormData) => void;
}

function toSlug(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getCatalogOptions(item?: { features?: string[]; inclusions?: string[] } | null): string[] {
  if (!item) return [];
  const combined = [
    ...(Array.isArray(item.inclusions) ? item.inclusions : []),
    ...(Array.isArray(item.features) ? item.features : []),
  ]
    .map((opt) => (typeof opt === 'string' ? opt.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set(combined));
}

function isServiceBundledInPackage(service: ServiceItem, pkg?: PackageItem | null): boolean {
  if (!pkg || !Array.isArray(pkg.servicesIncluded) || pkg.servicesIncluded.length === 0) {
    return false;
  }
  const srvId = String(service.id).trim().toLowerCase();
  const srvName = service.name.trim().toLowerCase();
  const srvSlug = toSlug(service.name);

  return pkg.servicesIncluded.some((inc) => {
    const cleanInc = String(inc).trim().toLowerCase();
    return cleanInc === srvId || cleanInc === srvName || cleanInc === srvSlug;
  });
}

function detectServicePreferenceKind(service: ServiceItem): {
  isCatering: boolean;
  isEntertainment: boolean;
  isStyling: boolean;
} {
  const haystack = `${service.id} ${service.name} ${service.category}`.toLowerCase();
  return {
    isCatering: /cater|food|beverage|banquet|menu|buffet|culinary|dining/.test(haystack),
    isEntertainment: /entertain|stage|perform|talent|music|band|dj|host|emcee|photo\s*booth|interactive|guest/.test(
      haystack
    ),
    isStyling: /styl|decor|ambience|floral|backdrop|theme|lighting|production|rental|furniture|technical/.test(
      haystack
    ),
  };
}

function hasCustomPreferencesFilled(custom?: ServiceCustomization | null): boolean {
  if (!custom) return false;
  return Boolean(
    custom.preferredDishes?.trim() ||
      custom.dietaryRestrictions?.trim() ||
      custom.preferredActivities?.trim() ||
      custom.stylingThemeNotes?.trim() ||
      custom.customNotes?.trim()
  );
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  initialPackage,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialEventType,
  initialVenue,
  initialGuestCount,
  initialServiceId,
  currentUser,
  services = [],
  packages = [],
  eventTypes = [],
  onRequireAuth,
  onInquirySubmitted,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const activeEventTypes = useMemo(
    () => eventTypes.filter((et) => et.isActive !== false),
    [eventTypes]
  );
  const activeServices = useMemo(
    () => services.filter((s) => s.isActive !== false),
    [services]
  );
  const activePackages = useMemo(
    () => packages.filter((p) => p.isActive !== false),
    [packages]
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventType, setEventType] = useState('');
  const [customEventDescription, setCustomEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('20:00');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState<number>(100);

  const [selectionMode, setSelectionMode] = useState<InquirySelectionMode>('services-only');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [packageCustomization, setPackageCustomization] = useState<PackageCustomization | null>(null);
  const [isPackageCustomExpanded, setIsPackageCustomExpanded] = useState<boolean>(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceCustomizations, setServiceCustomizations] = useState<
    Record<string, ServiceCustomization>
  >({});
  const [expandedServiceIds, setExpandedServiceIds] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedRef, setGeneratedRef] = useState('');
  const [dateAvailabilityError, setDateAvailabilityError] = useState<string | null>(null);

  const todayManilaStr = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    []
  );

  // Live check whether the selected eventDate is in the past or already occupied
  useEffect(() => {
    if (!isOpen || !eventDate) {
      setDateAvailabilityError(null);
      return;
    }
    if (eventDate < todayManilaStr) {
      setDateAvailabilityError('Past dates cannot be selected. Please choose an upcoming available date.');
      return;
    }
    let cancelled = false;
    checkClashApi({ eventDate })
      .then((res) => {
        if (cancelled) return;
        if (!res.isAvailable || (res.remainingSlots ?? 1) <= 0) {
          setDateAvailabilityError(
            'Only one event booking is accommodated per day. This date is already booked and unavailable.'
          );
        } else {
          setDateAvailabilityError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setDateAvailabilityError(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, eventDate, todayManilaStr]);

  // Ensure a valid default eventType is selected when activeEventTypes load
  useEffect(() => {
    if (!eventType) {
      if (activeEventTypes.length > 0) {
        setEventType(activeEventTypes[0].name);
      } else {
        setEventType('Birthday Celebration');
      }
    }
  }, [activeEventTypes, eventType]);

  // Synchronize authenticated user contact info
  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email);
      if (!fullName) {
        setFullName(currentUser.email.split('@')[0].replace('.', ' ').toUpperCase());
      }
    }
  }, [currentUser, fullName]);

  const buildDefaultServiceCustomization = (srv: ServiceItem): ServiceCustomization => ({
    serviceId: srv.id,
    serviceName: srv.name,
    category: srv.category,
    selectedOptions: getCatalogOptions(srv),
    preferredDishes: '',
    dietaryRestrictions: '',
    preferredActivities: '',
    stylingThemeNotes: '',
    customNotes: '',
  });

  const buildDefaultPackageCustomization = (pkg: PackageItem): PackageCustomization => ({
    packageId: pkg.id,
    packageName: pkg.name,
    selectedOptions: getCatalogOptions(pkg),
    customNotes: '',
  });

  // Synchronize initial props when modal opens with a pre-selected package, service, or availability check
  useEffect(() => {
    if (!isOpen) return;

    if (initialDate) setEventDate(initialDate);
    if (initialStartTime) setStartTime(initialStartTime);
    if (initialEndTime) setEndTime(initialEndTime);
    if (initialVenue !== undefined) setVenue(initialVenue);
    if (typeof initialGuestCount === 'number' && initialGuestCount > 0) {
      setGuestCount(initialGuestCount);
    }
    if (initialEventType) {
      const matchedEt = activeEventTypes.find(
        (et) => et.name.toLowerCase() === initialEventType.toLowerCase()
      );
      if (matchedEt) {
        setEventType(matchedEt.name);
      } else if (initialEventType === 'Other') {
        setEventType('Other');
      } else if (activeEventTypes.length === 0) {
        setEventType(initialEventType);
      }
    }

    if (initialPackage) {
      setSelectionMode((prev) =>
        prev === 'package-plus-services' ? 'package-plus-services' : 'package-only'
      );
      setSelectedPackageId(initialPackage.id);
      setPackageCustomization(buildDefaultPackageCustomization(initialPackage));
      setIsPackageCustomExpanded(true);

      // Ensure current eventType is compatible with initialPackage
      const currentEtObj = activeEventTypes.find((et) => et.name === eventType);
      const isCurrentCompatible = isItemCompatibleWithEventType(
        initialPackage.eventTypes,
        currentEtObj?.id ?? null,
        eventType === 'Other'
      );
      if (!isCurrentCompatible && activeEventTypes.length > 0) {
        const compatibleEt = activeEventTypes.find((et) =>
          isItemCompatibleWithEventType(initialPackage.eventTypes, et.id, false)
        );
        if (compatibleEt) {
          setEventType(compatibleEt.name);
        }
      }
    }

    if (initialServiceId) {
      const srv = activeServices.find((s) => s.id === initialServiceId);
      if (srv) {
        if (!initialPackage && !selectedPackageId) {
          setSelectionMode('services-only');
        } else if (selectedPackageId) {
          const pkg = activePackages.find((p) => p.id === selectedPackageId);
          if (!isServiceBundledInPackage(srv, pkg)) {
            setSelectionMode('package-plus-services');
          }
        }

        setSelectedServices((prev) =>
          prev.includes(srv.id) ? prev : [...prev, srv.id]
        );
        setServiceCustomizations((prev) =>
          prev[srv.id]
            ? prev
            : { ...prev, [srv.id]: buildDefaultServiceCustomization(srv) }
        );
        setExpandedServiceIds((prev) => ({ ...prev, [srv.id]: true }));

        const currentEtObj = activeEventTypes.find((et) => et.name === eventType);
        const isCurrentCompatible = isItemCompatibleWithEventType(
          srv.eventTypes,
          currentEtObj?.id ?? null,
          eventType === 'Other'
        );
        if (!isCurrentCompatible && activeEventTypes.length > 0) {
          const compatibleEt = activeEventTypes.find((et) =>
            isItemCompatibleWithEventType(srv.eventTypes, et.id, false)
          );
          if (compatibleEt) {
            setEventType(compatibleEt.name);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPackage, initialDate, initialStartTime, initialEndTime, initialEventType, initialVenue, initialGuestCount, initialServiceId]);

  const selectedEventTypeObj = useMemo(
    () => activeEventTypes.find((et) => et.name === eventType) || null,
    [activeEventTypes, eventType]
  );
  const isOtherEvent = eventType === 'Other';
  const selectedEventTypeId = isOtherEvent ? null : selectedEventTypeObj?.id ?? null;

  const compatiblePackages = useMemo(
    () =>
      activePackages.filter((pkg) =>
        isItemCompatibleWithEventType(pkg.eventTypes, selectedEventTypeId, isOtherEvent)
      ),
    [activePackages, selectedEventTypeId, isOtherEvent]
  );

  const compatibleServices = useMemo(
    () =>
      activeServices.filter((srv) =>
        isItemCompatibleWithEventType(srv.eventTypes, selectedEventTypeId, isOtherEvent)
      ),
    [activeServices, selectedEventTypeId, isOtherEvent]
  );

  const selectedPackageObj = useMemo(
    () => activePackages.find((p) => p.id === selectedPackageId) || null,
    [activePackages, selectedPackageId]
  );

  const bundledServicesInSelectedPackage = useMemo(() => {
    if (!selectedPackageObj) return [];
    return activeServices.filter((srv) =>
      isServiceBundledInPackage(srv, selectedPackageObj)
    );
  }, [activeServices, selectedPackageObj]);

  // Handle Event Type switching: remove incompatible package/services & notify customer
  const handleEventTypeChange = (newEventType: string) => {
    setEventType(newEventType);
    if (newEventType !== 'Other') {
      setCustomEventDescription('');
    }

    const newIsOther = newEventType === 'Other';
    const newEtObj = activeEventTypes.find((et) => et.name === newEventType) || null;
    const newEtId = newIsOther ? null : newEtObj?.id ?? null;

    const removedNames: string[] = [];

    if (selectedPackageId) {
      const pkg = activePackages.find((p) => p.id === selectedPackageId);
      if (pkg && !isItemCompatibleWithEventType(pkg.eventTypes, newEtId, newIsOther)) {
        removedNames.push(`Package: ${pkg.name}`);
        setSelectedPackageId('');
        setPackageCustomization(null);
      }
    }

    if (selectedServices.length > 0) {
      const keptServiceIds: string[] = [];
      const removedServiceIds: string[] = [];

      for (const srvId of selectedServices) {
        const srv = activeServices.find((s) => s.id === srvId);
        if (srv && !isItemCompatibleWithEventType(srv.eventTypes, newEtId, newIsOther)) {
          removedNames.push(srv.name);
          removedServiceIds.push(srvId);
        } else {
          keptServiceIds.push(srvId);
        }
      }

      if (removedServiceIds.length > 0) {
        setSelectedServices(keptServiceIds);
        setServiceCustomizations((prev) => {
          const next = { ...prev };
          removedServiceIds.forEach((id) => delete next[id]);
          return next;
        });
        setExpandedServiceIds((prev) => {
          const next = { ...prev };
          removedServiceIds.forEach((id) => delete next[id]);
          return next;
        });
      }
    }

    if (removedNames.length > 0) {
      toast.info('Incompatible selections removed for new Event Type', {
        description: `Cleared: ${removedNames.join(', ')}`,
      });
    }
  };

  // Handle switching between the 3 selection modes
  const handleSelectMode = (mode: InquirySelectionMode) => {
    setSelectionMode(mode);
    if (mode === 'package-only') {
      if (selectedServices.length > 0) {
        setSelectedServices([]);
        setServiceCustomizations({});
        setExpandedServiceIds({});
      }
    } else if (mode === 'services-only') {
      if (selectedPackageId) {
        setSelectedPackageId('');
        setPackageCustomization(null);
      }
    } else if (mode === 'package-plus-services' && selectedPackageObj) {
      // Remove any selected services that are already bundled in the selected package
      const overlapping = selectedServices.filter((sId) => {
        const srv = activeServices.find((s) => s.id === sId);
        return srv ? isServiceBundledInPackage(srv, selectedPackageObj) : false;
      });
      if (overlapping.length > 0) {
        setSelectedServices((prev) => prev.filter((id) => !overlapping.includes(id)));
        setServiceCustomizations((prev) => {
          const next = { ...prev };
          overlapping.forEach((id) => delete next[id]);
          return next;
        });
        setExpandedServiceIds((prev) => {
          const next = { ...prev };
          overlapping.forEach((id) => delete next[id]);
          return next;
        });
      }
    }
  };

  // Handle selecting a package
  const handleChoosePackage = (pkg: PackageItem) => {
    if (selectedPackageId === pkg.id) {
      setSelectedPackageId('');
      setPackageCustomization(null);
      return;
    }

    setSelectedPackageId(pkg.id);
    setPackageCustomization(buildDefaultPackageCustomization(pkg));
    setIsPackageCustomExpanded(true);

    // Prevent duplicate add-on service selections if already included in this package
    if (selectedServices.length > 0) {
      const overlappingNames: string[] = [];
      const overlappingIds: string[] = [];

      selectedServices.forEach((srvId) => {
        const srv = activeServices.find((s) => s.id === srvId);
        if (srv && isServiceBundledInPackage(srv, pkg)) {
          overlappingNames.push(srv.name);
          overlappingIds.push(srvId);
        }
      });

      if (overlappingIds.length > 0) {
        setSelectedServices((prev) => prev.filter((id) => !overlappingIds.includes(id)));
        setServiceCustomizations((prev) => {
          const next = { ...prev };
          overlappingIds.forEach((id) => delete next[id]);
          return next;
        });
        setExpandedServiceIds((prev) => {
          const next = { ...prev };
          overlappingIds.forEach((id) => delete next[id]);
          return next;
        });
        toast.info('Duplicate add-on services removed', {
          description: `${overlappingNames.join(', ')} already included in ${pkg.name}.`,
        });
      }
    }
  };

  const togglePackageOption = (option: string) => {
    setPackageCustomization((prev) => {
      if (!prev) return prev;
      const exists = prev.selectedOptions.includes(option);
      return {
        ...prev,
        selectedOptions: exists
          ? prev.selectedOptions.filter((o) => o !== option)
          : [...prev.selectedOptions, option],
      };
    });
  };

  // Handle toggling an individual or add-on service
  const toggleService = (srv: ServiceItem) => {
    if (
      (selectionMode === 'package-only' || selectionMode === 'package-plus-services') &&
      selectedPackageObj &&
      isServiceBundledInPackage(srv, selectedPackageObj)
    ) {
      toast.info(`"${srv.name}" is already bundled in ${selectedPackageObj.name}.`);
      return;
    }

    const exists = selectedServices.includes(srv.id);
    if (exists) {
      setSelectedServices((prev) => prev.filter((id) => id !== srv.id));
      setServiceCustomizations((prev) => {
        const next = { ...prev };
        delete next[srv.id];
        return next;
      });
      setExpandedServiceIds((prev) => {
        const next = { ...prev };
        delete next[srv.id];
        return next;
      });
    } else {
      setSelectedServices((prev) => [...prev, srv.id]);
      setServiceCustomizations((prev) => ({
        ...prev,
        [srv.id]: buildDefaultServiceCustomization(srv),
      }));
      // Collapse previously open panels on mobile-heavy lists and expand the newly added service
      setExpandedServiceIds((prev) => ({
        ...prev,
        [srv.id]: true,
      }));
    }
  };

  const toggleServiceExpanded = (serviceId: string) => {
    setExpandedServiceIds((prev) => ({
      ...prev,
      [serviceId]: prev[serviceId] === false ? true : !prev[serviceId],
    }));
  };

  const setAllServicesExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    selectedServices.forEach((id) => {
      next[id] = expanded;
    });
    setExpandedServiceIds(next);
  };

  const toggleServiceOption = (serviceId: string, option: string) => {
    setServiceCustomizations((prev) => {
      const current = prev[serviceId];
      if (!current) return prev;
      const exists = current.selectedOptions.includes(option);
      return {
        ...prev,
        [serviceId]: {
          ...current,
          selectedOptions: exists
            ? current.selectedOptions.filter((o) => o !== option)
            : [...current.selectedOptions, option],
        },
      };
    });
  };

  const updateServicePreference = (
    serviceId: string,
    field: keyof Omit<ServiceCustomization, 'serviceId' | 'serviceName' | 'category' | 'selectedOptions'>,
    value: string
  ) => {
    setServiceCustomizations((prev) => {
      const current = prev[serviceId];
      if (!current) return prev;
      return {
        ...prev,
        [serviceId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const scrollToFormSection = (elementId: string) => {
    const container = scrollContainerRef.current;
    const target = document.getElementById(elementId);
    if (container && target) {
      const topOffset = target.offsetTop - container.offsetTop - 12;
      container.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  const timeValidation = useMemo(
    () => validateEventTimeRange(startTime, endTime, { required: true }),
    [startTime, endTime]
  );

  // Step completion indicators for the sticky progress bar
  const isStep1Complete = Boolean(
    fullName.trim() &&
      phone.trim() &&
      eventDate &&
      timeValidation.valid &&
      venue.trim() &&
      (!isOtherEvent || customEventDescription.trim())
  );

  const isStep2Complete =
    selectionMode === 'package-only'
      ? Boolean(selectedPackageId)
      : selectionMode === 'package-plus-services'
      ? Boolean(selectedPackageId)
      : selectedServices.length > 0;

  const allSelectedServicesExpanded =
    selectedServices.length > 0 &&
    selectedServices.every((id) => expandedServiceIds[id] !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('Authentication Required', {
        description: 'Guests cannot submit inquiries. Please sign in or create an account to proceed.',
      });
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    if (isOtherEvent && !customEventDescription.trim()) {
      toast.error('Custom Event Description Required', {
        description: 'Please describe your event when selecting "Other".',
      });
      return;
    }

    if (eventDate < todayManilaStr) {
      toast.error('Invalid Event Date', {
        description: 'Past dates cannot be selected. Please choose an upcoming available date.',
      });
      scrollToFormSection('inquiry-step-1');
      return;
    }

    if (dateAvailabilityError) {
      toast.error('Date Unavailable', {
        description: dateAvailabilityError,
      });
      scrollToFormSection('inquiry-step-1');
      return;
    }

    if (!timeValidation.valid || !timeValidation.normalizedStartTime || !timeValidation.normalizedEndTime) {
      toast.error('Invalid Event Time Range', {
        description: timeValidation.message || 'Please select a valid event start time and end time.',
      });
      scrollToFormSection('inquiry-step-1');
      return;
    }

    const effectivePackageId =
      selectionMode === 'package-only' || selectionMode === 'package-plus-services'
        ? selectedPackageId
        : '';
    const effectiveSelectedServices =
      selectionMode === 'services-only' || selectionMode === 'package-plus-services'
        ? selectedServices
        : [];

    if (
      (selectionMode === 'package-only' || selectionMode === 'package-plus-services') &&
      !effectivePackageId
    ) {
      toast.error('Package Selection Required', {
        description: 'Please select an event package or switch to "Individual Services Only".',
      });
      scrollToFormSection('inquiry-step-3');
      return;
    }

    if (selectionMode === 'services-only' && effectiveSelectedServices.length === 0) {
      toast.error('Service Selection Required', {
        description: 'Please select at least one service for your event inquiry.',
      });
      scrollToFormSection('inquiry-step-3');
      return;
    }

    setIsSubmitting(true);
    const randomRef = `INQ-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const effectiveEventTypeName = isOtherEvent
        ? customEventDescription.trim()
        : eventType;

      const filteredServiceCustomizations: Record<string, ServiceCustomization> = {};
      effectiveSelectedServices.forEach((srvId) => {
        if (serviceCustomizations[srvId]) {
          filteredServiceCustomizations[srvId] = serviceCustomizations[srvId];
        }
      });

      const selectionDetails: InquirySelectionDetails = {
        version: 1,
        selectionMode,
        eventTypeId: selectedEventTypeId,
        eventTypeName: effectiveEventTypeName,
        packageSelection:
          effectivePackageId && packageCustomization ? packageCustomization : null,
        serviceCustomizations: filteredServiceCustomizations,
        requestedStartTime: timeValidation.normalizedStartTime,
        requestedEndTime: timeValidation.normalizedEndTime,
      };

      const serializedRequirements = serializeInquirySelectionDetails(selectionDetails);

      const res = await submitInquiry({
        trackingId: randomRef,
        fullName: fullName.trim() || currentUser.email.split('@')[0],
        email: currentUser.email,
        phone: phone.trim(),
        eventType: effectiveEventTypeName,
        eventTypeId: selectedEventTypeId ?? undefined,
        customEventDescription: isOtherEvent ? customEventDescription.trim() : undefined,
        eventDate,
        startTime: timeValidation.normalizedStartTime,
        endTime: timeValidation.normalizedEndTime,
        eventVenue: venue.trim(),
        guestsCount: guestCount,
        selectedServices: effectiveSelectedServices,
        packageId: effectivePackageId || undefined,
        notes: notes.trim(),
        requirements: serializedRequirements,
      });

      const finalTrackingId = res?.trackingId || randomRef;
      setGeneratedRef(finalTrackingId);
      setIsSuccess(true);

      const newInquiry: InquiryFormData = {
        id: finalTrackingId,
        fullName: fullName.trim() || currentUser.email.split('@')[0],
        email: currentUser.email,
        phone: phone.trim(),
        eventType: effectiveEventTypeName,
        eventTypeId: selectedEventTypeId,
        customEventDescription: isOtherEvent ? customEventDescription.trim() : null,
        eventDate,
        startTime: timeValidation.normalizedStartTime,
        endTime: timeValidation.normalizedEndTime,
        requestedStartTime: timeValidation.normalizedStartTime,
        requestedEndTime: timeValidation.normalizedEndTime,
        venue: venue.trim(),
        guestCount,
        selectedServices: effectiveSelectedServices,
        packageId: effectivePackageId || undefined,
        notes: notes.trim(),
        requirements: serializedRequirements,
        selectionDetails,
        status: 'Pending Review',
        submittedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };

      if (onInquirySubmitted) {
        onInquirySubmitted(newInquiry);
      }

      toast.success('Your inquiry has been submitted.', {
        description: `Inquiry Reference #${finalTrackingId} has been received and is awaiting quotation review.`,
        icon: <MessageSquare className="w-4 h-4 text-emerald-600" />,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Please review your selections and try again.';
      toast.error('Unable to submit your inquiry', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl p-0 gap-0 rounded-2xl max-h-[92dvh] sm:max-h-[90dvh] overflow-hidden flex flex-col">
        {isSuccess ? (
          /* Success Screen */
          <div className="p-6 sm:p-8 overflow-y-auto text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <Badge variant="success" className="mb-3 text-xs">
              Inquiry Received
            </Badge>

            <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A] mb-2 text-center">
              Your Inquiry Has Been Submitted
            </DialogTitle>

            <DialogDescription className="text-sm text-slate-600 max-w-md mx-auto mb-6 text-center">
              Thank you, <strong className="text-[#1E3A8A]">{fullName || currentUser?.email}</strong>! Your event inquiry and selected preferences have been received. Our team will prepare your quotation shortly.
            </DialogDescription>

            <div className="w-full max-w-md p-5 rounded-xl bg-slate-50 border border-slate-200 text-left mb-6 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500">Inquiry Reference:</span>
                <span className="font-mono font-bold text-[#1E3A8A] text-sm">{generatedRef}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Event Type:</span>
                <span className="text-slate-900 font-semibold">
                  {isOtherEvent ? customEventDescription : eventType}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Target Date:</span>
                <span className="text-slate-900 font-semibold">{eventDate}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Requested Event Time:</span>
                <span className="text-[#1E3A8A] font-bold">
                  {formatEventTimeRange(startTime, endTime, { includeDuration: true })}
                </span>
              </div>
              {selectedPackageObj && selectionMode !== 'services-only' && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Selected Package:</span>
                  <span className="text-purple-800 font-bold">{selectedPackageObj.name}</span>
                </div>
              )}
              {selectionMode !== 'package-only' && selectedServices.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Selected Services:</span>
                  <span className="text-slate-900 font-semibold">
                    {selectedServices.length} service{selectedServices.length === 1 ? '' : 's'} customized
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-emerald-700 font-semibold">
                <span>Status:</span>
                <span>Under Review by Admin Operations</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-sm mb-6">
              Our lead event director will review your selected options and preferences to prepare your official itemized quotation.
            </p>

            <Button
              variant="brand"
              size="lg"
              onClick={handleResetAndClose}
              className="px-8 font-bold min-h-11"
            >
              Done & Return to Homepage
            </Button>
          </div>
        ) : (
          /* Three-Part Modal Layout: Fixed Header, Scrollable Form Body, Fixed Action Footer */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* PART 1: Fixed Header + Progress Indicator */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 pr-12">
              <DialogHeader className="text-left space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-orange-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Web-Based Event Booking System</span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-[#1E3A8A]">
                  Submit Your Event Inquiry
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 leading-relaxed">
                  Choose your event type, select a package or custom services, and indicate your specific inclusions and preferences.
                </DialogDescription>
              </DialogHeader>

              {/* Interactive Progress Bar */}
              <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => scrollToFormSection('inquiry-step-1')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isStep1Complete
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                      : 'bg-blue-50/70 border-blue-200 text-[#1E3A8A]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isStep1Complete
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#1E3A8A] text-white'
                    }`}
                  >
                    {isStep1Complete ? <Check className="w-2.5 h-2.5" /> : '1'}
                  </span>
                  <span className="text-[11px] font-bold truncate">Event Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToFormSection('inquiry-step-2')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isStep2Complete
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isStep2Complete
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-800'
                    }`}
                  >
                    {isStep2Complete ? <Check className="w-2.5 h-2.5" /> : '2'}
                  </span>
                  <span className="text-[11px] font-bold truncate">Selection Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToFormSection('inquiry-step-3')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    isStep2Complete
                      ? 'bg-blue-50/70 border-blue-200 text-[#1E3A8A]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isStep2Complete
                        ? 'bg-[#1E3A8A] text-white'
                        : 'bg-slate-300 text-slate-800'
                    }`}
                  >
                    3
                  </span>
                  <span className="text-[11px] font-bold truncate">Customize</span>
                </button>
              </div>
            </div>

            {/* PART 2: Independently Scrollable Form Body */}
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 custom-scrollbar"
            >
              {/* Authentication Banner */}
              {!currentUser ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
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
                    className="shrink-0 rounded-lg font-bold text-xs gap-1.5 shadow-sm min-h-9 w-full sm:w-auto"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </Button>
                </div>
              ) : (
                <div className="p-2.5 px-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[#1E3A8A] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Authenticated Client: <strong>{currentUser.email}</strong>
                    </span>
                  </div>
                  <Badge variant="blue" className="text-[10px]">
                    Verified User
                  </Badge>
                </div>
              )}

              {/* STEP 1: Client Contact & Event Details */}
              <div id="inquiry-step-1" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-fullname" className="text-xs font-semibold text-slate-700">
                      Your Full Name *
                    </Label>
                    <div className="relative">
                      <Input
                        id="inquiry-fullname"
                        type="text"
                        required
                        placeholder="e.g. Maria Santos"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 pl-8 text-xs"
                      />
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-email" className="text-xs font-semibold text-slate-700">
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Input
                        id="inquiry-email"
                        type="email"
                        required
                        readOnly={Boolean(currentUser?.email)}
                        placeholder="maria@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 pl-8 text-xs bg-slate-50"
                      />
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-phone" className="text-xs font-semibold text-slate-700">
                      Mobile / Phone *
                    </Label>
                    <div className="relative">
                      <Input
                        id="inquiry-phone"
                        type="tel"
                        required
                        placeholder="0917-xxx-xxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-10 pl-8 text-xs"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    </div>
                  </div>
                </div>

                {/* Event Type, Target Date, Guest Count */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-event-type" className="text-xs font-semibold text-slate-700">
                      1. Event Type *
                    </Label>
                    <select
                      id="inquiry-event-type"
                      value={eventType}
                      onChange={(e) => handleEventTypeChange(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white"
                    >
                      {activeEventTypes.length > 0 ? (
                        activeEventTypes.map((et) => (
                          <option key={et.id} value={et.name}>
                            {et.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Birthday Celebration">Birthday Celebration</option>
                          <option value="Grand Wedding">Grand Wedding & Reception</option>
                          <option value="18th Debut">18th Debut Milestone</option>
                          <option value="Corporate Gala">Corporate Gala / Launch</option>
                          <option value="Anniversary Party">Anniversary & Reunion</option>
                        </>
                      )}
                      <option value="Other">Other (Custom Event Type)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-event-date" className="text-xs font-semibold text-slate-700">
                      Event Date *
                    </Label>
                    <Input
                      id="inquiry-event-date"
                      type="date"
                      required
                      min={todayManilaStr}
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className={`h-10 text-xs ${
                        dateAvailabilityError ? 'border-rose-400 bg-rose-50/40' : ''
                      }`}
                    />
                    {dateAvailabilityError && (
                      <p className="text-[11px] font-semibold text-rose-600 leading-snug">
                        {dateAvailabilityError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-guests" className="text-xs font-semibold text-slate-700">
                      Estimated Guests *
                    </Label>
                    <Input
                      id="inquiry-guests"
                      type="number"
                      min="10"
                      max="2000"
                      required
                      value={guestCount}
                      onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 50)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                {/* Event Start Time, End Time & Auto-Calculated Duration */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Event Time Schedule *</span>
                    </Label>
                    {timeValidation.valid ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {formatEventTimeRange(startTime, endTime)}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-[#1E3A8A] border-blue-200">
                          Duration: {calculateEventDurationLabel(startTime, endTime)}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] font-bold">
                        Invalid Time Range
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="inquiry-start-time" className="text-[11px] font-semibold text-slate-600">
                        Event Start Time *
                      </Label>
                      <select
                        id="inquiry-start-time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      >
                        {EVENT_TIME_OPTIONS.slice(0, -1).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="inquiry-end-time" className="text-[11px] font-semibold text-slate-600">
                        Event End Time *
                      </Label>
                      <select
                        id="inquiry-end-time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] ${
                          !timeValidation.valid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                        }`}
                      >
                        {EVENT_TIME_OPTIONS.slice(1).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!timeValidation.valid && (
                    <p className="text-[11px] font-semibold text-rose-600 leading-snug">
                      {timeValidation.message}
                    </p>
                  )}
                </div>

                {isOtherEvent && (
                  <div className="space-y-1.5">
                    <Label htmlFor="inquiry-custom-event" className="text-xs font-semibold text-slate-700">
                      Custom Event Description *
                    </Label>
                    <Input
                      id="inquiry-custom-event"
                      type="text"
                      required
                      placeholder="e.g. 50th Golden Wedding Anniversary / Product Launch Gala"
                      value={customEventDescription}
                      onChange={(e) => setCustomEventDescription(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                )}

                {/* Venue */}
                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-venue" className="text-xs font-semibold text-slate-700">
                    Preferred Venue / City *
                  </Label>
                  <div className="relative">
                    <Input
                      id="inquiry-venue"
                      type="text"
                      required
                      placeholder="e.g. Sorsogon City Convention Center or Hotel Ballroom"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="h-10 pl-8 text-xs"
                    />
                    <MapPin className="w-3.5 h-3.5 text-orange-500 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              {/* STEP 2: Selection Mode */}
              <div id="inquiry-step-2" className="space-y-2.5 pt-3 border-t border-slate-200/80">
                <Label className="text-xs font-bold text-[#1E3A8A]">
                  2. How would you like to build your event request?
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'package-only' as InquirySelectionMode,
                      title: 'Package Only',
                      desc: 'Choose an all-in bundled event package',
                      icon: Package,
                    },
                    {
                      id: 'package-plus-services' as InquirySelectionMode,
                      title: 'Package + Add-on Services',
                      desc: 'Bundle a package with extra services',
                      icon: PlusCircle,
                    },
                    {
                      id: 'services-only' as InquirySelectionMode,
                      title: 'Individual Services Only',
                      desc: 'Pick & customize specific services',
                      icon: Layers,
                    },
                  ].map((modeOption) => {
                    const Icon = modeOption.icon;
                    const active = selectionMode === modeOption.id;
                    return (
                      <button
                        type="button"
                        key={modeOption.id}
                        onClick={() => handleSelectMode(modeOption.id)}
                        className={`flex items-start gap-2.5 p-3.5 min-h-[56px] rounded-xl text-left transition-all cursor-pointer border ${
                          active
                            ? 'bg-blue-50/90 border-2 border-[#1E3A8A] text-[#1E3A8A] shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            active ? 'text-[#1E3A8A]' : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold">{modeOption.title}</div>
                          <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            {modeOption.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: Package & Service Selection + Collapsible Customizations */}
              <div id="inquiry-step-3" className="space-y-4">
                {/* Package Selection & Collapsible Package Customization */}
                {(selectionMode === 'package-only' ||
                  selectionMode === 'package-plus-services') && (
                  <div className="space-y-3 p-3.5 sm:p-4 rounded-xl bg-purple-50/40 border border-purple-200/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <span>
                          Select Compatible Package for{' '}
                          {isOtherEvent ? customEventDescription || 'Custom Event' : eventType}
                        </span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-white text-purple-700 border-purple-200">
                        {compatiblePackages.length} Available
                      </Badge>
                    </div>

                    {compatiblePackages.length === 0 ? (
                      <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500">
                        No packages are specifically linked to this event type. You may switch to{' '}
                        <strong>Individual Services Only</strong> or choose another event type.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {compatiblePackages.map((pkg) => {
                          const isSelected = selectedPackageId === pkg.id;
                          return (
                            <button
                              type="button"
                              key={pkg.id}
                              onClick={() => handleChoosePackage(pkg)}
                              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-2 min-h-[76px] ${
                                isSelected
                                  ? 'bg-white border-2 border-purple-700 shadow-xs'
                                  : 'bg-white/90 border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-slate-900">
                                    {pkg.name}
                                  </span>
                                  {isSelected && (
                                    <Badge className="bg-purple-700 text-white text-[10px] px-2 py-0">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                  {pkg.tagline}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                                <span>Capacity: {pkg.capacity || 'Flexible'}</span>
                                <span className="font-semibold text-purple-700">
                                  {getCatalogOptions(pkg).length} inclusions
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Collapsible Selected Package Customization Panel */}
                    {selectedPackageObj && packageCustomization && (
                      <div className="rounded-xl bg-white border border-purple-200 overflow-hidden mt-2 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setIsPackageCustomExpanded((prev) => !prev)}
                          className="w-full p-3.5 flex items-center justify-between gap-2 text-left bg-purple-50/40 hover:bg-purple-50/70 transition-colors cursor-pointer"
                          aria-expanded={isPackageCustomExpanded}
                        >
                          <div>
                            <div className="text-xs font-extrabold text-purple-950">
                              Customize Package: {selectedPackageObj.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {packageCustomization.selectedOptions.length} of{' '}
                              {getCatalogOptions(selectedPackageObj).length} catalog inclusions selected
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] bg-white border-purple-200 text-purple-800">
                              {isPackageCustomExpanded ? 'Hide Options' : 'Customize'}
                            </Badge>
                            {isPackageCustomExpanded ? (
                              <ChevronUp className="w-4 h-4 text-purple-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-purple-700" />
                            )}
                          </div>
                        </button>

                        {isPackageCustomExpanded && (
                          <div className="p-3.5 pt-3 border-t border-purple-100 space-y-3">
                            {/* Bundled services notice */}
                            {bundledServicesInSelectedPackage.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-100 space-y-1.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1">
                                  <Info className="w-3 h-3 shrink-0" />
                                  <span>Services Already Bundled in This Package:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {bundledServicesInSelectedPackage.map((bs) => (
                                    <Badge
                                      key={bs.id}
                                      variant="secondary"
                                      className="text-[10px] bg-white text-purple-900 border border-purple-200"
                                    >
                                      <Check className="w-2.5 h-2.5 mr-1 text-purple-700" />
                                      {bs.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Package DB-defined features/inclusions checkboxes with touch-friendly targets */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {getCatalogOptions(selectedPackageObj).map((opt) => {
                                const checked = packageCustomization.selectedOptions.includes(opt);
                                return (
                                  <label
                                    key={opt}
                                    onClick={() => togglePackageOption(opt)}
                                    className={`flex items-start gap-2.5 p-2.5 min-h-[40px] rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                                      checked
                                        ? 'bg-purple-50/60 border-purple-300 text-slate-900 font-medium'
                                        : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100/70'
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                                        checked
                                          ? 'bg-purple-700 text-white'
                                          : 'bg-white border border-slate-300'
                                      }`}
                                    >
                                      {checked && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="leading-snug text-xs">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>

                            {/* Package Customer Preference Notes */}
                            <div className="space-y-1.5 pt-1">
                              <Label className="text-xs font-semibold text-slate-700">
                                Package Customization Preferences (Optional Client Input)
                              </Label>
                              <Input
                                type="text"
                                placeholder="e.g. Prefer plated VIP service for head table, specific program timing, or package adjustments..."
                                value={packageCustomization.customNotes || ''}
                                onChange={(e) =>
                                  setPackageCustomization((prev) =>
                                    prev ? { ...prev, customNotes: e.target.value } : prev
                                  )
                                }
                                className="h-10 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Individual / Add-On Services Selection & Collapsible Customization */}
                {(selectionMode === 'services-only' ||
                  selectionMode === 'package-plus-services') && (
                  <div className="space-y-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                        <span>
                          {selectionMode === 'package-plus-services'
                            ? 'Select Additional Add-On Services:'
                            : `Select Compatible Services for ${
                                isOtherEvent ? customEventDescription || 'Custom Event' : eventType
                              }:`}
                        </span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-white">
                        {selectedServices.length} Selected
                      </Badge>
                    </div>

                    {compatibleServices.length === 0 ? (
                      <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500">
                        No services are available for this event type.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {compatibleServices.map((srv) => {
                          const isBundled =
                            selectionMode === 'package-plus-services' &&
                            isServiceBundledInPackage(srv, selectedPackageObj);
                          const isChecked = selectedServices.includes(srv.id);

                          return (
                            <button
                              type="button"
                              key={srv.id}
                              disabled={isBundled}
                              onClick={() => toggleService(srv)}
                              className={`flex items-center gap-2.5 p-2.5 min-h-[48px] rounded-xl text-left text-xs transition-all ${
                                isBundled
                                  ? 'bg-slate-100 border border-dashed border-slate-300 text-slate-400 cursor-not-allowed opacity-75'
                                  : isChecked
                                  ? 'bg-blue-50 border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold cursor-pointer'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center text-xs shrink-0 ${
                                  isBundled
                                    ? 'bg-slate-300 text-white'
                                    : isChecked
                                    ? 'bg-[#1E3A8A] text-white'
                                    : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {(isChecked || isBundled) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="truncate flex-1">
                                <div className="truncate">{srv.name}</div>
                                <div className="text-[10px] text-slate-500 font-normal truncate">
                                  {isBundled ? 'Already in selected package' : srv.category}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Collapsible Per-Service Customization Panels */}
                    {selectedServices.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Customize Selected Services ({selectedServices.length}):
                          </span>
                          {selectedServices.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setAllServicesExpanded(!allSelectedServicesExpanded)
                              }
                              className="text-[11px] font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                            >
                              {allSelectedServicesExpanded ? 'Collapse All' : 'Expand All'}
                            </button>
                          )}
                        </div>

                        {selectedServices.map((srvId) => {
                          const srv = activeServices.find((s) => s.id === srvId);
                          const custom = serviceCustomizations[srvId];
                          if (!srv || !custom) return null;

                          const catalogOptions = getCatalogOptions(srv);
                          const prefKind = detectServicePreferenceKind(srv);
                          const isExpanded = expandedServiceIds[srv.id] !== false;
                          const hasPrefs = hasCustomPreferencesFilled(custom);

                          return (
                            <div
                              key={srv.id}
                              className="rounded-xl bg-white border border-blue-200 overflow-hidden shadow-2xs"
                            >
                              {/* Collapsible Service Header Bar */}
                              <button
                                type="button"
                                onClick={() => toggleServiceExpanded(srv.id)}
                                className="w-full p-3.5 flex items-center justify-between gap-2 text-left bg-blue-50/40 hover:bg-blue-50/80 transition-colors cursor-pointer"
                                aria-expanded={isExpanded}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-extrabold text-[#1E3A8A] truncate">
                                      {srv.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      ({srv.category})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>
                                      {custom.selectedOptions.length} of {catalogOptions.length}{' '}
                                      options selected
                                    </span>
                                    {hasPrefs && (
                                      <span className="text-emerald-700 font-semibold">
                                        • Preferences added
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="blue" className="text-[10px]">
                                    {isExpanded ? 'Hide' : 'Customize'}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-[#1E3A8A]" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-[#1E3A8A]" />
                                  )}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="p-3.5 pt-3 border-t border-slate-100 space-y-3.5">
                                  {/* Database-Defined Features & Inclusions */}
                                  {catalogOptions.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                        Available Service Options & Inclusions (From JAD Catalog):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {catalogOptions.map((opt) => {
                                          const checked = custom.selectedOptions.includes(opt);
                                          return (
                                            <label
                                              key={opt}
                                              onClick={() => toggleServiceOption(srv.id, opt)}
                                              className={`flex items-start gap-2.5 p-2.5 min-h-[40px] rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                                                checked
                                                  ? 'bg-blue-50/60 border-blue-300 text-slate-900 font-medium'
                                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/70'
                                              }`}
                                            >
                                              <div
                                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                                                  checked
                                                    ? 'bg-[#1E3A8A] text-white'
                                                    : 'bg-white border border-slate-300'
                                                }`}
                                              >
                                                {checked && (
                                                  <Check className="w-3 h-3 text-white" />
                                                )}
                                              </div>
                                              <span className="leading-snug text-xs">{opt}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Contextual Client Preferences (Clearly Distinguished from Catalog Options) */}
                                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A8A]">
                                      Your Custom Preferences for {srv.name} (Optional Client Input)
                                    </div>

                                    {prefKind.isCatering && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold flex items-center gap-1 text-slate-700">
                                            <Utensils className="w-3 h-3 text-orange-500" />
                                            <span>Preferred Dishes / Menu Style</span>
                                          </Label>
                                          <Input
                                            type="text"
                                            placeholder="e.g. Beef Caldereta, Roast Chicken, Pasta Station"
                                            value={custom.preferredDishes || ''}
                                            onChange={(e) =>
                                              updateServicePreference(
                                                srv.id,
                                                'preferredDishes',
                                                e.target.value
                                              )
                                            }
                                            className="h-10 text-xs bg-white"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs font-semibold text-slate-700">
                                            Dietary Restrictions / Allergies
                                          </Label>
                                          <Input
                                            type="text"
                                            placeholder="e.g. Halal options, no pork, vegetarian table, nut allergy"
                                            value={custom.dietaryRestrictions || ''}
                                            onChange={(e) =>
                                              updateServicePreference(
                                                srv.id,
                                                'dietaryRestrictions',
                                                e.target.value
                                              )
                                            }
                                            className="h-10 text-xs bg-white"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {prefKind.isEntertainment && (
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold flex items-center gap-1 text-slate-700">
                                          <Music className="w-3 h-3 text-blue-600" />
                                          <span>Preferred Activities / Program & Hosting Notes</span>
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="e.g. Acoustic dinner set, interactive crowd games, bilingual host, 80s/OPM playlist"
                                          value={custom.preferredActivities || ''}
                                          onChange={(e) =>
                                            updateServicePreference(
                                              srv.id,
                                              'preferredActivities',
                                              e.target.value
                                            )
                                          }
                                          className="h-10 text-xs bg-white"
                                        />
                                      </div>
                                    )}

                                    {prefKind.isStyling && (
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold flex items-center gap-1 text-slate-700">
                                          <Palette className="w-3 h-3 text-purple-600" />
                                          <span>Theme, Motif & Color Palette Preferences</span>
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="e.g. Dusty blue & champagne gold, rustic garden arch, warm ambient uplighting"
                                          value={custom.stylingThemeNotes || ''}
                                          onChange={(e) =>
                                            updateServicePreference(
                                              srv.id,
                                              'stylingThemeNotes',
                                              e.target.value
                                            )
                                          }
                                          className="h-10 text-xs bg-white"
                                        />
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold text-slate-700">
                                        Specific Instructions for {srv.name}
                                      </Label>
                                      <Input
                                        type="text"
                                        placeholder={`Any specific requests or quantities for ${srv.name}...`}
                                        value={custom.customNotes || ''}
                                        onChange={(e) =>
                                          updateServicePreference(
                                            srv.id,
                                            'customNotes',
                                            e.target.value
                                          )
                                        }
                                        className="h-10 text-xs bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* General Event Notes */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="inquiry-overall-notes" className="text-xs font-semibold text-slate-700">
                  Overall Event Notes / Additional Requests
                </Label>
                <Textarea
                  id="inquiry-overall-notes"
                  rows={2}
                  placeholder="Share any overall event timeline notes, special traditions, or coordination requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* PART 3: Fixed Bottom Action & Selection Summary Bar */}
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs px-4 sm:px-6 py-3 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2.5">
              {/* Concise Selection Summary Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-600 font-medium">Quotation Type:</span>
                  <span className="font-extrabold text-[#1E3A8A]">
                    Custom Quotation Upon Admin Review
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {selectionMode !== 'services-only' && selectedPackageObj
                      ? `${selectedPackageObj.name}${
                          selectionMode === 'package-plus-services'
                            ? ` + ${selectedServices.length} add-on${
                                selectedServices.length === 1 ? '' : 's'
                              }`
                            : ''
                        }`
                      : `${selectedServices.length} service${
                          selectedServices.length === 1 ? '' : 's'
                        } selected`}
                  </Badge>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>50% Downpayment on Approval</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleResetAndClose}
                  className="hidden sm:inline-flex font-semibold px-5 min-h-11"
                >
                  Cancel
                </Button>

                {currentUser ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="brand"
                    size="lg"
                    className="flex-1 font-bold group min-h-11"
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
                    className="flex-1 font-bold group gap-2 min-h-11"
                  >
                    <Lock className="w-4 h-4 text-white" />
                    <span>Sign In or Sign Up to Submit Inquiry</span>
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
