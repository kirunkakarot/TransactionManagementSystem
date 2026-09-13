import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { findUserByEmail, findUserById, updateUserProfile } from '@/models/userModel';

export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (auth.error || !auth.user) {
    return auth.error || NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userProfile = await findUserById(auth.user.id);
    if (!userProfile) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      user: userProfile
    });
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await checkAuth(req);
  if (auth.error || !auth.user) {
    return auth.error || NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, address, notificationPreferences } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { message: 'Full name is required (between 2 and 100 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { message: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedPhone = phone !== undefined ? (phone === null ? null : String(phone).trim()) : undefined;
    const trimmedAddress = address !== undefined ? (address === null ? null : String(address).trim()) : undefined;

    // If email is changing, ensure uniqueness
    if (trimmedEmail !== auth.user.email.toLowerCase()) {
      const existingUser = await findUserByEmail(trimmedEmail);
      if (existingUser && existingUser.id !== auth.user.id) {
        return NextResponse.json(
          { message: 'This email address is already registered to another account.' },
          { status: 409 }
        );
      }
    }

    // Sanitize Notification Preferences if provided
    let sanitizedPreferences = undefined;
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      sanitizedPreferences = {
        bookingUpdates: Boolean(notificationPreferences.bookingUpdates ?? true),
        quotationNotifications: Boolean(notificationPreferences.quotationNotifications ?? true),
        paymentReminders: Boolean(notificationPreferences.paymentReminders ?? true),
        eventReminders: Boolean(notificationPreferences.eventReminders ?? true),
        systemAnnouncements: Boolean(notificationPreferences.systemAnnouncements ?? true),
      };
    }

    const updatedUser = await updateUserProfile(auth.user.id, {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      address: trimmedAddress,
      ...(sanitizedPreferences !== undefined && { notificationPreferences: sanitizedPreferences }),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error updating customer profile:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
