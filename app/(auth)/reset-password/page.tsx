"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  X, 
  KeyRound 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyResetToken, resetPasswordApi } from '@/services/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifyingToken(false);
      setTokenError('No reset token provided. Please request a new password reset link.');
      return;
    }

    async function checkToken() {
      try {
        const res = await verifyResetToken(token);
        if (res.valid) {
          setMaskedEmail(res.email || '');
          setTokenError('');
        } else {
          setTokenError(res.message || 'Invalid or expired password reset link.');
        }
      } catch (err: any) {
        setTokenError(err.message || 'Invalid or expired password reset link.');
      } finally {
        setIsVerifyingToken(false);
      }
    }

    checkToken();
  }, [token]);

  // Real-time password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setErrorMessage('Please satisfy all password strength requirements.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordApi(token, newPassword, confirmPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. The link may have expired or already been used.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/30 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/homepage" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#172554] flex items-center justify-center text-white shadow-md shadow-blue-950/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="text-left">
              <span className="text-xl font-black tracking-tight text-[#1E3A8A] block leading-none">JAD EVENTS</span>
              <span className="text-[10px] tracking-widest text-slate-500 uppercase font-semibold">Catering & Management</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Create New Password
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose a strong password to safeguard your JAD Events account.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 backdrop-blur-sm">
          {isVerifyingToken ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-600 font-medium">Verifying reset token security...</p>
            </div>
          ) : tokenError ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Reset Link Invalid or Expired</h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Link
                  href="/forgot-password"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white shadow-md transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  Request a New Link
                </Link>
                <div>
                  <Link
                    href="/homepage?auth=login"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Return to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Password Reset Complete</h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Your password has been updated securely. You can now sign in to your dashboard with your new credentials.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/homepage?auth=login"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white shadow-md shadow-blue-900/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Sign In Now
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {maskedEmail && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                  <span className="text-slate-500">Account:</span>
                  <span className="font-mono font-medium text-slate-800">{maskedEmail}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-9 text-sm h-10 border-slate-200 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]/20"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 pr-9 text-sm h-10 border-slate-200 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]/20"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                  Password Requirements
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                    {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    <span>At least 8 characters long</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                    {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                    {hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                    {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    <span>At least one number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                    {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="w-full h-10 rounded-full font-semibold bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white shadow-md shadow-blue-900/10"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </span>
                  ) : (
                    <span>Set New Password</span>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <Link
                    href="/homepage?auth=login"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#1E3A8A] font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Security footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          Encrypted with bcrypt password-hashing and one-time cryptographic verification.
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
