"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  EventType
} from '@/components/jad/types';

import Cookies from 'js-cookie';
import { fetchServices, fetchPackages, fetchEventTypes } from '@/services/api';

const SECTION_IDS = ['hero', 'services', 'packages', 'availability', 'contact'] as const;

export default function Homepage() {
  const router = useRouter();
  
  const [activeSection, setActiveSection] = useState('hero');
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Authenticated User Session State
  const [currentUser, setCurrentUser] = useState<{ role: 'client' | 'admin'; email: string } | null>(null);

  // Centralized Dynamic Services & Packages State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  // Modal States
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [selectedPackageForInquiry, setSelectedPackageForInquiry] = useState<PackageItem | null>(null);
  const [selectedServiceIdForInquiry, setSelectedServiceIdForInquiry] = useState<string | undefined>(undefined);
  const [inquiryDate, setInquiryDate] = useState<string | undefined>(undefined);
  const [inquiryStartTime, setInquiryStartTime] = useState<string | undefined>(undefined);
  const [inquiryEndTime, setInquiryEndTime] = useState<string | undefined>(undefined);
  const [inquiryEventType, setInquiryEventType] = useState<string | undefined>(undefined);
  const [inquiryVenue, setInquiryVenue] = useState<string | undefined>(undefined);
  const [inquiryGuestCount, setInquiryGuestCount] = useState<number | undefined>(undefined);

  // Service Detail Modal State
  const [selectedServiceDetail, setSelectedServiceDetail] = useState<ServiceItem | null>(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

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
      const errorParam = params.get('error');

      if (authParam === 'login' || authParam === 'signup') {
        setAuthMode(authParam);
        setIsAuthModalOpen(true);
      }

      if (errorParam) {
        setTimeout(() => {
          toast.error('Unable to sign in with Google', {
            description: 'Google sign-in could not be completed. Please try again or sign in with your email and password.',
          });
        }, 100);
        
        // Remove error from URL without reloading
        const newUrl = window.location.pathname + (authParam ? `?auth=${authParam}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }

    // Fetch dynamic services and packages from backend
    async function loadData() {
      try {
        const [servicesRes, packagesRes, eventTypesRes] = await Promise.all([
          fetchServices('', 100),
          fetchPackages('', 100),
          fetchEventTypes('', 100)
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
            eventTypes: Array.isArray(s.eventTypes) ? s.eventTypes : [],
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
            eventTypes: Array.isArray(p.eventTypes) ? p.eventTypes : [],
          }));
          setPackages(mappedPackages);
        }
        if (eventTypesRes?.eventTypes && eventTypesRes.eventTypes.length > 0) {
          setEventTypes(eventTypesRes.eventTypes.filter((et: any) => et.isActive !== false));
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

  // Scroll-Spy Navigation: track active section smoothly without flickering
  useEffect(() => {
    let rafId: number | null = null;

    const updateActiveSectionFromScroll = () => {
      rafId = null;
      if (isProgrammaticScrollRef.current) return;

      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Near top of page -> hero
      if (scrollY < 100) {
        setActiveSection((prev) => (prev === 'hero' ? prev : 'hero'));
        return;
      }

      // Near bottom of page -> contact (footer)
      if (scrollY + viewportHeight >= docHeight - 64) {
        setActiveSection((prev) => (prev === 'contact' ? prev : 'contact'));
        return;
      }

      // Anchor line ~150px below top of viewport (accounting for fixed navbar)
      const spyTriggerLine = 150;
      let currentCandidate = 'hero';

      for (const sectionId of SECTION_IDS) {
        const el = document.getElementById(sectionId);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= spyTriggerLine) {
          currentCandidate = sectionId;
        }
      }

      setActiveSection((prev) => (prev === currentCandidate ? prev : currentCandidate));
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateActiveSectionFromScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveSectionFromScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenDashboard = useCallback(() => {
    if (currentUser?.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/customer');
    }
  }, [currentUser, router]);

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
      isProgrammaticScrollRef.current = true;
      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      element.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });

      programmaticScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, prefersReducedMotion ? 50 : 650);
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

  const handleInquireService = (serviceId: string, eventTypeName?: string) => {
    setSelectedServiceIdForInquiry(serviceId);
    setSelectedPackageForInquiry(null);
    if (eventTypeName) {
      setInquiryEventType(eventTypeName);
    }
    setIsInquiryModalOpen(true);
  };

  const handleDirectInquireWithDate = (
    date: string,
    eventType: string,
    venue: string,
    guests: string,
    startTime?: string,
    endTime?: string
  ) => {
    setInquiryDate(date);
    setInquiryEventType(eventType);
    setInquiryVenue(venue);
    if (startTime) setInquiryStartTime(startTime);
    if (endTime) setInquiryEndTime(endTime);
    const parsedGuests = parseInt(guests, 10);
    if (!isNaN(parsedGuests) && parsedGuests > 0) {
      setInquiryGuestCount(parsedGuests);
    }
    setIsInquiryModalOpen(true);
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleInquirySubmitted = (_newInquiry: InquiryFormData) => {
    // Notification is handled directly by InquiryModal upon submission
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
        onOpenDashboard={handleOpenDashboard}
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
          eventTypes={eventTypes}
          onSelectService={handleSelectServiceDetail}
          onInquireService={handleInquireService}
        />

        <PackagesSection
          packages={packages}
          eventTypes={eventTypes}
          onSelectPackage={handleSelectPackage}
        />

        <AvailabilitySection
          eventTypes={eventTypes}
          onDirectInquireWithDate={handleDirectInquireWithDate}
        />

        <CallToAction
          currentUser={currentUser}
          onSubmitInquiry={handleOpenInquiryFromHero}
          onOpenSignUp={() => handleOpenAuth('signup')}
          onOpenDashboard={handleOpenDashboard}
          onCheckAvailability={() => scrollToSection('availability')}
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
        initialStartTime={inquiryStartTime}
        initialEndTime={inquiryEndTime}
        initialEventType={inquiryEventType}
        initialVenue={inquiryVenue}
        initialGuestCount={inquiryGuestCount}
        initialServiceId={selectedServiceIdForInquiry}
        currentUser={currentUser}
        services={services}
        packages={packages}
        eventTypes={eventTypes}
        onRequireAuth={() => {
          setIsInquiryModalOpen(false);
          handleOpenAuth('login');
        }}
        onInquirySubmitted={handleInquirySubmitted}
      />

      <ServiceDetailModal
        service={selectedServiceDetail}
        eventTypes={eventTypes}
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
