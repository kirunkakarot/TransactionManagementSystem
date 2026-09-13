"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/jad/admin/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { 
  ServiceItem, 
  PackageItem, 
  InquiryFormData, 
  Quotation, 
  EquipmentResource,
  Booking,
  PaymentTransaction,
  StaffMember
} from '@/components/jad/types';
import { 
  fetchServices, 
  fetchPackages,
  createServiceApi,
  updateServiceApi,
  deleteServiceApi,
  createPackageApi,
  updatePackageApi,
  deletePackageApi,
  fetchInquiries,
  fetchStaff,
  createStaffApi,
  updateStaffApi,
  deleteStaffApi,
  toggleStaffStatusApi,
  fetchEquipment,
  createEquipmentApi,
  updateEquipmentApi,
  deleteEquipmentApi,
  fetchQuotations,
  createQuotationApi,
  updateQuotationApi,
  deleteQuotationApi,
  fetchBookings,
  createBookingApi,
  updateBookingApi,
  rescheduleBookingApi,
  cancelBookingApi,
  updateBookingStatusApi,
  deleteBookingApi,
  fetchPayments,
  createPaymentApi,
  verifyPaymentApi,
  rejectPaymentApi,
  deletePaymentApi,
  deleteInquiryApi,
  updateInquiryStatusApi
} from '@/services/api';
import Cookies from 'js-cookie';

export default function AdminPage() {
  const router = useRouter();
  
  const [userEmail, setUserEmail] = useState('admin@jadevents.ph');

  const [inquiries, setInquiries] = useState<InquiryFormData[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [equipmentResources, setEquipmentResources] = useState<EquipmentResource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [staffRoster, setStaffRoster] = useState<StaffMember[]>([]);

  const getAdminToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jad_token') || Cookies.get('token') || Cookies.get('jad_token') || '';
    }
    return '';
  }, []);

  const loadAllAdminData = useCallback(async () => {
    const token = getAdminToken();

    try {
      const [
        servicesRes, 
        packagesRes, 
        inquiriesRes,
        staffRes,
        equipmentRes,
        quotationsRes,
        bookingsRes,
        paymentsRes
      ] = await Promise.all([
        fetchServices('', 100),
        fetchPackages('', 100),
        fetchInquiries(100, 0, token),
        fetchStaff('', 100),
        fetchEquipment('', 100),
        fetchQuotations('', 100, 0, token),
        fetchBookings('ALL', '', 100, 0, token),
        fetchPayments('', 100, 0, token)
      ]);

      // 1. Map Services
      if (servicesRes.services && servicesRes.services.length > 0) {
        setServices(servicesRes.services.map((s: any) => ({
          id: s.id.toString(),
          name: s.name,
          category: s.category || 'Stage & Performance',
          shortDesc: s.shortDesc || s.description || 'Professional event service and execution.',
          fullDesc: s.fullDesc || s.description || s.shortDesc || 'Full event service provided by JAD Events team.',
          description: s.shortDesc || s.fullDesc || s.description || '',
          iconName: s.iconName || 'Wrench',
          startingPrice: Number(s.price) || 0,
          featuredImage: s.featuredImage || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
          duration: 'Flexible',
          rating: 4.9,
          reviewCount: 24,
          features: Array.isArray(s.features) && s.features.length > 0 ? s.features : ['Professional Coordination', 'Equipment Support', 'Dedicated Event Crew'],
          inclusions: Array.isArray(s.inclusions) && s.inclusions.length > 0 ? s.inclusions : ['Dedicated Team', 'Quality Setup', 'Coordination Support'],
          tag: 'Verified',
          isActive: s.isActive !== false,
        })));
      }

      // 2. Map Packages
      if (packagesRes.packages && packagesRes.packages.length > 0) {
        setPackages(packagesRes.packages.map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          tagline: p.tagline || p.description || 'Complete bundled event package',
          capacity: p.capacity || '50 - 200 Guests',
          price: Number(p.price) || 0,
          originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
          idealFor: p.idealFor || 'Weddings, Birthdays, Corporate & Milestone Celebrations',
          inclusions: Array.isArray(p.inclusions) && p.inclusions.length > 0 ? p.inclusions : [
            'Full Event Coordination & Directing',
            'Thematic Stage Backdrop & Venue Styling',
            'Audio-Visual & Dynamic Lighting Setup',
            'On-Site Coordinator & Technical Crew'
          ],
          features: Array.isArray(p.features) && p.features.length > 0 ? p.features : ['Online Inquiry & Portal Tracking', 'Custom Moodboard Approval', 'Digital Run-of-Show Script'],
          servicesIncluded: Array.isArray(p.servicesIncluded) ? p.servicesIncluded : ['entertainment', 'event-decoration', 'photo-video'],
          isPopular: p.isPopular === true,
          isActive: p.isActive !== false,
        })));
      }

      // 3. Map Inquiries
      if (inquiriesRes.inquiries && inquiriesRes.inquiries.length > 0) {
        setInquiries(inquiriesRes.inquiries.map((inq: any) => {
          return {
            id: inq.trackingId || inq.id.toString(),
            dbId: inq.id,
            fullName: inq.clientName || inq.user?.name || 'Inquiry Client',
            email: inq.clientEmail || inq.user?.email || 'client@example.com',
            phone: inq.clientPhone || inq.user?.phone || '0900-000-0000',
            eventType: inq.eventType,
            eventDate: inq.eventDate ? inq.eventDate.split('T')[0] : '',
            venue: inq.eventVenue,
            guestCount: inq.guestsCount,
            selectedServices: Array.isArray(inq.selectedServices) ? inq.selectedServices : [],
            packageId: inq.packageId || undefined,
            notes: inq.notes || inq.requirements || '',
            budgetRange: inq.estimatedBudget || undefined,
            status: inq.status || 'Pending Review',
            submittedAt: inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : 'Recent',
          };
        }));
      }

      // 4. Map Staff
      if (staffRes.staff && staffRes.staff.length > 0) {
        setStaffRoster(staffRes.staff.map((st: any) => ({
          id: st.staffCode || st.id.toString(),
          name: st.name,
          role: st.role,
          phone: st.phone,
          email: st.email,
          status: st.status || 'Available',
          avatar: st.avatar || undefined,
          skills: Array.isArray(st.skills) ? st.skills : [],
          assignedBookingIds: st.bookingStaff?.map((bs: any) => bs.booking?.bookingRef || bs.bookingId.toString()) || [],
        })));
      }

      // 5. Map Equipment Resources
      if (equipmentRes.resources && equipmentRes.resources.length > 0) {
        setEquipmentResources(equipmentRes.resources.map((eq: any) => {
          const allocatedQty = eq.bookingResources?.reduce((sum: number, br: any) => {
            if (br.booking && br.booking.status !== 'Cancelled') {
              return sum + (br.quantity || 1);
            }
            return sum;
          }, 0) || 0;

          return {
            id: eq.resourceCode || eq.id.toString(),
            name: eq.name,
            category: eq.category,
            quantity: Number(eq.quantity) || 1,
            availableUnits: Math.max(0, (Number(eq.quantity) || 1) - allocatedQty),
            unit: eq.unit || 'units',
            condition: eq.condition || 'Excellent',
            assignedServiceId: eq.assignedServiceId || undefined,
            notes: eq.notes || undefined,
          };
        }));
      }

      // 6. Map Quotations
      if (quotationsRes.quotations && quotationsRes.quotations.length > 0) {
        setQuotations(quotationsRes.quotations.map((q: any) => ({
          id: q.quotationRef || q.id.toString(),
          dbId: q.id,
          inquiryId: q.inquiryId ? q.inquiryId.toString() : (q.inquiry?.trackingId || ''),
          clientName: q.clientName,
          clientEmail: q.clientEmail,
          clientPhone: q.clientPhone || '',
          eventType: q.eventType,
          eventDate: q.eventDate ? q.eventDate.split('T')[0] : '',
          venue: q.venue,
          guestCount: q.guestCount,
          items: Array.isArray(q.items) ? q.items : [],
          subtotal: Number(q.subtotal) || 0,
          discounts: Array.isArray(q.discounts) ? q.discounts : [],
          additionalCharges: Array.isArray(q.additionalCharges) ? q.additionalCharges : [],
          grandTotal: Number(q.grandTotal) || 0,
          requiredDownpayment: Number(q.requiredDownpayment) || Number(q.grandTotal) * 0.5,
          validUntil: q.validUntil ? q.validUntil.split('T')[0] : '',
          validityDays: q.validityDays || 14,
          status: q.status || 'Draft',
          notes: q.notes || '',
          terms: Array.isArray(q.terms) ? q.terms : [],
          createdAt: q.createdAt ? q.createdAt.split('T')[0] : '',
          sentAt: q.sentAt ? q.sentAt.split('T')[0] : undefined,
          depositPaidAt: q.depositPaidAt ? q.depositPaidAt.split('T')[0] : undefined,
          confirmedAt: q.confirmedAt ? q.confirmedAt.split('T')[0] : undefined,
        })));
      }

      // 7. Map Bookings
      if (bookingsRes.bookings && bookingsRes.bookings.length > 0) {
        setBookings(bookingsRes.bookings.map((b: any) => ({
          id: b.bookingRef || b.id.toString(),
          dbId: b.id,
          inquiryId: b.inquiryId ? b.inquiryId.toString() : undefined,
          quotationId: b.quotationId ? b.quotationId.toString() : undefined,
          clientName: b.clientName,
          clientEmail: b.clientEmail,
          clientPhone: b.clientPhone,
          eventTitle: b.eventTitle,
          eventType: b.eventType,
          eventDate: b.eventDate ? b.eventDate.split('T')[0] : '',
          startTime: b.startTime || '17:00',
          endTime: b.endTime || '23:00',
          venue: b.venue,
          guestCount: b.guestCount,
          status: b.status || 'Tentative',
          cancellationReason: b.cancellationReason || undefined,
          rescheduledFrom: b.rescheduledFrom ? b.rescheduledFrom.split('T')[0] : undefined,
          assignedStaff: b.bookingStaff?.map((bs: any) => ({
            id: bs.staff?.staffCode || bs.staffId.toString(),
            name: bs.staff?.name || 'Staff Member',
            role: bs.role || bs.staff?.role || 'Crew',
            phone: bs.staff?.phone || '',
          })) || [],
          assignedServices: b.bookingServices?.map((bs: any) => bs.serviceCode || bs.name) || [],
          assignedPackages: b.bookingPackages?.map((bp: any) => bp.packageCode || bp.name) || [],
          assignedEquipmentIds: b.bookingResources?.map((br: any) => br.resource?.resourceCode || br.resourceId.toString()) || [],
          totalAmount: Number(b.totalAmount) || 0,
          notes: b.notes || '',
          createdAt: b.createdAt ? b.createdAt.split('T')[0] : '',
          confirmedAt: b.confirmedAt ? b.confirmedAt.split('T')[0] : undefined,
          feedback: b.feedback || null,
        })));
      }

      // 8. Map Payments
      if (paymentsRes.payments && paymentsRes.payments.length > 0) {
        setPayments(paymentsRes.payments.map((p: any) => ({
          id: p.paymentRef || p.id.toString(),
          dbId: p.id,
          bookingId: p.booking?.bookingRef || (p.bookingId ? p.bookingId.toString() : undefined),
          quotationId: p.quotation?.quotationRef || (p.quotationId ? p.quotationId.toString() : undefined),
          receiptNumber: p.receiptNumber || `OR-${p.id}`,
          clientName: p.clientName,
          clientEmail: p.clientEmail,
          type: p.type,
          amount: Number(p.amount) || 0,
          method: p.method,
          referenceNumber: p.referenceNumber,
          date: p.date ? p.date.split('T')[0] : '',
          status: p.status || (p.verified ? 'Verified' : 'Pending Verification'),
          verified: Boolean(p.verified),
          verifiedBy: p.verifiedBy || undefined,
          verifiedAt: p.verifiedAt ? p.verifiedAt.split('T')[0] : undefined,
          rejectionReason: p.rejectionReason || undefined,
          rejectedBy: p.rejectedBy || undefined,
          rejectedAt: p.rejectedAt ? p.rejectedAt.split('T')[0] : undefined,
          notes: p.notes || undefined,
          proofUrl: p.proofUrl || undefined,
        })));
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.warn('Admin loadAllAdminData fallback:', err);
    }
  }, [getAdminToken]);

  useEffect(() => {
    const token = getAdminToken();
    const saved = localStorage.getItem('jad_user');

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email) setUserEmail(parsed.email);
        if (parsed.role !== 'Administrator' && parsed.role !== 'admin') {
          toast.warning('Administrative privileges required.');
          router.replace('/customer');
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Server-side identity verification against spoofed localStorage or direct navigation
    // The browser will automatically include HttpOnly cookies for same-origin requests.
    fetch('/api/customer/profile', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (!res.ok) {
          toast.error('Session expired or invalid.');
          router.replace('/homepage');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.user) {
          if (data.user.role !== 'Administrator') {
            toast.error('Access Denied: Your account role does not have Administrator clearance.');
            router.replace('/customer');
            return;
          }
          setUserEmail(data.user.email);
          loadAllAdminData();
        }
      })
      .catch(() => {
        // Offline / network fallback
        loadAllAdminData();
      });

    const handleFocus = () => {
      loadAllAdminData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router, loadAllAdminData, getAdminToken]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('jad_token');
    localStorage.removeItem('jad_user');
    Cookies.remove('token', { path: '/' });
    Cookies.remove('jad_token', { path: '/' });
    toast.info('You have been signed out.');
    router.push('/homepage');
  };

  // ==========================================
  // PERSISTENT QUOTATION ACTIONS
  // ==========================================
  const handleSaveQuotation = async (quotation: Quotation) => {
    const token = getAdminToken();

    try {
      // Find inquiry numeric ID or tracking ID
      let resolvedInquiryIdentifier: string | number | undefined = undefined;
      if (quotation.inquiryId) {
        const matchingInquiry = inquiries.find(i => i.id === quotation.inquiryId || i.dbId?.toString() === quotation.inquiryId);
        if (matchingInquiry?.dbId) {
          resolvedInquiryIdentifier = matchingInquiry.dbId;
        } else {
          resolvedInquiryIdentifier = quotation.inquiryId;
        }
      }

      // Check if quotation already exists by quotationRef, dbId, or matching inquiryId
      const existing = quotations.find(q => 
        (quotation.dbId && q.dbId === quotation.dbId) || 
        q.id === quotation.id || 
        (q.inquiryId && quotation.inquiryId && q.inquiryId === quotation.inquiryId)
      );

      const payload = {
        quotationRef: quotation.id,
        inquiryId: resolvedInquiryIdentifier,
        clientName: quotation.clientName,
        clientEmail: quotation.clientEmail,
        clientPhone: quotation.clientPhone,
        eventType: quotation.eventType,
        eventDate: quotation.eventDate,
        venue: quotation.venue,
        guestCount: quotation.guestCount,
        items: quotation.items,
        subtotal: quotation.subtotal,
        discounts: quotation.discounts,
        additionalCharges: quotation.additionalCharges,
        grandTotal: quotation.grandTotal,
        requiredDownpayment: quotation.requiredDownpayment,
        validUntil: quotation.validUntil,
        validityDays: quotation.validityDays,
        status: quotation.status || 'Quotation Sent',
        notes: quotation.notes,
        terms: quotation.terms,
      };

      if (existing) {
        const targetId = existing.dbId || existing.id;
        await updateQuotationApi(targetId, payload, token);
        toast.success(`Quotation ${quotation.id} updated and resent to customer!`);
      } else {
        await createQuotationApi(payload, token);
        toast.success(`Quotation ${quotation.id} dispatched and saved to database!`);
      }

      await loadAllAdminData();
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      toast.error('Failed to save quotation', { description: err.message });
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, status: InquiryFormData['status']) => {
    setInquiries(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status } : inq));
    const token = getAdminToken();
    try {
      if (status) {
        await updateInquiryStatusApi(inquiryId, status, token);
        loadAllAdminData();
      }
    } catch (err: any) {
      console.error('Error updating inquiry status:', err);
    }
  };

  const handleVerifyDownpayment = (inquiryId: string) => {
    setInquiries(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status: 'Deposit Paid' } : inq));
    setQuotations(prev => prev.map(q => q.inquiryId === inquiryId ? { ...q, status: 'Deposit Paid' } : q));
  };

  const handleApproveBooking = (inquiryId: string) => {
    setInquiries(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status: 'Confirmed' } : inq));
    setQuotations(prev => prev.map(q => q.inquiryId === inquiryId ? { ...q, status: 'Confirmed' } : q));
  };

  // ==========================================
  // PERSISTENT SERVICE ACTIONS
  // ==========================================
  const handleSaveService = async (service: ServiceItem) => {
    const token = getAdminToken();
    const isNumericId = !isNaN(parseInt(service.id, 10));

    try {
      if (isNumericId) {
        await updateServiceApi(service.id, {
          name: service.name,
          category: service.category,
          shortDesc: service.shortDesc,
          fullDesc: service.fullDesc,
          description: service.shortDesc || service.fullDesc,
          price: service.startingPrice,
          featuredImage: service.featuredImage,
          iconName: service.iconName,
          features: service.features,
          inclusions: service.inclusions,
          isActive: service.isActive !== false,
        }, token);

        toast.success(`Service "${service.name}" updated successfully in database.`);
      } else {
        await createServiceApi({
          name: service.name,
          category: service.category,
          shortDesc: service.shortDesc,
          fullDesc: service.fullDesc,
          description: service.shortDesc || service.fullDesc,
          price: service.startingPrice,
          featuredImage: service.featuredImage,
          iconName: service.iconName,
          features: service.features,
          inclusions: service.inclusions,
          isActive: service.isActive !== false,
        }, token);

        toast.success(`New service "${service.name}" created in database.`);
      }
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error saving service:', err);
      toast.error('Failed to save service', { description: err.message });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const token = getAdminToken();
    try {
      await deleteServiceApi(serviceId, token);
      toast.info('Service removed from database catalog.');
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting service:', err);
      toast.error('Failed to delete service', { description: err.message });
    }
  };

  const handleToggleServiceActive = async (serviceId: string) => {
    const token = getAdminToken();
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    try {
      await updateServiceApi(serviceId, { isActive: !service.isActive }, token);
      toast.info(`Service "${service.name}" status updated.`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error toggling service:', err);
      toast.error('Failed to update service status', { description: err.message });
    }
  };

  // ==========================================
  // PERSISTENT PACKAGE ACTIONS
  // ==========================================
  const handleSavePackage = async (pkg: PackageItem) => {
    const token = getAdminToken();
    const isNumericId = !isNaN(parseInt(pkg.id, 10));

    try {
      if (isNumericId) {
        await updatePackageApi(pkg.id, {
          name: pkg.name,
          tagline: pkg.tagline,
          description: pkg.tagline,
          capacity: pkg.capacity,
          price: pkg.price,
          originalPrice: pkg.originalPrice,
          isPopular: pkg.isPopular,
          isActive: pkg.isActive !== false,
          idealFor: pkg.idealFor,
          inclusions: pkg.inclusions,
          features: pkg.features,
          servicesIncluded: pkg.servicesIncluded,
        }, token);

        toast.success(`Package "${pkg.name}" updated successfully in database.`);
      } else {
        await createPackageApi({
          name: pkg.name,
          tagline: pkg.tagline,
          description: pkg.tagline,
          capacity: pkg.capacity,
          price: pkg.price,
          originalPrice: pkg.originalPrice,
          isPopular: pkg.isPopular,
          isActive: pkg.isActive !== false,
          idealFor: pkg.idealFor,
          inclusions: pkg.inclusions,
          features: pkg.features,
          servicesIncluded: pkg.servicesIncluded,
        }, token);

        toast.success(`Package bundle "${pkg.name}" created and saved to database.`);
      }
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error saving package:', err);
      toast.error('Failed to save package', { description: err.message });
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    const token = getAdminToken();
    try {
      await deletePackageApi(packageId, token);
      toast.info('Package removed from database catalog.');
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting package:', err);
      toast.error('Failed to delete package', { description: err.message });
    }
  };

  const handleTogglePackageActive = async (packageId: string) => {
    const token = getAdminToken();
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      await updatePackageApi(packageId, { isActive: !pkg.isActive }, token);
      toast.info(`Package "${pkg.name}" status updated.`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error toggling package status:', err);
      toast.error('Failed to update package status', { description: err.message });
    }
  };

  // ==========================================
  // PERSISTENT EQUIPMENT ACTIONS
  // ==========================================
  const handleSaveEquipment = async (equipment: EquipmentResource) => {
    const token = getAdminToken();
    const isNumericId = !isNaN(parseInt(equipment.id, 10));

    try {
      if (isNumericId) {
        await updateEquipmentApi(equipment.id, {
          name: equipment.name,
          category: equipment.category,
          quantity: equipment.quantity,
          unit: equipment.unit,
          condition: equipment.condition,
          assignedServiceId: equipment.assignedServiceId,
          notes: equipment.notes,
        }, token);
        toast.success(`Hardware spec for "${equipment.name}" saved.`);
      } else {
        await createEquipmentApi({
          resourceCode: equipment.id,
          name: equipment.name,
          category: equipment.category,
          quantity: equipment.quantity,
          unit: equipment.unit,
          condition: equipment.condition,
          assignedServiceId: equipment.assignedServiceId,
          notes: equipment.notes,
        }, token);
        toast.success(`New equipment "${equipment.name}" added to inventory.`);
      }
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error saving equipment:', err);
      toast.error('Failed to save equipment', { description: err.message });
    }
  };

  const handleToggleStaffStatus = async (staffId: string) => {
    try {
      const staffMember = staffRoster.find(s => s.id === staffId);
      if (!staffMember) return;
      const newStatus = staffMember.status === 'Available' ? 'Unavailable' : 'Available';
      await toggleStaffStatusApi(staffId, newStatus, getAdminToken() || undefined);
      toast.success(`Staff status updated to ${newStatus}`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error toggling staff status:', err);
      toast.error('Failed to update staff status', { description: err.message });
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    const token = getAdminToken();
    try {
      await deleteEquipmentApi(equipmentId, token);
      toast.info('Equipment resource deleted.');
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      toast.error('Failed to delete equipment', { description: err.message });
    }
  };

  // ==========================================
  // PERSISTENT BOOKING ACTIONS
  // ==========================================
  const handleSaveBooking = async (booking: Booking) => {
    const token = getAdminToken();
    const existing = bookings.find(b => b.id === booking.id);

    try {
      if (existing) {
        // Update existing booking
        await updateBookingApi(booking.id, {
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          eventTitle: booking.eventTitle,
          eventType: booking.eventType,
          eventDate: booking.eventDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          venue: booking.venue,
          guestCount: booking.guestCount,
          totalAmount: booking.totalAmount,
          status: booking.status,
          notes: booking.notes,
          assignedStaff: booking.assignedStaff.map(s => ({ id: s.id, role: s.role })),
          assignedEquipment: booking.assignedEquipmentIds?.map(eqId => ({ resourceId: eqId, quantity: 1 })) || [],
        }, token);
        toast.success(`Booking ${booking.id} updated in database.`);
      } else {
        // Resolve inquiry primary key ID or tracking ID
        let resolvedInqId: string | number | undefined = booking.inquiryId;
        if (booking.inquiryId) {
          const matchedInq = inquiries.find(i => i.id === booking.inquiryId || i.dbId?.toString() === booking.inquiryId);
          if (matchedInq?.dbId) resolvedInqId = matchedInq.dbId;
        }

        // Resolve quotation primary key ID or ref
        let resolvedQuoteId: string | number | undefined = booking.quotationId;
        if (booking.quotationId) {
          const matchedQuote = quotations.find(q => q.id === booking.quotationId || (q as any).quotationRef === booking.quotationId);
          if (matchedQuote?.id) resolvedQuoteId = matchedQuote.id;
        }

        // Create new booking
        await createBookingApi({
          bookingRef: booking.id,
          inquiryId: resolvedInqId,
          quotationId: resolvedQuoteId,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          eventTitle: booking.eventTitle,
          eventType: booking.eventType,
          eventDate: booking.eventDate,
          startTime: booking.startTime || '17:00',
          endTime: booking.endTime || '23:00',
          venue: booking.venue,
          guestCount: booking.guestCount,
          totalAmount: booking.totalAmount,
          status: booking.status || 'Confirmed',
          notes: booking.notes,
          assignedStaff: booking.assignedStaff?.map(s => ({ id: s.id, role: s.role })) || [],
          assignedEquipment: booking.assignedEquipmentIds?.map(eqId => ({ resourceId: eqId, quantity: 1 })) || [],
          assignedServices: booking.assignedServices || [],
          assignedPackages: booking.assignedPackages || [],
        }, token);
        toast.success(`New booking ${booking.id} confirmed and scheduled!`);
      }
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error saving booking:', err);
      toast.error('Failed to save booking', { description: err.message });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const token = getAdminToken();
    try {
      await deleteBookingApi(bookingId, token);
      toast.info(`Booking ${bookingId} removed.`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      toast.error('Failed to delete booking', { description: err.message });
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    const token = getAdminToken();
    // Optimistic UI update for immediate dropdown feedback
    setBookings(prev => prev.map(b => 
      (b.id === bookingId || (b.dbId && String(b.dbId) === bookingId))
        ? { ...b, status }
        : b
    ));

    try {
      await updateBookingStatusApi(bookingId, status, token);
      toast.success(`Booking ${bookingId} status updated to ${status}.`);
      await loadAllAdminData();
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      toast.error('Failed to update booking status', { description: err.message });
      await loadAllAdminData();
    }
  };

  const handleRescheduleBooking = async (
    bookingId: string, 
    newDate: string, 
    newStartTime: string, 
    newEndTime: string, 
    reason: string
  ) => {
    const token = getAdminToken();
    try {
      await rescheduleBookingApi(bookingId, {
        newDate,
        newStartTime,
        newEndTime,
        reason,
      }, token);
      toast.success(`Booking ${bookingId} rescheduled to ${newDate} (${newStartTime} - ${newEndTime}).`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error rescheduling booking:', err);
      toast.error('Rescheduling Failed', { description: err.message });
    }
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    const token = getAdminToken();
    try {
      await cancelBookingApi(bookingId, reason, token);
      toast.warning(`Booking ${bookingId} has been cancelled and schedule released.`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      toast.error('Cancellation Failed', { description: err.message });
    }
  };

  // ==========================================
  // PERSISTENT PAYMENT ACTIONS
  // ==========================================
  const handleSavePayment = async (payment: PaymentTransaction) => {
    const token = getAdminToken();

    try {
      const matchedBooking = payment.bookingId 
        ? bookings.find(b => b.id === payment.bookingId || (b.dbId && String(b.dbId) === payment.bookingId)) 
        : undefined;

      const targetBookingId = matchedBooking?.dbId || matchedBooking?.id || payment.bookingId;

      await createPaymentApi({
        paymentRef: payment.id,
        receiptNumber: payment.receiptNumber,
        bookingId: targetBookingId,
        quotationId: payment.quotationId || matchedBooking?.quotationId,
        clientName: payment.clientName,
        clientEmail: payment.clientEmail,
        type: payment.type,
        amount: payment.amount,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        date: payment.date,
        verified: payment.verified !== false,
        notes: payment.notes,
      }, token);

      toast.success(`Payment receipt #${payment.receiptNumber} recorded in ledger!`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error saving payment:', err);
      toast.error('Failed to save payment', { description: err.message });
    }
  };

  const handleToggleVerifyPayment = async (paymentId: string) => {
    const token = getAdminToken();
    try {
      await verifyPaymentApi(paymentId, token);
      toast.success('Payment verified and officially settled in ledger.');
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      toast.error('Verification failed', { description: err.message });
    }
  };

  const handleRejectPayment = async (paymentId: string, reason: string) => {
    const token = getAdminToken();
    try {
      await rejectPaymentApi(paymentId, reason, token);
      toast.warning('Payment proof rejected and marked in audit ledger.');
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error rejecting payment:', err);
      toast.error('Rejection failed', { description: err.message });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const token = getAdminToken();
    try {
      await deletePaymentApi(paymentId, token);
      toast.info('Payment receipt removed from database ledger.');
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting payment:', err);
      toast.error('Failed to delete payment', { description: err.message });
    }
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    const token = getAdminToken();
    try {
      await deleteInquiryApi(inquiryId, token);
      toast.info(`Inquiry #${inquiryId} removed from database.`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting inquiry:', err);
      toast.error('Failed to delete inquiry', { description: err.message });
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    const token = getAdminToken();
    try {
      await deleteQuotationApi(quotationId, token);
      toast.info(`Quotation #${quotationId} deleted from database.`);
      loadAllAdminData();
    } catch (err: any) {
      console.error('Error deleting quotation:', err);
      toast.error('Failed to delete quotation', { description: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Toaster position="top-right" richColors />
      <AdminDashboard
        userEmail={userEmail}
        inquiries={inquiries}
        quotations={quotations}
        services={services}
        packages={packages}
        equipmentResources={equipmentResources}
        bookings={bookings}
        payments={payments}
        staffRoster={staffRoster}
        onNavigateHome={() => router.push('/homepage')}
        onLogout={handleLogout}
        onSwitchToCustomer={() => router.push('/customer')}
        onSaveQuotation={handleSaveQuotation}
        onDeleteQuotation={handleDeleteQuotation}
        onUpdateInquiryStatus={handleUpdateInquiryStatus}
        onDeleteInquiry={handleDeleteInquiry}
        onVerifyDownpayment={handleVerifyDownpayment}
        onApproveBooking={handleApproveBooking}
        onSaveService={handleSaveService}
        onDeleteService={handleDeleteService}
        onToggleServiceActive={handleToggleServiceActive}
        onSavePackage={handleSavePackage}
        onDeletePackage={handleDeletePackage}
        onTogglePackageActive={handleTogglePackageActive}
        onSaveEquipment={handleSaveEquipment}
        onDeleteEquipment={handleDeleteEquipment}
        onSaveBooking={handleSaveBooking}
        onDeleteBooking={handleDeleteBooking}
        onUpdateBookingStatus={handleUpdateBookingStatus}
        onRescheduleBooking={handleRescheduleBooking}
        onCancelBooking={handleCancelBooking}
        onSavePayment={handleSavePayment}
        onToggleVerifyPayment={handleToggleVerifyPayment}
        onVerifyPayment={handleToggleVerifyPayment}
        onRejectPayment={handleRejectPayment}
        onDeletePayment={handleDeletePayment}
        adminToken={getAdminToken()}
        onAccountCreated={loadAllAdminData}
        onToggleStaffStatus={handleToggleStaffStatus}
      />
    </div>
  );
}
