"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await forgotPassword(email.trim());
      setSubmitted(true);
      setFeedbackMessage(
        res.message || 'If an account with that email exists, a password reset link has been sent.'
      );
    } catch (err: any) {
      // If server returned a rate-limit error (429), display it; otherwise show generic message
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
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
            Forgot Your Password?
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            No worries. Enter your registered email address and we will send you a secure password reset link.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 backdrop-blur-sm">
          {submitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Check Your Inbox</h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  {feedbackMessage}
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The link will expire in <strong>30 minutes</strong>. If you don't see the email, check your spam or junk folder.
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href="/homepage?auth=login"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white shadow-md shadow-blue-900/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm h-10 border-slate-200 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]/20"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Enter the email associated with your customer or administrator account.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full h-10 rounded-full font-semibold bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white shadow-md shadow-blue-900/10"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Reset Link...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Send Reset Link</span>
                      <Send className="w-3.5 h-3.5" />
                    </span>
                  )}
                </Button>

                <div className="text-center pt-2">
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

        {/* Security badge footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          Protected with end-to-end cryptographic token verification & rate limiting.
        </div>
      </div>
    </div>
  );
}
