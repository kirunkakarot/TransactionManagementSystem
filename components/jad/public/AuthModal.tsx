"use client";
import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ArrowRight, 
  ShieldCheck
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

import { loginUser, registerUser } from '@/services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'signup';
  onLoginSuccess: (role: 'client' | 'admin', email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setPhone('');
    }
  }, [initialMode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName || fullName.trim().length < 2) {
        toast.error('Please provide your full name (minimum 2 characters).');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match. Please verify your confirm password.');
        return;
      }
    }

    setIsLoading(true);

    try {
      let res;
      let targetRole: 'client' | 'admin' = 'client';

      if (mode === 'login') {
        res = await loginUser(email, password);
        const userRole = res?.role || res?.user?.role;
        targetRole = (userRole === 'Administrator' || userRole === 'admin') ? 'admin' : 'client';
      } else {
        // Public registration ALWAYS creates a Customer account
        res = await registerUser(fullName, email, password, phone);
        targetRole = 'client';
      }

      const userObj = res?.user || {
        id: res?.id || 1,
        name: res?.name || fullName || email.split('@')[0],
        email: res?.email || email,
        role: res?.role || (targetRole === 'admin' ? 'Administrator' : 'Customer')
      };

      localStorage.setItem('jad_user', JSON.stringify(userObj));

      onLoginSuccess(targetRole, email);
      toast.success(
        mode === 'login' 
          ? `Welcome back, ${userObj.name}!` 
          : 'Customer account created successfully!'
      );
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please verify your credentials and try again.';
      toast.error('Authentication Failed', {
        description: message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 sm:p-8">
        <DialogHeader className="text-left">
          <div className="flex items-center justify-between">
            <Badge variant="blue" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secure JAD Portal</span>
            </Badge>
          </div>

          <DialogTitle className="text-2xl font-extrabold text-[#1E3A8A] mt-2">
            {mode === 'login' ? 'Sign In to Your Account' : 'Create a Customer Account'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {mode === 'login'
              ? 'Enter your credentials to access your personalized event dashboard.'
              : 'Register to submit inquiries, track your quotations, and review event bookings.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 my-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-[#1E3A8A] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {mode === 'signup' && (
            <>
              <div className="space-y-1">
                <Label>Full Name</Label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-8 text-xs"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Mobile Number</Label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="0917-xxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-8 text-xs"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Email Address</Label>
            <div className="relative">
              <Input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 text-xs"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              {mode === 'login' && (
                <Link
                  href="/forgot-password"
                  onClick={onClose}
                  className="text-[11px] text-[#1E3A8A] hover:underline font-medium focus:outline-none"
                >
                  Forgot Password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-8 text-xs"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-8 text-xs"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          )}

          <div className="pt-3">
            <Button
              type="submit"
              disabled={isLoading}
              variant="default"
              size="pill"
              className="w-full font-bold shadow-md"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Create Customer Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-medium">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="pill"
            className="w-full font-bold shadow-sm flex items-center justify-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => window.location.href = '/api/auth/google'}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Continue with Google
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
