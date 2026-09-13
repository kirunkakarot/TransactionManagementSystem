"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/jad/public/Navbar';
import { Hero } from '@/components/jad/public/Hero';
import { ServicesSection } from '@/components/jad/public/ServicesSection';
import { PackagesSection } from '@/components/jad/public/PackagesSection';
import { AvailabilitySection } from '@/components/jad/public/AvailabilitySection';
import { CallToAction } from '@/components/jad/public/CallToAction';
import { Footer } from '@/components/jad/public/Footer';

import { InquiryModal } from '@/components/jad/public/InquiryModal';
import { ServiceDetailModal } from '@/components/jad/public/ServiceDetailModal';
import { AuthModal } from '@/components/jad/public/AuthModal';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { 
  ServiceItem, 
  PackageItem, 
  InquiryFormData, 
} from '@/components/jad/types';

import Cookies from 'js-cookie';
import { fetchServices, fetchPackages } from '@/services/api';

export default function Homepage() {
  const router = useRouter();
  
  const [activeSection, setActiveSection] = useState('hero');

  // Authenticated User Session State
  const [currentUser, setCurrentUser] = useState<{ role: 'client' | 'admin'; email: string } | null>(null);

  // Centralized Dynamic Services & Packages State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    // Restore session
    const savedUser = localStorage.getItem('jad_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser({
          role: parsed.role === 'Administrator' ? 'admin' : 'client',
          email: parsed.email,
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Check query params to auto-open login or signup modal
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get('auth');
      if (authParam === 'login' || authParam === 'signup') {
        setAuthMode(authParam);
        setIsAuthModalOpen(true);
      }
    }

    // Fetch dynamic services and packages from backend
    async function loadData() {
      try {
        const [servicesRes, packagesRes] = await Promise.all([
          fetchServices('', 100),
          fetchPackages('', 100),
        ]);
        if (servicesRes.services && servicesRes.services.length > 0) {
          const mappedServices: ServiceItem[] = servicesRes.services.map((s: any) => ({
            id: s.id.toString(),
            name: s.name,
            category: s.category || 'Stage & Performance',
            shortDesc: s.shortDesc || s.description || 'Professional event service and execution.',
            fullDesc: s.fullDesc || s.description || s.shortDesc || 'Comprehensive operational setup and experienced specialists.',
            description: s.shortDesc || s.fullDesc || s.description || '',
            iconName: s.iconName || 'Sparkles',
            startingPrice: Number(s.price) || 0,
            featuredImage: s.featuredImage || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
            duration: 'Flexible',
            rating: 4.9,
            reviewCount: 24,
            features: Array.isArray(s.features) && s.features.length > 0 ? s.features : ['Professional Coordination', 'Equipment Support', 'Dedicated Event Crew'],
            inclusions: Array.isArray(s.inclusions) && s.inclusions.length > 0 ? s.inclusions : ['Dedicated Team', 'Quality Setup', 'Coordination Support'],
            tag: 'Verified',
            isActive: s.isActive !== false,
          }));
          setServices(mappedServices);
        }
        if (packagesRes.packages && packagesRes.packages.length > 0) {
          const mappedPackages: PackageItem[] = packagesRes.packages.map((p: any) => ({
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
          }));
          setPackages(mappedPackages);
        }
      } catch (err) {
        console.warn('Backend loadData fallback:', err);
      }
    }
    loadData();

    // Auto-refresh when user/admin returns to homepage tab
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Modal States
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [selectedPackageForInquiry, setSelectedPackageForInquiry] = useState<PackageItem | null>(null);
  const [selectedServiceIdForInquiry, setSelectedServiceIdForInquiry] = useState<string | undefined>(undefined);
  const [inquiryDate, setInquiryDate] = useState<string | undefined>(undefined);
  const [inquiryEventType, setInquiryEventType] = useState<string | undefined>(undefined);
  const [inquiryVenue, setInquiryVenue] = useState<string | undefined>(undefined);

  // Service Detail Modal State
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<ServiceItem | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLoginSuccess = (role: 'client' | 'admin', email: string) => {
    setCurrentUser({ role, email });
    setIsAuthModalOpen(false);
    if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/customer');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('jad_token');
    localStorage.removeItem('jad_user');
    Cookies.remove('token', { path: '/' });
    Cookies.remove('jad_token', { path: '/' });
    setCurrentUser(null);
    toast.info('You have been signed out.');
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenInquiryFromHero = () => {
    setSelectedPackageForInquiry(null);
    setSelectedServiceIdForInquiry(undefined);
    setIsInquiryModalOpen(true);
  };

  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackageForInquiry(pkg);
    setSelectedServiceIdForInquiry(undefined);
    setIsInquiryModalOpen(true);
  };

  const handleSelectServiceDetail = (service: ServiceItem) => {
    setSelectedServiceDetail(service);
  };

  const handleInquireService = (serviceId: string) => {
    setSelectedServiceIdForInquiry(serviceId);
    setSelectedPackageForInquiry(null);
    setIsInquiryModalOpen(true);
  };

  const handleDirectInquireWithDate = (date: string, eventType: string, venue: string, _guests: string) => {
    setInquiryDate(date);
    setInquiryEventType(eventType);
    setInquiryVenue(venue);
    setIsInquiryModalOpen(true);
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleInquirySubmitted = (newInquiry: InquiryFormData) => {
    toast.success('Inquiry Submitted!', {
      description: 'We will review your inquiry and get back to you shortly.',
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 relative selection:bg-orange-500/20 selection:text-orange-900">
      <Toaster position="top-right" richColors />

      <Navbar
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onOpenInquiryModal={handleOpenInquiryFromHero}
        onOpenAuthModal={handleOpenAuth}
        currentUser={currentUser}
        onOpenDashboard={() => {
          if (currentUser?.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/customer');
          }
        }}
        onLogout={handleLogout}
      />

      <main>
        <Hero
          onExploreServices={() => scrollToSection('services')}
          onSubmitInquiry={handleOpenInquiryFromHero}
          onCheckAvailability={() => scrollToSection('availability')}
        />

        <ServicesSection
          services={services}
          onSelectService={handleSelectServiceDetail}
          onInquireService={handleInquireService}
        />

        <PackagesSection
          packages={packages}
          onSelectPackage={handleSelectPackage}
        />

        <AvailabilitySection
          onDirectInquireWithDate={handleDirectInquireWithDate}
        />

        <CallToAction
          onSubmitInquiry={handleOpenInquiryFromHero}
          onOpenSignUp={() => handleOpenAuth('signup')}
        />
      </main>

      <Footer
        onNavigate={scrollToSection}
        onOpenInquiryModal={handleOpenInquiryFromHero}
      />

      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        initialPackage={selectedPackageForInquiry}
        initialDate={inquiryDate}
        initialEventType={inquiryEventType}
        initialVenue={inquiryVenue}
        initialServiceId={selectedServiceIdForInquiry}
        currentUser={currentUser}
        services={services}
        packages={packages}
        onRequireAuth={() => {
          setIsInquiryModalOpen(false);
          handleOpenAuth('login');
        }}
        onInquirySubmitted={handleInquirySubmitted}
      />

      <ServiceDetailModal
        service={selectedServiceDetail}
        onClose={() => setSelectedServiceDetail(null)}
        onInquire={handleInquireService}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
