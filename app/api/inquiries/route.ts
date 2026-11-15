import { NextResponse } from 'next/server';
import { createInquiry, getInquiries, generateTrackingId } from '../../../models/inquiryModel';
import { checkAuth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import {
  checkScheduleAvailability,
  isPastManilaDate,
  normalizeEventDateStr,
  validateEventTimeRange,
  resolveEventTimes,
} from '../../../lib/schedulingEngine';

function toSlug(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is string => typeof item === 'string');
}

export async function GET(req: Request) {
  // Requires Administrator privileges to view all inquiries
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    const data = await getInquiries(limit, offset, search);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Check optional authentication (if customer is logged in)
    const auth = await checkAuth(req, false);
    const authenticatedUser = !auth.error ? auth.user : null;

    const body = await req.json();
    const {
      eventType,
      eventDate,
      startTime,
      endTime,
      requestedStartTime,
      requestedEndTime,
      eventVenue,
      venue,
      guestsCount,
      guestCount,
      requirements,
      fullName,
      clientName,
      email,
      clientEmail,
      phone,
      clientPhone,
      selectedServices,
      packageId,
      notes,
      budgetRange,
      estimatedBudget,
      trackingId,
      eventTypeId,
      customEventDescription,
    } = body;

    const effectiveVenue = eventVenue || venue;
    const effectiveGuestsCount = parseInt(String(guestsCount || guestCount), 10);
    const effectiveClientName = clientName || fullName || authenticatedUser?.name || null;
    const requestedEmail = (clientEmail || email || '').trim();

    if (
      authenticatedUser &&
      authenticatedUser.role !== 'Administrator' &&
      requestedEmail &&
      authenticatedUser.email &&
      requestedEmail.toLowerCase() !== authenticatedUser.email.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { message: 'Forbidden: Cannot submit an inquiry under another customer email address' },
        { status: 403 }
      );
    }

    const effectiveClientEmail =
      authenticatedUser && authenticatedUser.role !== 'Administrator'
        ? authenticatedUser.email
        : requestedEmail || authenticatedUser?.email || null;
    const effectiveClientPhone = clientPhone || phone || authenticatedUser?.phone || null;
    const effectiveUserId = authenticatedUser?.id || null;

    if (!eventType || !eventDate || !effectiveVenue || isNaN(effectiveGuestsCount) || effectiveGuestsCount <= 0) {
      return NextResponse.json(
        { message: 'Event type, date, venue, and a valid guest count are required' },
        { status: 400 }
      );
    }

    let normalizedEventDateStr: string;
    try {
      normalizedEventDateStr = normalizeEventDateStr(eventDate);
    } catch {
      return NextResponse.json({ message: 'Invalid event date provided' }, { status: 400 });
    }

    if (isPastManilaDate(normalizedEventDateStr)) {
      return NextResponse.json(
        { message: 'Cannot submit an inquiry for a past date. Please select an upcoming available date.' },
        { status: 400 }
      );
    }

    // Extract & validate Customer Event Start Time and End Time
    const resolvedFromPayload = resolveEventTimes({
      startTime,
      endTime,
      requestedStartTime,
      requestedEndTime,
      requirementsRaw: typeof requirements === 'string' ? requirements : null,
    });
    const rawReqStart = startTime ?? requestedStartTime ?? resolvedFromPayload.requestedStartTime;
    const rawReqEnd = endTime ?? requestedEndTime ?? resolvedFromPayload.requestedEndTime;

    const timeValidation = validateEventTimeRange(rawReqStart, rawReqEnd, { required: true });
    if (!timeValidation.valid || !timeValidation.normalizedStartTime || !timeValidation.normalizedEndTime) {
      return NextResponse.json(
        { message: timeValidation.message || 'Event start time and end time are required.' },
        { status: 400 }
      );
    }

    const availability = await checkScheduleAvailability({
      eventDate: normalizedEventDateStr,
      startTime: timeValidation.normalizedStartTime,
      endTime: timeValidation.normalizedEndTime,
    });
    if (!availability.isAvailable || availability.hasHighConflicts) {
      return NextResponse.json(
        {
          message:
            'The selected event date is already booked. JAD Events can only accommodate one booking per day. Please choose another available date.',
        },
        { status: 409 }
      );
    }

    const rawEventTypeStr = String(eventType).trim();
    const isExplicitOther = rawEventTypeStr.toLowerCase() === 'other';
    const cleanCustomDesc = typeof customEventDescription === 'string' ? customEventDescription.trim() : '';

    if (isExplicitOther && !cleanCustomDesc) {
      return NextResponse.json(
        { message: 'Please provide a custom event description when selecting "Other"' },
        { status: 400 }
      );
    }

    let validatedEventTypeId: number | null = null;
    if (eventTypeId !== undefined && eventTypeId !== null && eventTypeId !== '' && !isExplicitOther) {
      const parsedId = parseInt(String(eventTypeId), 10);
      if (isNaN(parsedId) || parsedId <= 0) {
        return NextResponse.json({ message: 'Invalid eventTypeId provided' }, { status: 400 });
      }
      const dbEventType = await prisma.eventType.findUnique({ where: { id: parsedId } });
      if (!dbEventType || !dbEventType.isActive) {
        return NextResponse.json(
          { message: 'Selected event type does not exist or is inactive' },
          { status: 400 }
        );
      }
      validatedEventTypeId = dbEventType.id;
    }

    const rawServices: string[] = Array.isArray(selectedServices)
      ? selectedServices.map((s: any) => (typeof s === 'string' ? s.trim() : String(s?.serviceId || s?.id || '').trim())).filter(Boolean)
      : [];
    const normalizedServices: string[] = Array.from(new Set(rawServices));
    const normalizedPackageId = packageId ? String(packageId).trim() : null;

    if (!normalizedPackageId && normalizedServices.length === 0) {
      return NextResponse.json(
        { message: 'Please select at least one package or service for your inquiry' },
        { status: 400 }
      );
    }

    // Fetch active catalog items to validate selections, event type compatibility, and sub-options
    const [activeServices, activePackages] = await Promise.all([
      prisma.service.findMany({ where: { isActive: true }, include: { eventTypes: true } }),
      prisma.package.findMany({ where: { isActive: true }, include: { eventTypes: true } }),
    ]);

    const findMatchingService = (srvKey: string) => {
      const clean = String(srvKey).trim().toLowerCase();
      return activeServices.find(
        (s) =>
          String(s.id) === clean ||
          s.name.toLowerCase() === clean ||
          toSlug(s.name) === clean
      );
    };

    const findMatchingPackage = (pkgKey: string) => {
      const clean = String(pkgKey).trim().toLowerCase();
      return activePackages.find(
        (p) =>
          String(p.id) === clean ||
          p.name.toLowerCase() === clean ||
          toSlug(p.name) === clean
      );
    };

    let matchedPackage: (typeof activePackages)[number] | undefined;
    const packageIncludedServiceIds = new Set<number>();
    const packageIncludedServiceKeys = new Set<string>();

    if (normalizedPackageId) {
      matchedPackage = findMatchingPackage(normalizedPackageId);
      if (activePackages.length > 0 && !matchedPackage) {
        return NextResponse.json(
          { message: 'Selected package is invalid or currently unavailable' },
          { status: 400 }
        );
      }
      if (
        matchedPackage &&
        validatedEventTypeId !== null &&
        matchedPackage.eventTypes.length > 0 &&
        !matchedPackage.eventTypes.some((et) => et.id === validatedEventTypeId)
      ) {
        return NextResponse.json(
          { message: `Package "${matchedPackage.name}" is not available for the selected event type` },
          { status: 400 }
        );
      }
      if (matchedPackage && Array.isArray(matchedPackage.servicesIncluded)) {
        for (const incKey of matchedPackage.servicesIncluded) {
          if (typeof incKey === 'string' || typeof incKey === 'number') {
            const cleanInc = String(incKey).trim().toLowerCase();
            packageIncludedServiceKeys.add(cleanInc);
            const incSrv = findMatchingService(cleanInc);
            if (incSrv) packageIncludedServiceIds.add(incSrv.id);
          }
        }
      }
    }

    const deduplicatedServices: string[] = [];
    const seenResolvedServiceIds = new Set<number>();

    for (const srvKey of normalizedServices) {
      const matchedSrv = findMatchingService(srvKey);
      if (activeServices.length > 0 && !matchedSrv) {
        return NextResponse.json(
          { message: `Selected service "${srvKey}" is invalid or currently unavailable` },
          { status: 400 }
        );
      }
      if (matchedSrv) {
        if (seenResolvedServiceIds.has(matchedSrv.id)) {
          continue;
        }
        seenResolvedServiceIds.add(matchedSrv.id);

        if (
          packageIncludedServiceIds.has(matchedSrv.id) ||
          packageIncludedServiceKeys.has(String(matchedSrv.id)) ||
          packageIncludedServiceKeys.has(matchedSrv.name.toLowerCase()) ||
          packageIncludedServiceKeys.has(toSlug(matchedSrv.name))
        ) {
          return NextResponse.json(
            { message: `Service "${matchedSrv.name}" is already included in package "${matchedPackage?.name}"` },
            { status: 400 }
          );
        }

        if (
          validatedEventTypeId !== null &&
          matchedSrv.eventTypes.length > 0 &&
          !matchedSrv.eventTypes.some((et) => et.id === validatedEventTypeId)
        ) {
          return NextResponse.json(
            { message: `Service "${matchedSrv.name}" is not available for the selected event type` },
            { status: 400 }
          );
        }
      }
      deduplicatedServices.push(srvKey);
    }

    // Validate structured sub-option selections if requirements contains InquirySelectionDetails JSON
    if (typeof requirements === 'string' && requirements.trim().startsWith('{')) {
      try {
        const parsedDetails = JSON.parse(requirements);
        if (parsedDetails && typeof parsedDetails === 'object') {
          if (parsedDetails.packageSelection?.selectedOptions && matchedPackage) {
            const allowedPkgOptions = new Set([
              ...toStringArray(matchedPackage.features),
              ...toStringArray(matchedPackage.inclusions),
            ]);
            if (allowedPkgOptions.size > 0) {
              for (const opt of parsedDetails.packageSelection.selectedOptions) {
                if (typeof opt === 'string' && !allowedPkgOptions.has(opt)) {
                  return NextResponse.json(
                    { message: `Option "${opt}" is not valid for package "${matchedPackage.name}"` },
                    { status: 400 }
                  );
                }
              }
            }
          }

          if (parsedDetails.serviceCustomizations && typeof parsedDetails.serviceCustomizations === 'object') {
            for (const [srvKey, custom] of Object.entries<any>(parsedDetails.serviceCustomizations)) {
              const matchedSrv = findMatchingService(srvKey);
              if (activeServices.length > 0 && !matchedSrv) {
                return NextResponse.json(
                  { message: `Customization provided for invalid or inactive service "${srvKey}"` },
                  { status: 400 }
                );
              }
              if (matchedSrv && !seenResolvedServiceIds.has(matchedSrv.id)) {
                return NextResponse.json(
                  { message: `Customization provided for unselected service "${matchedSrv.name}"` },
                  { status: 400 }
                );
              }
              if (matchedSrv && Array.isArray(custom?.selectedOptions)) {
                const allowedSrvOptions = new Set([
                  ...toStringArray(matchedSrv.features),
                  ...toStringArray(matchedSrv.inclusions),
                ]);
                if (allowedSrvOptions.size > 0) {
                  for (const opt of custom.selectedOptions) {
                    if (typeof opt === 'string' && !allowedSrvOptions.has(opt)) {
                      return NextResponse.json(
                        { message: `Option "${opt}" is not valid for service "${matchedSrv.name}"` },
                        { status: 400 }
                      );
                    }
                  }
                }
              }
            }
          }
        }
      } catch {
        // Non-JSON or legacy string requirements are allowed
      }
    }

    const uniqueTrackingId = trackingId || (await generateTrackingId());
    const effectiveEventTypeName = isExplicitOther ? cleanCustomDesc : rawEventTypeStr;

    const inquiry = await createInquiry({
      trackingId: uniqueTrackingId,
      userId: effectiveUserId,
      clientName: effectiveClientName,
      clientEmail: effectiveClientEmail,
      clientPhone: effectiveClientPhone,
      eventType: effectiveEventTypeName,
      eventTypeId: validatedEventTypeId,
      customEventDescription: cleanCustomDesc || null,
      eventDate,
      startTime: timeValidation.normalizedStartTime,
      endTime: timeValidation.normalizedEndTime,
      requestedStartTime: timeValidation.normalizedStartTime,
      requestedEndTime: timeValidation.normalizedEndTime,
      eventVenue: effectiveVenue,
      guestsCount: effectiveGuestsCount,
      requirements: requirements || notes || '',
      selectedServices: deduplicatedServices,
      packageId: normalizedPackageId,
      notes: notes || null,
      estimatedBudget: estimatedBudget || budgetRange || null,
      status: 'Pending Review',
    });

    return NextResponse.json({ success: true, trackingId: uniqueTrackingId, inquiry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
