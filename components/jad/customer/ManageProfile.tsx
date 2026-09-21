"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Bell, 
  Camera, 
  Trash2, 
  Save, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  fetchCustomerProfile, 
  updateCustomerProfile, 
  changeCustomerPassword, 
  uploadProfileImage, 
  removeProfileImage 
} from '@/services/api';

interface NotificationPreferences {
  bookingUpdates: boolean;
  quotationNotifications: boolean;
  paymentReminders: boolean;
  eventReminders: boolean;
  systemAnnouncements: boolean;
}

interface UserProfileData {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  address?: string | null;
  profileImage?: string | null;
  notificationPreferences?: NotificationPreferences | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ManageProfileProps {
  onBackToDashboard?: () => void;
  onNavigateHome?: () => void;
}

export const ManageProfile: React.FC<ManageProfileProps> = ({
  onBackToDashboard,
  onNavigateHome
}) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form States - Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Form States - Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States - Notifications
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    bookingUpdates: true,
    quotationNotifications: true,
    paymentReminders: true,
    eventReminders: true,
    systemAnnouncements: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jad_token') || '';
    }
    return '';
  };

  const loadProfile = async () => {
    const token = getAuthToken();
    try {
      setIsLoading(true);
      const res = await fetchCustomerProfile(token);
      if (res.user) {
        const u: UserProfileData = res.user;
        setProfile(u);
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setAddress(u.address || '');
        setProfileImage(u.profileImage || null);

        if (u.notificationPreferences) {
          setNotifications({
            bookingUpdates: u.notificationPreferences.bookingUpdates ?? true,
            quotationNotifications: u.notificationPreferences.quotationNotifications ?? true,
            paymentReminders: u.notificationPreferences.paymentReminders ?? true,
            eventReminders: u.notificationPreferences.eventReminders ?? true,
            systemAnnouncements: u.notificationPreferences.systemAnnouncements ?? true,
          });
        }

        // Sync local storage user cache
        const savedUserStr = localStorage.getItem('jad_user');
        if (savedUserStr) {
          try {
            const currentCache = JSON.parse(savedUserStr);
            localStorage.setItem('jad_user', JSON.stringify({
              ...currentCache,
              name: u.name,
              email: u.email,
              phone: u.phone,
              profileImage: u.profileImage
            }));
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      toast.error('Could not load profile details', {
        description: err.message || 'Please verify your connection and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Personal Info Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const token = getAuthToken();

    setIsSavingProfile(true);
    try {
      const res = await updateCustomerProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notificationPreferences: notifications
      }, token);

      if (res.user) {
        setProfile(res.user);
        setName(res.user.name);
        setEmail(res.user.email);
        setPhone(res.user.phone || '');
        setAddress(res.user.address || '');

        // Update local session
        const savedUserStr = localStorage.getItem('jad_user');
        if (savedUserStr) {
          try {
            const currentCache = JSON.parse(savedUserStr);
            localStorage.setItem('jad_user', JSON.stringify({
              ...currentCache,
              name: res.user.name,
              email: res.user.email,
              phone: res.user.phone,
              profileImage: res.user.profileImage
            }));
          } catch (e) {}
        }
      }

      toast.success('Profile Updated Successfully!', {
        description: 'Your personal information has been saved to your account.'
      });
    } catch (err: any) {
      toast.error('Failed to update profile', {
        description: err.message || 'Please check your information and try again.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported image format', {
        description: 'Please upload a JPG, PNG, WEBP, or GIF image.'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Profile image size must be under 5MB.'
      });
      return;
    }

    const token = getAuthToken();

    setIsUploadingImage(true);
    try {
      const res = await uploadProfileImage(file, token);
      if (res.profileImage) {
        setProfileImage(res.profileImage);
        setProfile(prev => prev ? ({ ...prev, profileImage: res.profileImage }) : null);

        // Update localStorage
        const savedUserStr = localStorage.getItem('jad_user');
        if (savedUserStr) {
          try {
            const currentCache = JSON.parse(savedUserStr);
            localStorage.setItem('jad_user', JSON.stringify({
              ...currentCache,
              profileImage: res.profileImage
            }));
          } catch (e) {}
        }

        toast.success('Profile Picture Updated!', {
          description: 'Your new avatar has been saved.'
        });
      }
    } catch (err: any) {
      toast.error('Image upload failed', {
        description: err.message || 'Could not upload image.'
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Remove Image
  const handleRemoveImage = async () => {
    const token = getAuthToken();

    setIsUploadingImage(true);
    try {
      await removeProfileImage(token);
      setProfileImage(null);
      setProfile(prev => prev ? ({ ...prev, profileImage: null }) : null);

      const savedUserStr = localStorage.getItem('jad_user');
      if (savedUserStr) {
        try {
          const currentCache = JSON.parse(savedUserStr);
          localStorage.setItem('jad_user', JSON.stringify({
            ...currentCache,
            profileImage: null
          }));
        } catch (e) {}
      }

      toast.info('Profile picture removed');
    } catch (err: any) {
      toast.error('Failed to remove image', { description: err.message });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    const token = getAuthToken();

    setIsSavingPassword(true);
    try {
      await changeCustomerPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }, token);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Password Changed Successfully!', {
        description: 'Your account credentials have been updated securely.'
      });
    } catch (err: any) {
      toast.error('Password Change Failed', {
        description: err.message || 'Please check your current password and try again.'
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Notification Preferences Toggle
  const handleToggleNotification = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);

    const token = getAuthToken();

    setIsSavingNotifications(true);
    try {
      await updateCustomerProfile({
        name: name.trim() || profile?.name || 'Customer',
        email: email.trim() || profile?.email || 'customer@example.com',
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notificationPreferences: updated
      }, token);
      toast.success('Notification preference saved');
    } catch (err: any) {
      toast.error('Could not save preference', { description: err.message });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const displayName = name || profile?.name || email.split('@')[0] || 'Customer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToDashboard ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToDashboard}
                className="text-slate-600 hover:text-[#1E3A8A] gap-1.5 rounded-xl font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Customer Dashboard</span>
              </Button>
            ) : onNavigateHome ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateHome}
                className="text-slate-600 hover:text-[#1E3A8A] gap-1.5 rounded-xl font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Button>
            ) : null}

            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                J
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1E3A8A] leading-tight">JAD EVENTS</span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">Account & Profile Settings</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="blue" className="text-xs font-semibold gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Account</span>
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A] tracking-tight">
              Manage Profile
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Update your personal details, profile picture, account security, and notification preferences.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadProfile}
              disabled={isLoading}
              className="text-xs font-semibold gap-1.5 rounded-xl bg-white border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Reload Profile</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
            <p className="text-sm text-slate-500 font-medium">Loading your profile information...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Section 1 - Personal Information (7 Cols) */}
            <div className="lg:col-span-7 space-y-8">
              {/* SECTION 1 — Personal Information Card */}
              <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-[#1E3A8A]">
                        Personal Information
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Manage your public client identity and contact information.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Profile Picture Upload Header Sub-section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <div className="relative group shrink-0">
                      <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white shadow-md">
                        {profileImage ? (
                          <AvatarImage src={profileImage} alt={displayName} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-[#1E3A8A] text-white text-2xl font-black rounded-2xl">
                          {displayName[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="font-bold text-slate-900 text-sm">
                        Profile Picture
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Upload a photo to personalize your client dashboard. Formats: JPG, PNG, WEBP, or GIF (Max 5MB).
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageFileChange}
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="brand"
                          size="sm"
                          disabled={isUploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                        </Button>

                        {profileImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isUploadingImage}
                            onClick={handleRemoveImage}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 rounded-xl"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Details Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="fullName" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#1E3A8A]" />
                          <span>Full Name</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Maria Santos"
                          required
                          className="rounded-xl border-slate-200 focus-visible:ring-[#1E3A8A] text-sm h-11"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="emailAddress" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#1E3A8A]" />
                          <span>Email Address</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="emailAddress"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. maria.santos@example.com"
                          required
                          className="rounded-xl border-slate-200 focus-visible:ring-[#1E3A8A] text-sm h-11"
                        />
                        <span className="text-[11px] text-slate-400">
                          Used for login, quotation notifications, and booking vouchers.
                        </span>
                      </div>

                      {/* Contact Number */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="phoneNumber" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#1E3A8A]" />
                          <span>Contact Number</span>
                        </Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +63 917 123 4567"
                          className="rounded-xl border-slate-200 focus-visible:ring-[#1E3A8A] text-sm h-11"
                        />
                        <span className="text-[11px] text-slate-400">
                          Used by our event coordinators to coordinate production on event day.
                        </span>
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="homeAddress" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#1E3A8A]" />
                          <span>Billing / Home Address</span>
                        </Label>
                        <Textarea
                          id="homeAddress"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Unit 402, High Street Condominium, Bonifacio Global City, Taguig"
                          rows={3}
                          className="rounded-xl border-slate-200 focus-visible:ring-[#1E3A8A] text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={loadProfile}
                        disabled={isSavingProfile}
                        className="rounded-xl text-xs font-semibold text-slate-500"
                      >
                        Reset Changes
                      </Button>
                      <Button
                        type="submit"
                        variant="brand"
                        disabled={isSavingProfile}
                        className="rounded-xl text-xs font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white gap-2 px-5 h-10 shadow-sm"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Profile Changes</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Account Metadata / Verification Footer */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Account Role: <strong>{profile?.role || 'Customer'}</strong></span>
                </div>
                <div>
                  Member Since: <strong>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026'}</strong>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Section 2 (Security) & Section 3 (Notifications) (5 Cols) */}
            <div className="lg:col-span-5 space-y-8">
              {/* SECTION 2 — Account Security Card */}
              <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-[#1E3A8A]">
                        Account Security
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Update your password and keep your client account protected.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-8">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword" className="text-xs font-bold text-slate-700">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          required
                          className="rounded-xl border-slate-200 text-sm h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          className="rounded-xl border-slate-200 text-sm h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          required
                          minLength={6}
                          className="rounded-xl border-slate-200 text-sm h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password requirements hint */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword.length >= 6 ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Minimum 6 characters</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>New passwords match</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="w-full rounded-xl text-xs font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white h-11 shadow-sm mt-2"
                    >
                      {isSavingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* SECTION 3 — Notification Preferences Card */}
              <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-[#1E3A8A]">
                          Notification Preferences
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Configure your email and portal alerts.
                        </CardDescription>
                      </div>
                    </div>
                    {isSavingNotifications && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#1E3A8A]" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 space-y-4">
                  {/* Notification Items */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">Booking Updates</div>
                      <div className="text-[11px] text-slate-500">Milestone confirmations and schedule adjustments</div>
                    </div>
                    <Switch
                      checked={notifications.bookingUpdates}
                      onCheckedChange={(checked) => handleToggleNotification('bookingUpdates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">Quotation Notifications</div>
                      <div className="text-[11px] text-slate-500">New line-item quote dispatches and revisions</div>
                    </div>
                    <Switch
                      checked={notifications.quotationNotifications}
                      onCheckedChange={(checked) => handleToggleNotification('quotationNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">Payment Reminders</div>
                      <div className="text-[11px] text-slate-500">50% downpayment receipts and final milestone alerts</div>
                    </div>
                    <Switch
                      checked={notifications.paymentReminders}
                      onCheckedChange={(checked) => handleToggleNotification('paymentReminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">Event Reminders</div>
                      <div className="text-[11px] text-slate-500">Countdown reminders and logistics briefing notes</div>
                    </div>
                    <Switch
                      checked={notifications.eventReminders}
                      onCheckedChange={(checked) => handleToggleNotification('eventReminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">System Announcements</div>
                      <div className="text-[11px] text-slate-500">Special seasonal packages and platform enhancements</div>
                    </div>
                    <Switch
                      checked={notifications.systemAnnouncements}
                      onCheckedChange={(checked) => handleToggleNotification('systemAnnouncements', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
