"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerDashboard } from '@/components/jad/customer/CustomerDashboard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Quotation, InquiryFormData, PaymentTransaction, Booking } from '@/components/jad/types';

import Cookies from 'js-cookie';
import { fetchCustomerPortalData, payQuotationDepositApi } from '@/services/api';

export default function CustomerPage() {
  const router = useRouter();
  
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [inquiries, setInquiries] = useState<InquiryFormData[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const getCustomerToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jad_token') || Cookies.get('token') || Cookies.get('jad_token') || '';
    }
    return '';
  }, []);

  const loadPortalData = useCallback(async () => {
    const token = getCustomerToken();

    try {
      const data = await fetchCustomerPortalData(token);
      
      // If user is null, it means the API rejected the request (likely 401 Unauthorized)
      if (!data || !data.user) {
        return false;
      }

      if (data.user) {
        setUserEmail(data.user.email);
        setUserName(data.user.name);
        setUserAvatar(data.user.profileImage || undefined);
        
        // Ensure localStorage is synced (important for Google OAuth users returning to homepage)
        localStorage.setItem('jad_user', JSON.stringify({
          role: data.user.role === 'Administrator' ? 'Administrator' : 'Customer',
          email: data.user.email,
          name: data.user.name
        }));
      }

      if (data.inquiries && data.inquiries.length > 0) {
        setInquiries(data.inquiries.map((inq: any) => {
          return {
            id: inq.trackingId || inq.id.toString(),
            dbId: inq.id,
            fullName: inq.clientName || (data.user ? data.user.name : 'Client'),
            email: inq.clientEmail || (data.user ? data.user.email : userEmail),
            phone: inq.clientPhone || (data.user ? data.user.phone : ''),
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
      } else {
        setInquiries([]);
      }

      if (data.quotations && data.quotations.length > 0) {
        setQuotations(data.quotations.map((q: any) => ({
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
          status: q.status || 'Quotation Sent',
          notes: q.notes || '',
          terms: Array.isArray(q.terms) ? q.terms : [],
          createdAt: q.createdAt ? q.createdAt.split('T')[0] : '',
          sentAt: q.sentAt ? q.sentAt.split('T')[0] : undefined,
          depositPaidAt: q.depositPaidAt ? q.depositPaidAt.split('T')[0] : undefined,
          confirmedAt: q.confirmedAt ? q.confirmedAt.split('T')[0] : undefined,
        })));
      } else {
        setQuotations([]);
      }

      if (data.bookings && data.bookings.length > 0) {
        setBookings(data.bookings.map((b: any) => ({
          id: b.bookingRef || `BK-${b.id}`,
          dbId: b.id,
          inquiryId: b.inquiryId ? b.inquiryId.toString() : (b.inquiry?.trackingId || undefined),
          quotationId: b.quotationId ? b.quotationId.toString() : (b.quotation?.quotationRef || undefined),
          clientName: b.clientName,
          clientEmail: b.clientEmail,
          clientPhone: b.clientPhone,
          eventTitle: b.eventTitle,
          eventType: b.eventType,
          eventDate: b.eventDate ? b.eventDate.split('T')[0] : '',
          startTime: b.startTime,
          endTime: b.endTime,
          venue: b.venue,
          guestCount: b.guestCount,
          status: b.status,
          totalAmount: Number(b.totalAmount) || 0,
          notes: b.notes,
          confirmedAt: b.confirmedAt ? b.confirmedAt.split('T')[0] : undefined,
          feedback: b.feedback || null,
        })));
      } else {
        setBookings([]);
      }

      if (data.payments && data.payments.length > 0) {
        setPayments(data.payments.map((p: any) => ({
          id: p.paymentRef || `PAY-${p.id}`,
          dbId: p.id,
          bookingId: p.bookingId ? p.bookingId.toString() : undefined,
          quotationId: p.quotationId ? p.quotationId.toString() : undefined,
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
          verifiedBy: p.verifiedBy,
          verifiedAt: p.verifiedAt ? p.verifiedAt.split('T')[0] : undefined,
          rejectionReason: p.rejectionReason,
          rejectedBy: p.rejectedBy,
          rejectedAt: p.rejectedAt ? p.rejectedAt.split('T')[0] : undefined,
          proofUrl: p.proofUrl,
          notes: p.notes,
        })));
      } else {
        setPayments([]);
      }
      
      return true;
    } catch (err) {
      console.warn('Customer loadPortalData fallback:', err);
      return false;
    }
  }, [getCustomerToken, userEmail]);

  useEffect(() => {
    // Attempt to load optimistic user data from localStorage to prevent flash
    const saved = localStorage.getItem('jad_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email) setUserEmail(parsed.email);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.profileImage) setUserAvatar(parsed.profileImage);
      } catch (e) {
        console.error(e);
      }
    }

    // Verify session strictly with the server
    loadPortalData().then(isAuthenticated => {
      if (!isAuthenticated) {
        toast.info('Please sign in to access your customer dashboard.');
        router.replace('/homepage');
      }
    });

    const handleFocus = () => {
      loadPortalData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadPortalData, router]);

  const customerQuotation = quotations[0] || null;
  const customerInquiry = inquiries[0] || null;
  const customerBooking = bookings[0] || null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    Cookies.remove('token', { path: '/' });
    Cookies.remove('jad_token', { path: '/' });
    localStorage.removeItem('jad_token');
    localStorage.removeItem('jad_user');
    toast.info('You have been signed out.');
    router.push('/homepage');
  };

  const handleCustomerPayDownpayment = async (quotationId: string) => {
    const token = getCustomerToken();

    try {
      await payQuotationDepositApi(quotationId, {
        method: 'GCash QR',
        referenceNumber: `GCASH-${Date.now().toString().slice(-6)}`,
      }, token);

      toast.success('50% Reservation Downpayment Settled!', {
        description: 'Your payment is recorded in the ledger and the calendar slot is locked.'
      });

      loadPortalData();
    } catch (err: any) {
      console.error('Error paying deposit:', err);
      toast.error('Payment Failed', { description: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Toaster position="top-right" richColors />
      <CustomerDashboard
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
        quotation={customerQuotation}
        inquiry={customerInquiry}
        quotations={quotations}
        inquiries={inquiries}
        payments={payments}
        bookings={bookings}
        booking={customerBooking}
        onNavigateHome={() => router.push('/homepage')}
        onLogout={handleLogout}
        onSwitchToAdmin={() => router.push('/admin')}
        onPayDownpayment={handleCustomerPayDownpayment}
        onManageProfile={() => router.push('/customer/profile')}
        onRefreshData={loadPortalData}
      />
    </div>
  );
}
