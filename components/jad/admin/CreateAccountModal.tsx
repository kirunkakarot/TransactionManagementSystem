"use client";

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Building2, 
  UserCheck,
  AlertCircle
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
import { createPrivilegedUserApi } from '@/services/api';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Staff' | 'Administrator'>('Staff');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('Staff');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || name.trim().length < 2) {
      toast.error('Full name is required (minimum 2 characters).');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Temporary password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await createPrivilegedUserApi(
        {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          role,
          phone: phone ? phone.trim() : undefined,
        },
        token
      );

      toast.success(res.message || `Account for "${name}" created successfully.`);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating privileged account:', err);
      toast.error('Failed to create account', {
        description: err.message || 'Server error occurred while creating privileged account.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 sm:p-7">
        <DialogHeader className="text-left">
          <div className="flex items-center justify-between">
            <Badge variant="blue" className="gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Security Portal</span>
            </Badge>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-extrabold text-[#1E3A8A] mt-2">
            Create Privileged Account
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Provision official staff or administrative access credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Select Privileged Role</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('Staff')}
                className={`flex flex-col items-start p-3 rounded-md border text-left cursor-pointer transition-all ${
                  role === 'Staff'
                    ? 'bg-blue-50/80 border-[#1E3A8A] text-[#1E3A8A] shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Operations Staff</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Crew, coordinators & stage personnel</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Administrator')}
                className={`flex flex-col items-start p-3 rounded-md border text-left cursor-pointer transition-all ${
                  role === 'Administrator'
                    ? 'bg-orange-50/80 border-orange-500 text-orange-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Building2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>Administrator</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Full command center & financial approval</span>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <Label className="text-xs">Full Name</Label>
            <div className="relative">
              <Input
                type="text"
                required
                placeholder="e.g. Roberto Gomez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-8 text-xs rounded-md h-9"
              />
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <Label className="text-xs">Corporate / Staff Email</Label>
            <div className="relative">
              <Input
                type="email"
                required
                placeholder="staff@jadevents.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 text-xs rounded-md h-9"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="space-y-1">
            <Label className="text-xs">Mobile Number</Label>
            <div className="relative">
              <Input
                type="tel"
                placeholder="0917-xxx-xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-8 text-xs rounded-md h-9"
              />
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Temporary Password & Confirm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Temporary Password</Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8 text-xs rounded-md h-9"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Confirm Password</Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-8 text-xs rounded-md h-9"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Privileged credentials grant operational portal access. Ensure email accuracy before provisioning.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-md text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="brand"
              size="sm"
              className="rounded-md text-xs font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
            >
              {isLoading ? 'Creating Account...' : `Create ${role} Account`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
