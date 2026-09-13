"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ManageProfile } from '@/components/jad/customer/ManageProfile';
import { Toaster } from '@/components/ui/sonner';

export default function CustomerProfilePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Toaster position="top-right" richColors />
      <ManageProfile
        onBackToDashboard={() => router.push('/customer')}
        onNavigateHome={() => router.push('/homepage')}
      />
    </div>
  );
}
