import Cookies from 'js-cookie';

export const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL?.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : '/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api');

export const getStoredToken = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jad_token') || Cookies.get('token') || Cookies.get('jad_token') || '';
  }
  return '';
};

async function parseResponseJson(res: Response) {
  try {
    return await res.json();
  } catch (_) {
    return { message: res.statusText || `Request failed with status ${res.status}` };
  }
}

function getAuthHeaders(token?: string, contentType: string | null = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  const effectiveToken = token || getStoredToken();
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
  }
  return headers;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to login');
  }
  return data;
}

export async function registerUser(name: string, email: string, password: string, phone?: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, phone }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to register');
  }
  return data;
}

export async function logoutUser() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('Logout endpoint notice:', err);
  }
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to send password reset link');
  }
  return data;
}

export async function verifyResetToken(token: string) {
  const res = await fetch(`${API_URL}/auth/reset-password?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Invalid or expired reset token');
  }
  return data;
}

export async function resetPasswordApi(token: string, newPassword: string, confirmPassword: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }
  return data;
}

export async function createPrivilegedUserApi(
  userData: { name: string; email: string; password: string; role: 'Staff' | 'Administrator'; phone?: string },
  token?: string
) {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(userData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create privileged account');
  }
  return data;
}

export async function fetchUsers(token?: string) {
  const res = await fetch(`${API_URL}/users`, {
    headers: getAuthHeaders(token),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch user accounts');
  }
  return data;
}

export async function fetchServices(search = '', limit = 100, offset = 0) {
  try {
    const params = new URLSearchParams({
      search,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const res = await fetch(`${API_URL}/services?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { services: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchServices notice:', error);
    return { services: [], total: 0 };
  }
}

export async function createServiceApi(serviceData: any, token?: string) {
  const res = await fetch(`${API_URL}/services`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(serviceData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to create service');
  return data;
}

export async function updateServiceApi(id: number | string, serviceData: any, token?: string) {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(serviceData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update service');
  return data;
}

export async function deleteServiceApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/services/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete service');
  return data;
}

export async function fetchPackages(search = '', limit = 100, offset = 0) {
  try {
    const params = new URLSearchParams({
      search,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const res = await fetch(`${API_URL}/packages?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { packages: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchPackages notice:', error);
    return { packages: [], total: 0 };
  }
}

export async function createPackageApi(packageData: any, token?: string) {
  const res = await fetch(`${API_URL}/packages`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(packageData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to create package');
  return data;
}

export async function updatePackageApi(id: number | string, packageData: any, token?: string) {
  const res = await fetch(`${API_URL}/packages/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(packageData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update package');
  return data;
}

export async function deletePackageApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/packages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete package');
  return data;
}

export async function fetchInquiries(limit = 100, offset = 0, token?: string) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const res = await fetch(`${API_URL}/inquiries?${params.toString()}`, {
      headers: getAuthHeaders(token, null),
      cache: 'no-store',
    });
    if (!res.ok) return { inquiries: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchInquiries notice:', error);
    return { inquiries: [], total: 0 };
  }
}

export async function submitInquiry(data: {
  trackingId?: string;
  eventType: string;
  eventDate: string;
  eventVenue?: string;
  venue?: string;
  guestsCount?: number;
  guestCount?: number;
  requirements?: string;
  fullName?: string;
  clientName?: string;
  email?: string;
  clientEmail?: string;
  phone?: string;
  clientPhone?: string;
  selectedServices?: string[];
  packageId?: string;
  notes?: string;
  budgetRange?: string;
  estimatedBudget?: string;
  customPackage?: any;
}) {
  const payload = {
    eventType: data.eventType,
    eventDate: data.eventDate,
    venue: data.venue || data.eventVenue || '',
    guestCount: Number(data.guestCount || data.guestsCount) || 100,
    clientName: data.clientName || data.fullName || 'Anonymous Client',
    clientEmail: data.clientEmail || data.email || '',
    clientPhone: data.clientPhone || data.phone || '',
    selectedServices: data.selectedServices || [],
    packageId: data.packageId ? (Number(data.packageId) || null) : null,
    notes: data.notes || data.requirements || '',
    estimatedBudget: data.estimatedBudget || data.budgetRange || '',
  };

  const res = await fetch(`${API_URL}/inquiries`, {
    method: 'POST',
    headers: getAuthHeaders(undefined),
    body: JSON.stringify(payload),
  });
  const resData = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(resData.message || 'Failed to submit inquiry');
  }
  return resData;
}

export async function updateInquiryStatusApi(id: number | string, status: string, token?: string) {
  const res = await fetch(`${API_URL}/inquiries/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update inquiry status');
  return data;
}

export async function deleteInquiryApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/inquiries/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete inquiry');
  return data;
}

export async function cancelInquiryApi(id: number | string, reason: string | null = null, token?: string) {
  const res = await fetch(`${API_URL}/inquiries/${id}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to cancel inquiry');
  return data;
}

export async function fetchCustomerProfile(token?: string) {
  const res = await fetch(`${API_URL}/customer/profile`, {
    headers: getAuthHeaders(token, null),
    cache: 'no-store',
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch profile');
  }
  return data;
}

export async function updateCustomerProfile(
  data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    notificationPreferences?: {
      bookingUpdates?: boolean;
      quotationNotifications?: boolean;
      paymentReminders?: boolean;
      eventReminders?: boolean;
      systemAnnouncements?: boolean;
    };
  },
  token?: string
) {
  const res = await fetch(`${API_URL}/customer/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  const resData = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(resData.message || 'Failed to update profile');
  }
  return resData;
}

export async function changeCustomerPassword(
  passwords: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
  token?: string
) {
  const res = await fetch(`${API_URL}/customer/profile/password`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(passwords),
  });
  const resData = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(resData.message || 'Failed to change password');
  }
  return resData;
}

export async function uploadProfileImage(file: File, token?: string) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_URL}/customer/profile/image`, {
    method: 'POST',
    headers: getAuthHeaders(token, null),
    body: formData,
  });
  const resData = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(resData.message || 'Failed to upload profile picture');
  }
  return resData;
}

export async function removeProfileImage(token?: string) {
  const res = await fetch(`${API_URL}/customer/profile/image`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const resData = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(resData.message || 'Failed to remove profile picture');
  }
  return resData;
}

// ==========================================
// STAFF API METHODS
// ==========================================
export async function fetchStaff(search = '', limit = 100, offset = 0) {
  try {
    const params = new URLSearchParams({ search, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_URL}/staff?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { staff: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchStaff notice:', error);
    return { staff: [], total: 0 };
  }
}

export async function createStaffApi(staffData: any, token?: string) {
  const res = await fetch(`${API_URL}/staff`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(staffData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to add staff');
  return data;
}

export async function toggleStaffStatusApi(staffId: string, newStatus: string, token?: string) {
  const res = await fetch(`${API_URL}/staff/${staffId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status: newStatus }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update staff status');
  return data;
}

export async function updateStaffApi(id: number | string, staffData: any, token?: string) {
  const res = await fetch(`${API_URL}/staff/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(staffData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update staff');
  return data;
}

export async function deleteStaffApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/staff/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete staff');
  return data;
}

// ==========================================
// EQUIPMENT API METHODS
// ==========================================
export async function fetchEquipment(search = '', limit = 100, offset = 0) {
  try {
    const params = new URLSearchParams({ search, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_URL}/equipment?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { resources: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchEquipment notice:', error);
    return { resources: [], total: 0 };
  }
}

export async function createEquipmentApi(eqData: any, token?: string) {
  const res = await fetch(`${API_URL}/equipment`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(eqData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to add equipment');
  return data;
}

export async function updateEquipmentApi(id: number | string, eqData: any, token?: string) {
  const res = await fetch(`${API_URL}/equipment/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(eqData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update equipment');
  return data;
}

export async function deleteEquipmentApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/equipment/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete equipment');
  return data;
}

// ==========================================
// QUOTATIONS API METHODS
// ==========================================
export async function fetchQuotations(search = '', limit = 100, offset = 0, token?: string) {
  try {
    const params = new URLSearchParams({ search, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_URL}/quotations?${params.toString()}`, { 
      headers: getAuthHeaders(token, null), 
      cache: 'no-store' 
    });
    if (!res.ok) return { quotations: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchQuotations notice:', error);
    return { quotations: [], total: 0 };
  }
}

export async function createQuotationApi(quoteData: any, token?: string) {
  const res = await fetch(`${API_URL}/quotations`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(quoteData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to create quotation');
  return data;
}

export async function updateQuotationApi(id: number | string, quoteData: any, token?: string) {
  const res = await fetch(`${API_URL}/quotations/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(quoteData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update quotation');
  return data;
}

export async function deleteQuotationApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/quotations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete quotation');
  return data;
}

export async function acceptQuotationApi(id: number | string, token?: string) {
  const targetId = encodeURIComponent(String(id).trim());
  const res = await fetch(`${API_URL}/quotations/${targetId}/accept`, {
    method: 'POST',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to accept quotation');
  return data;
}

export async function declineQuotationApi(id: number | string, reason: string, token?: string) {
  const targetId = encodeURIComponent(String(id).trim());
  const res = await fetch(`${API_URL}/quotations/${targetId}/decline`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to decline quotation');
  return data;
}

export async function payQuotationDepositApi(id: number | string, paymentData: any, token?: string) {
  const targetId = encodeURIComponent(String(id).trim());
  const res = await fetch(`${API_URL}/quotations/${targetId}/pay-deposit`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(paymentData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to record deposit payment');
  return data;
}

// ==========================================
// BOOKINGS API METHODS
// ==========================================
export async function fetchBookings(status = 'ALL', search = '', limit = 100, offset = 0, token?: string) {
  try {
    const params = new URLSearchParams({ status, search, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_URL}/bookings?${params.toString()}`, { 
      headers: getAuthHeaders(token, null), 
      cache: 'no-store' 
    });
    if (!res.ok) return { bookings: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchBookings notice:', error);
    return { bookings: [], total: 0 };
  }
}

export async function createBookingApi(bookingData: any, token?: string) {
  const res = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(bookingData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to create booking');
  return data;
}

export async function updateBookingApi(id: number | string, bookingData: any, token?: string) {
  const res = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(bookingData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update booking');
  return data;
}

export async function rescheduleBookingApi(id: number | string, rescheduleData: { newDate: string; newStartTime: string; newEndTime: string; reason: string }, token?: string) {
  const res = await fetch(`${API_URL}/bookings/${id}/reschedule`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(rescheduleData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to reschedule booking');
  return data;
}

export async function cancelBookingApi(id: number | string, reason: string, token?: string) {
  const res = await fetch(`${API_URL}/bookings/${id}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to cancel booking');
  return data;
}

export async function updateBookingStatusApi(id: number | string, status: string, token?: string) {
  const res = await fetch(`${API_URL}/bookings/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to update booking status');
  return data;
}

export async function deleteBookingApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete booking');
  return data;
}

// ==========================================
// SCHEDULING & RADAR API METHODS
// ==========================================
export async function fetchAvailabilityRadar(year: number, month: number) {
  try {
    const params = new URLSearchParams({ year: year.toString(), month: month.toString() });
    const res = await fetch(`${API_URL}/scheduling/availability?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { year, month, days: [] };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchAvailabilityRadar notice:', error);
    return { year, month, days: [] };
  }
}

export async function checkClashApi(params: {
  eventDate: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  excludeBookingId?: number | null;
  requestedStaffIds?: number[];
  requestedResourceAllocations?: Array<{ resourceId: number; quantity: number }>;
}) {
  const res = await fetch(`${API_URL}/scheduling/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to check scheduling clash');
  return data;
}

// ==========================================
// PAYMENTS API METHODS
// ==========================================
export async function fetchPayments(search = '', limit = 100, offset = 0, token?: string) {
  try {
    const params = new URLSearchParams({ search, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_URL}/payments?${params.toString()}`, { 
      headers: getAuthHeaders(token, null), 
      cache: 'no-store' 
    });
    if (!res.ok) return { payments: [], total: 0 };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchPayments notice:', error);
    return { payments: [], total: 0 };
  }
}

export async function createPaymentApi(paymentData: any, token?: string) {
  const res = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(paymentData),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to record payment');
  return data;
}

export async function verifyPaymentApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/payments/${id}/verify`, {
    method: 'PATCH',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to verify payment');
  return data;
}

export async function rejectPaymentApi(id: number | string, reason: string, token?: string) {
  const res = await fetch(`${API_URL}/payments/${id}/reject`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to reject payment');
  return data;
}

export async function deletePaymentApi(id: number | string, token?: string) {
  const res = await fetch(`${API_URL}/payments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, null),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to delete payment');
  return data;
}

export async function uploadPaymentProofApi(file: File, token?: string) {
  const formData = new FormData();
  formData.append('proof', file);

  const res = await fetch(`${API_URL}/payments/upload-proof`, {
    method: 'POST',
    headers: getAuthHeaders(token, null),
    body: formData,
  });
  const data = await parseResponseJson(res);
  if (!res.ok) throw new Error(data.message || 'Failed to upload payment proof');
  return data;
}

// ==========================================
// CUSTOMER PORTAL DATA API
// ==========================================
export async function fetchCustomerPortalData(token?: string) {
  try {
    const res = await fetch(`${API_URL}/customer/portal`, {
      headers: getAuthHeaders(token, null),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { user: null, inquiries: [], quotations: [], bookings: [], payments: [] };
    }
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchCustomerPortalData notice:', error);
    return { user: null, inquiries: [], quotations: [], bookings: [], payments: [] };
  }
}

// ==========================================
// CUSTOMER FEEDBACK & EVALUATION APIs
// ==========================================
export async function submitCustomerFeedbackApi(
  payload: {
    bookingId: number;
    overallRating: number;
    serviceRating: number;
    staffRating: number;
    executionRating: number;
    comments?: string;
    suggestions?: string;
  },
  token?: string
) {
  const res = await fetch(`${API_URL}/customer/feedback`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseResponseJson(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to submit evaluation');
  }
  return data;
}

export async function fetchCustomerFeedbackByBookingApi(bookingId: number, token?: string) {
  try {
    const res = await fetch(`${API_URL}/customer/feedback?bookingId=${bookingId}`, {
      headers: getAuthHeaders(token, null),
      cache: 'no-store',
    });
    if (!res.ok) return { feedback: null };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchCustomerFeedbackByBookingApi notice:', error);
    return { feedback: null };
  }
}

export async function fetchAdminFeedbacksApi(search = '', limit = 100, offset = 0, token?: string) {
  try {
    const params = new URLSearchParams({ search, limit: limit.toString(), offset: offset.toString() });
    const res = await fetch(`${API_URL}/admin/feedback?${params.toString()}`, {
      headers: getAuthHeaders(token, null),
      cache: 'no-store',
    });
    if (!res.ok) return { feedbacks: [], total: 0, stats: null };
    return await parseResponseJson(res);
  } catch (error) {
    console.warn('fetchAdminFeedbacksApi notice:', error);
    return { feedbacks: [], total: 0, stats: null };
  }
}

